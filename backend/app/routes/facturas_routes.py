from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from tortoise.expressions import F
from tortoise.transactions import atomic

from middlewares.jwt_helper import check_user, check_user_any
from models.cardex_log import CardexLog, TipoMovimiento
from models.proveedor import Articulos, DetalleDocumento, Proveedores
from models.recepcion_compra import (
    DetalleOrdenCompra,
    DetalleRecepcionCompra,
    EstadoOrdenCompra,
    EstadoRecepcion,
    FacturaOrdenCompra,
    OrdenCompra,
    RecepcionCompra,
)
from models.user import User
from schemas.roles import Roles

router = APIRouter()

ROLES_APROBACION = (Roles.finanzas, Roles.supervisor)
ROLES_LECTURA_ORDENES = (Roles.bodega, Roles.finanzas, Roles.supervisor)


class DetalleOrdenCompraSchema(BaseModel):
    articulo_id: int = Field(..., gt=0)
    cantidad_solicitada: int = Field(..., gt=0)
    precio_unitario: Decimal = Field(..., gt=0)


class OrdenCompraCreateSchema(BaseModel):
    numero_orden: str = Field(..., min_length=1, max_length=80)
    proveedor_id: int = Field(..., gt=0)
    detalles: list[DetalleOrdenCompraSchema] = Field(..., min_length=1)


class DetalleRecepcionSchema(BaseModel):
    detalle_orden_id: int = Field(..., gt=0)
    cantidad_guia: int = Field(..., ge=0)
    cantidad_recibida: int = Field(..., ge=0)


class RecepcionCreateSchema(BaseModel):
    orden_compra_id: int = Field(..., gt=0)
    numero_guia: str = Field(..., min_length=1, max_length=80)
    bultos_guia: int = Field(..., ge=0)
    bultos_recibidos: int = Field(..., ge=0)
    detalles: list[DetalleRecepcionSchema] = Field(..., min_length=1)
    observaciones: Optional[str] = None


def _redondear(monto: Decimal) -> Decimal:
    return monto.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


async def _usuario_actual(request: Request) -> User:
    usuario = await User.get_or_none(correo=request.state.usuario)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": True, "mensaje": "La cuenta autenticada ya no existe"},
        )
    return usuario


async def _cantidades_facturadas(orden_compra_id: int) -> dict[int, int]:
    factura_ids = await FacturaOrdenCompra.filter(
        orden_compra_id=orden_compra_id
    ).values_list("factura_id", flat=True)
    cantidades: dict[int, int] = {}
    if not factura_ids:
        return cantidades

    detalles = await DetalleDocumento.filter(
        documento_id__in=factura_ids
    ).values_list("articulo_id", "cantidad")
    for articulo_id, cantidad in detalles:
        cantidades[articulo_id] = cantidades.get(articulo_id, 0) + cantidad
    return cantidades


async def _serializar_orden(orden: OrdenCompra) -> dict:
    await orden.fetch_related("proveedor", "creado_por")
    detalles = await DetalleOrdenCompra.filter(
        orden_compra_id=orden.id
    ).select_related("articulo")
    facturadas = await _cantidades_facturadas(orden.id)
    recepcion_pendiente = await RecepcionCompra.filter(
        orden_compra_id=orden.id,
        estado=EstadoRecepcion.PENDIENTE_APROBACION,
    ).exists()

    return {
        "id": orden.id,
        "numero_orden": orden.numero_orden,
        "proveedor_id": orden.proveedor_id,
        "proveedor": orden.proveedor.razon_social,
        "estado": orden.estado.value,
        "recepcion_pendiente": recepcion_pendiente,
        "creado_por": orden.creado_por.nombre,
        "fecha_creacion": orden.fecha_creacion.isoformat(),
        "detalles": [
            {
                "id": detalle.id,
                "articulo_id": detalle.articulo_id,
                "sku": detalle.articulo.codigo_sku,
                "nombre": detalle.articulo.nombre,
                "cantidad_solicitada": detalle.cantidad_solicitada,
                "cantidad_recibida": detalle.cantidad_recibida,
                "saldo_pendiente": max(
                    0, detalle.cantidad_solicitada - detalle.cantidad_recibida
                ),
                "cantidad_facturada": facturadas.get(detalle.articulo_id, 0),
                "cantidad_por_facturar": max(
                    0,
                    detalle.cantidad_recibida
                    - facturadas.get(detalle.articulo_id, 0),
                ),
                "precio_unitario": str(detalle.precio_unitario),
            }
            for detalle in detalles
        ],
    }


