from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator, model_validator
from tortoise.transactions import atomic

from middlewares.jwt_helper import check_user_any
from models.cardex_log import CardexLog, TipoMovimiento
from models.conteo_inventario import (
    ConteoInventario,
    DetalleConteoInventario,
    EstadoConteo,
)
from models.proveedor import Articulos
from models.user import User
from schemas.roles import Roles

router = APIRouter(tags=["Conteo físico"])

ROLES_CREAR_CONTEO = (Roles.bodega,)
ROLES_LECTURA_CONTEOS = (Roles.bodega, Roles.supervisor)
ROLES_REVISION_CONTEOS = (Roles.supervisor,)


class DetalleConteoSchema(BaseModel):
    articulo_id: int = Field(..., gt=0)
    stock_sistema: int = Field(..., ge=0)
    cantidad_contada: int = Field(..., ge=0)


class ConteoCreateSchema(BaseModel):
    observaciones: Optional[str] = Field(None, max_length=1000)
    detalles: list[DetalleConteoSchema] = Field(..., min_length=1)

    @model_validator(mode="after")
    def validar_articulos_unicos(self) -> "ConteoCreateSchema":
        articulo_ids = [detalle.articulo_id for detalle in self.detalles]
        if len(articulo_ids) != len(set(articulo_ids)):
            raise ValueError("El conteo no puede repetir artículos")
        return self


class RechazoConteoSchema(BaseModel):
    motivo: str = Field(..., min_length=3, max_length=500)

    @field_validator("motivo")
    @classmethod
    def validar_motivo(cls, value: str) -> str:
        if len(value.strip()) < 3:
            raise ValueError("El motivo debe tener al menos 3 caracteres")
        return value.strip()


async def _usuario_actual(request: Request) -> User:
    usuario = await User.get_or_none(
        correo=request.state.usuario,
        enabled=True,
    )
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta autenticada ya no existe o está deshabilitada.",
        )
    return usuario


async def _serializar_conteo(conteo: ConteoInventario) -> dict:
    await conteo.fetch_related("creado_por", "resuelto_por")
    detalles = await DetalleConteoInventario.filter(
        conteo_id=conteo.id
    ).select_related("articulo").order_by("articulo__nombre", "id")
    return {
        "id": conteo.id,
        "codigo": f"CON-{conteo.id:06d}",
        "estado": conteo.estado.value,
        "creado_por": conteo.creado_por.nombre,
        "resuelto_por": conteo.resuelto_por.nombre if conteo.resuelto_por else None,
        "fecha": conteo.fecha.isoformat(),
        "fecha_revision": (
            conteo.fecha_revision.isoformat() if conteo.fecha_revision else None
        ),
        "observaciones": conteo.observaciones,
        "motivo_rechazo": conteo.motivo_rechazo,
        "detalles": [
            {
                "articulo_id": detalle.articulo_id,
                "sku": detalle.articulo.codigo_sku,
                "articulo": detalle.articulo.nombre,
                "stock_sistema": detalle.stock_sistema,
                "cantidad_contada": detalle.cantidad_contada,
                "diferencia": detalle.diferencia,
            }
            for detalle in detalles
        ],
    }


@router.get(
    "/catalogos",
    dependencies=[Depends(check_user_any(ROLES_LECTURA_CONTEOS))],
)
async def obtener_catalogo_conteo():
    articulos = await Articulos.all().order_by("nombre", "id").values(
        "id",
        "codigo_sku",
        "nombre",
        "stock_actual",
        "stock_minimo",
    )
    return {
        "error": False,
        "mensaje": "Catálogo para conteo físico consultado",
        "data": articulos,
    }


@router.get(
    "",
    dependencies=[Depends(check_user_any(ROLES_LECTURA_CONTEOS))],
)
async def listar_conteos():
    conteos = await ConteoInventario.all().order_by("-fecha", "-id")
    return {
        "error": False,
        "mensaje": "Conteos físicos consultados",
        "data": [await _serializar_conteo(conteo) for conteo in conteos],
    }


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(check_user_any(ROLES_CREAR_CONTEO))],
)
@atomic()
async def crear_conteo(body: ConteoCreateSchema, request: Request):
    usuario = await _usuario_actual(request)
    articulo_ids = [detalle.articulo_id for detalle in body.detalles]
    articulos: dict[int, Articulos] = {
        articulo.id: articulo
        for articulo in await Articulos.filter(id__in=articulo_ids)
        .select_for_update()
        .order_by("id")
    }
    if len(articulos) != len(articulo_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uno o más artículos ya no existen en el inventario.",
        )

    detalles_conteo: list[tuple[Articulos, int, int]] = []
    for detalle in body.detalles:
        articulo = articulos[detalle.articulo_id]
        if articulo.stock_actual != detalle.stock_sistema:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"El stock de '{articulo.nombre}' cambió desde que cargó el "
                    "catálogo. Actualice la página y vuelva a contar."
                ),
            )
        detalles_conteo.append(
            (articulo, detalle.cantidad_contada, articulo.stock_actual)
        )
    tiene_diferencias = any(
        cantidad_contada != stock_sistema
        for _, cantidad_contada, stock_sistema in detalles_conteo
    )
    conteo = await ConteoInventario.create(
        creado_por=usuario,
        estado=(
            EstadoConteo.PENDIENTE_APROBACION
            if tiene_diferencias
            else EstadoConteo.SIN_DIFERENCIAS
        ),
        observaciones=body.observaciones,
    )
    for articulo, cantidad_contada, stock_sistema in detalles_conteo:
        await DetalleConteoInventario.create(
            conteo=conteo,
            articulo=articulo,
            stock_sistema=stock_sistema,
            cantidad_contada=cantidad_contada,
            diferencia=cantidad_contada - stock_sistema,
        )

    return {
        "error": False,
        "mensaje": (
            "Conteo registrado y enviado a aprobación"
            if tiene_diferencias
            else "Conteo registrado sin diferencias"
        ),
        "data": await _serializar_conteo(conteo),
    }