async def _serializar_recepcion(recepcion: RecepcionCompra) -> dict:
    await recepcion.fetch_related(
        "orden_compra__proveedor",
        "usuario",
    )
    detalles = await DetalleRecepcionCompra.filter(
        recepcion_id=recepcion.id
    ).select_related("detalle_orden__articulo")

    return {
        "id": recepcion.id,
        "comprobante": f"REC-{recepcion.id:06d}",
        "orden_compra_id": recepcion.orden_compra_id,
        "numero_orden": recepcion.orden_compra.numero_orden,
        "proveedor": recepcion.orden_compra.proveedor.razon_social,
        "numero_guia": recepcion.numero_guia,
        "bultos_guia": recepcion.bultos_guia,
        "bultos_recibidos": recepcion.bultos_recibidos,
        "estado": recepcion.estado.value,
        "observaciones": recepcion.observaciones,
        "detalle_discrepancia": recepcion.detalle_discrepancia,
        "usuario": recepcion.usuario.nombre,
        "fecha": recepcion.fecha.isoformat(),
        "detalles": [
            {
                "sku": detalle.detalle_orden.articulo.codigo_sku,
                "articulo": detalle.detalle_orden.articulo.nombre,
                "cantidad_solicitada": detalle.detalle_orden.cantidad_solicitada,
                "cantidad_guia": detalle.cantidad_guia,
                "cantidad_recibida": detalle.cantidad_recibida,
            }
            for detalle in detalles
        ],
    }


@router.post(
    "/ordenes-compra",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(check_user_any(ROLES_APROBACION))],
)
@atomic()
async def crear_orden_compra(
    body: OrdenCompraCreateSchema,
    request: Request,
):
    numero_orden = body.numero_orden.strip()
    if not numero_orden:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El número de orden es obligatorio",
        )
    if len({detalle.articulo_id for detalle in body.detalles}) != len(body.detalles):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La orden no puede repetir artículos en líneas separadas",
        )
    if await OrdenCompra.exists(numero_orden=numero_orden):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"La Orden de Compra {numero_orden} ya existe",
        )

    proveedor = await Proveedores.get_or_none(id=body.proveedor_id, deleted=False)
    if not proveedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El proveedor no existe o está deshabilitado",
        )
    usuario = await _usuario_actual(request)

    articulos: dict[int, Articulos] = {}
    for detalle in body.detalles:
        articulo = await Articulos.get_or_none(id=detalle.articulo_id)
        if not articulo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"El artículo {detalle.articulo_id} no existe",
            )
        articulos[detalle.articulo_id] = articulo

    orden = await OrdenCompra.create(
        numero_orden=numero_orden,
        proveedor=proveedor,
        creado_por=usuario,
        estado=EstadoOrdenCompra.ABIERTA,
    )
    for detalle in body.detalles:
        await DetalleOrdenCompra.create(
            orden_compra=orden,
            articulo=articulos[detalle.articulo_id],
            cantidad_solicitada=detalle.cantidad_solicitada,
            precio_unitario=detalle.precio_unitario,
        )

    return {
        "error": False,
        "mensaje": "Orden de Compra creada",
        "data": await _serializar_orden(orden),
    }


@router.get(
    "/ordenes-compra",
    dependencies=[Depends(check_user_any(ROLES_LECTURA_ORDENES))],
)
async def listar_ordenes_compra():
    ordenes = await OrdenCompra.all().order_by("-fecha_creacion")
    return {
        "error": False,
        "mensaje": "Órdenes de Compra consultadas",
        "data": [await _serializar_orden(orden) for orden in ordenes],
    }


@router.get(
    "/ordenes-compra/{orden_compra_id}",
    dependencies=[Depends(check_user_any(ROLES_LECTURA_ORDENES))],
)
async def obtener_orden_compra(orden_compra_id: int):
    orden = await OrdenCompra.get_or_none(id=orden_compra_id)
    if not orden:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orden de Compra no encontrada",
        )
    return {
        "error": False,
        "mensaje": "Orden de Compra consultada",
        "data": await _serializar_orden(orden),
    }


async def _actualizar_existencias(
    recepcion: RecepcionCompra,
    usuario: User,
):
    lineas = await DetalleRecepcionCompra.filter(
        recepcion_id=recepcion.id
    ).select_related("detalle_orden__articulo")
    orden = await OrdenCompra.get(id=recepcion.orden_compra_id)

    for linea in lineas:
        cantidad = linea.cantidad_recibida
        if cantidad == 0:
            continue

        detalle_orden = linea.detalle_orden
        articulo = await Articulos.filter(
            id=detalle_orden.articulo_id
        ).select_for_update().first()
        if not articulo:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un artículo de la Orden de Compra ya no existe",
            )

        pmp_anterior = Decimal(str(articulo.precio_medio_ponderado))
        if articulo.stock_actual > 0 and pmp_anterior <= 0:
            pmp_anterior = Decimal(
                str(articulo.precio_lista or detalle_orden.precio_unitario)
            )
        nuevo_stock = articulo.stock_actual + cantidad
        nuevo_pmp = _redondear(
            (
                Decimal(articulo.stock_actual) * pmp_anterior
                + Decimal(cantidad) * detalle_orden.precio_unitario
            )
            / Decimal(nuevo_stock)
        )
        actualizado = await Articulos.filter(id=articulo.id).update(
            stock_actual=F("stock_actual") + cantidad,
            precio_medio_ponderado=nuevo_pmp,
        )
        if actualizado != 1:
            raise RuntimeError(
                f"No se pudo actualizar el stock del SKU {articulo.codigo_sku}"
            )

        detalle_orden.cantidad_recibida += cantidad
        await detalle_orden.save(update_fields=["cantidad_recibida"])

        articulo = await Articulos.get(id=articulo.id)
        await CardexLog.create(
            producto=articulo,
            usuario=usuario,
            tipo_movimiento=TipoMovimiento.ENTRADA_COMPRA,
            cantidad=cantidad,
            saldo_resultante=articulo.stock_actual,
            obra=None,
            motivo_justificacion=(
                f"Recepción de OC {orden.numero_orden}, guía {recepcion.numero_guia}"
            ),
            costo_unitario=detalle_orden.precio_unitario,
            saldo_valorizado=(
                Decimal(articulo.stock_actual)
                * Decimal(str(articulo.precio_medio_ponderado))
            ),
        )

    detalles_orden = await DetalleOrdenCompra.filter(orden_compra_id=orden.id)
    if all(
        detalle.cantidad_recibida >= detalle.cantidad_solicitada
        for detalle in detalles_orden
    ):
        orden.estado = EstadoOrdenCompra.COMPLETA
    elif any(detalle.cantidad_recibida > 0 for detalle in detalles_orden):
        orden.estado = EstadoOrdenCompra.PARCIAL
    else:
        orden.estado = EstadoOrdenCompra.ABIERTA
    await orden.save(update_fields=["estado"])

    recepcion.estado = EstadoRecepcion.APROBADA
    recepcion.aprobado_por_id = usuario.id
    recepcion.fecha_aprobacion = datetime.now(timezone.utc)
    await RecepcionCompra.filter(id=recepcion.id).update(
        estado=recepcion.estado,
        aprobado_por_id=recepcion.aprobado_por_id,
        fecha_aprobacion=recepcion.fecha_aprobacion,
    )