@router.post(
    "/{conteo_id}/aprobar",
    dependencies=[Depends(check_user_any(ROLES_REVISION_CONTEOS))],
)
@atomic()
async def aprobar_conteo(conteo_id: int, request: Request):
    conteo = await ConteoInventario.get_or_none(id=conteo_id)
    if not conteo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conteo físico no encontrado.",
        )
    if conteo.estado != EstadoConteo.PENDIENTE_APROBACION:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El conteo ya no está pendiente de aprobación.",
        )

    usuario = await _usuario_actual(request)
    detalles = await DetalleConteoInventario.filter(
        conteo_id=conteo.id
    ).order_by("articulo_id", "id")
    articulos: dict[int, Articulos] = {}
    for detalle in detalles:
        articulo = await Articulos.filter(
            id=detalle.articulo_id
        ).select_for_update().first()
        if not articulo:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El artículo {detalle.articulo_id} ya no existe.",
            )
        if articulo.stock_actual != detalle.stock_sistema:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"El stock de '{articulo.nombre}' cambió desde el conteo "
                    f"({detalle.stock_sistema} a {articulo.stock_actual}). "
                    "Realice un nuevo conteo antes de ajustar."
                ),
            )
        articulos[detalle.articulo_id] = articulo

    for detalle in detalles:
        if detalle.diferencia == 0:
            continue
        articulo = articulos[detalle.articulo_id]
        articulo.stock_actual = detalle.cantidad_contada
        await articulo.save(update_fields=["stock_actual"])
        costo_unitario = Decimal(articulo.precio_medio_ponderado or 0)
        await CardexLog.create(
            producto=articulo,
            usuario=usuario,
            tipo_movimiento=TipoMovimiento.AJUSTE_INVENTARIO,
            cantidad=detalle.diferencia,
            saldo_resultante=detalle.cantidad_contada,
            obra=None,
            motivo_justificacion=(
                f"Ajuste por conteo {conteo.id} ({detalle.stock_sistema} "
                f"a {detalle.cantidad_contada})"
            ),
            costo_unitario=costo_unitario,
            saldo_valorizado=costo_unitario * detalle.cantidad_contada,
        )

    conteo.estado = EstadoConteo.APROBADO
    conteo.resuelto_por_id = usuario.id
    conteo.fecha_revision = datetime.now(timezone.utc)
    await ConteoInventario.filter(id=conteo.id).update(
        estado=conteo.estado,
        resuelto_por_id=conteo.resuelto_por_id,
        fecha_revision=conteo.fecha_revision,
    )
    return {
        "error": False,
        "mensaje": "Conteo aprobado; existencias y Cardex actualizados.",
        "data": await _serializar_conteo(conteo),
    }


@router.post(
    "/{conteo_id}/rechazar",
    dependencies=[Depends(check_user_any(ROLES_REVISION_CONTEOS))],
)
@atomic()
async def rechazar_conteo(
    conteo_id: int,
    body: RechazoConteoSchema,
    request: Request,
):
    conteo = await ConteoInventario.get_or_none(id=conteo_id)
    if not conteo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conteo físico no encontrado.",
        )
    if conteo.estado != EstadoConteo.PENDIENTE_APROBACION:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El conteo ya no está pendiente de aprobación.",
        )

    usuario = await _usuario_actual(request)
    conteo.estado = EstadoConteo.RECHAZADO
    conteo.resuelto_por_id = usuario.id
    conteo.fecha_revision = datetime.now(timezone.utc)
    conteo.motivo_rechazo = body.motivo
    await ConteoInventario.filter(id=conteo.id).update(
        estado=conteo.estado,
        resuelto_por_id=conteo.resuelto_por_id,
        fecha_revision=conteo.fecha_revision,
        motivo_rechazo=conteo.motivo_rechazo,
    )
    return {
        "error": False,
        "mensaje": "Conteo rechazado; las existencias no fueron modificadas.",
        "data": await _serializar_conteo(conteo),
    }