@router.post(
    "/recepcion",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(check_user(Roles.bodega))],
)
@atomic()
async def registrar_recepcion(
    body: RecepcionCreateSchema,
    request: Request,
):
    orden = await OrdenCompra.filter(
        id=body.orden_compra_id
    ).select_for_update().first()
    if not orden:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orden de Compra no encontrada",
        )
    if orden.estado == EstadoOrdenCompra.COMPLETA:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La Orden de Compra ya fue recibida completamente",
        )
    if await RecepcionCompra.filter(
        orden_compra_id=orden.id,
        estado=EstadoRecepcion.PENDIENTE_APROBACION,
    ).exists():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La Orden de Compra ya tiene una recepción pendiente de aprobación",
        )

    detalles_orden = await DetalleOrdenCompra.filter(
        orden_compra_id=orden.id
    ).select_related("articulo")
    orden_por_id = {detalle.id: detalle for detalle in detalles_orden}
    lineas_body = {detalle.detalle_orden_id: detalle for detalle in body.detalles}
    if len(lineas_body) != len(body.detalles):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No repita líneas de la Orden de Compra",
        )
    if not set(lineas_body).issubset(orden_por_id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La recepción contiene una línea ajena a la Orden de Compra",
        )
    if not any(detalle.cantidad_recibida > 0 for detalle in body.detalles):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Debe registrar al menos una unidad recibida",
        )

    discrepancias: list[str] = []
    if body.bultos_guia != body.bultos_recibidos:
        discrepancias.append(
            f"Bultos: guía indica {body.bultos_guia}, conteo físico "
            f"{body.bultos_recibidos}"
        )
    for detalle_orden in detalles_orden:
        linea = lineas_body.get(detalle_orden.id)
        cantidad_guia = linea.cantidad_guia if linea else 0
        cantidad_recibida = linea.cantidad_recibida if linea else 0
        pendiente = max(
            0,
            detalle_orden.cantidad_solicitada - detalle_orden.cantidad_recibida,
        )
        articulo = detalle_orden.articulo
        if cantidad_guia != cantidad_recibida:
            discrepancias.append(
                f"{articulo.codigo_sku or articulo.nombre}: guía indica "
                f"{cantidad_guia}, conteo físico {cantidad_recibida}"
            )
        if cantidad_recibida != pendiente:
            discrepancias.append(
                f"{articulo.codigo_sku or articulo.nombre}: OC pendiente "
                f"{pendiente}, recepción física {cantidad_recibida}"
            )

    observaciones = (body.observaciones or "").strip()
    if discrepancias and not observaciones:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Registre una observación para justificar la discrepancia",
        )

    numero_guia = body.numero_guia.strip()
    if not numero_guia:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El número de guía es obligatorio",
        )

    usuario = await _usuario_actual(request)
    recepcion = await RecepcionCompra.create(
        orden_compra=orden,
        numero_guia=numero_guia,
        usuario=usuario,
        bultos_guia=body.bultos_guia,
        bultos_recibidos=body.bultos_recibidos,
        estado=EstadoRecepcion.PENDIENTE_APROBACION,
        observaciones=observaciones or None,
        detalle_discrepancia="\n".join(discrepancias) if discrepancias else None,
    )
    for detalle_orden in detalles_orden:
        linea = lineas_body.get(detalle_orden.id)
        await DetalleRecepcionCompra.create(
            recepcion=recepcion,
            detalle_orden=detalle_orden,
            cantidad_guia=linea.cantidad_guia if linea else 0,
            cantidad_recibida=linea.cantidad_recibida if linea else 0,
        )

    if not discrepancias:
        await _actualizar_existencias(recepcion, usuario)

    return {
        "error": False,
        "mensaje": (
            "Recepción registrada y aprobada"
            if not discrepancias
            else "Recepción pendiente de aprobación por discrepancia"
        ),
        "data": await _serializar_recepcion(recepcion),
    }


@router.get(
    "/recepciones/pendientes",
    dependencies=[Depends(check_user_any(ROLES_APROBACION))],
)
async def listar_recepciones_pendientes():
    recepciones = await RecepcionCompra.filter(
        estado=EstadoRecepcion.PENDIENTE_APROBACION
    ).order_by("fecha")
    return {
        "error": False,
        "mensaje": "Recepciones pendientes consultadas",
        "data": [
            await _serializar_recepcion(recepcion)
            for recepcion in recepciones
        ],
    }


@router.post(
    "/recepciones/{recepcion_id}/aprobar",
    dependencies=[Depends(check_user_any(ROLES_APROBACION))],
)
@atomic()
async def aprobar_recepcion(recepcion_id: int, request: Request):
    recepcion = await RecepcionCompra.filter(
        id=recepcion_id
    ).select_for_update().first()
    if not recepcion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recepción no encontrada",
        )
    if recepcion.estado != EstadoRecepcion.PENDIENTE_APROBACION:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La recepción no está pendiente de aprobación",
        )
    usuario = await _usuario_actual(request)
    await _actualizar_existencias(recepcion, usuario)
    return {
        "error": False,
        "mensaje": "Recepción aprobada y existencias actualizadas",
        "data": await _serializar_recepcion(recepcion),
    }
