from datetime import date, datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from tortoise.expressions import Q

from middlewares.jwt_helper import check_user, check_user_any
from models.cardex_log import CardexLog, TipoMovimiento
from models.obra import Obra
from models.proveedor import Articulos
from schemas.roles import Roles
from services.cardex_summary_service import (
    obtener_resumen_cardex,
    rango_fecha_local,
)
from services.cardex_report_service import (
    generar_reporte_excel,
    generar_reporte_pdf,
)

router = APIRouter(tags=["Cardex"])
ROLES_LECTURA_CARDEX = (Roles.bodega, Roles.supervisor)


def _filtrar_movimientos(
    desde: Optional[date],
    hasta: Optional[date],
    producto_id: Optional[int],
    obra_id: Optional[int],
    tipo_movimiento: Optional[TipoMovimiento],
    buscar: Optional[str] = None,
):
    if desde is not None and hasta is not None and desde > hasta:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'desde' no puede ser posterior a 'hasta'.",
        )

    movimientos = CardexLog.all().select_related("producto", "usuario", "obra")
    if desde is not None:
        inicio, _ = rango_fecha_local(desde)
        movimientos = movimientos.filter(fecha_hora__gte=inicio)
    if hasta is not None:
        _, fin = rango_fecha_local(hasta)
        movimientos = movimientos.filter(fecha_hora__lt=fin)
    if producto_id is not None:
        movimientos = movimientos.filter(producto_id=producto_id)
    if obra_id is not None:
        movimientos = movimientos.filter(obra_id=obra_id)
    if tipo_movimiento is not None:
        movimientos = movimientos.filter(tipo_movimiento=tipo_movimiento)
    termino = (buscar or "").strip()
    if termino:
        movimientos = movimientos.filter(
            Q(producto__nombre__icontains=termino)
            | Q(producto__codigo_sku__icontains=termino)
            | Q(usuario__nombre__icontains=termino)
            | Q(motivo_justificacion__icontains=termino)
            | Q(obra__codigo_obra__icontains=termino)
            | Q(obra__nombre_obra__icontains=termino)
        )
    return movimientos


def _filtros_reporte(
    desde: Optional[date],
    hasta: Optional[date],
    producto_id: Optional[int],
    obra_id: Optional[int],
    tipo_movimiento: Optional[TipoMovimiento],
) -> dict[str, str]:
    return {
        "Desde": desde.isoformat() if desde else "Sin límite",
        "Hasta": hasta.isoformat() if hasta else "Sin límite",
        "Producto": str(producto_id) if producto_id is not None else "Todos",
        "Obra": str(obra_id) if obra_id is not None else "Todas",
        "Tipo de movimiento": (
            tipo_movimiento.value if tipo_movimiento is not None else "Todos"
        ),
    }


@router.get(
    "/filtros",
    dependencies=[Depends(check_user_any(ROLES_LECTURA_CARDEX))],
)
async def get_cardex_filtros():
    productos = await Articulos.all().order_by("nombre", "id").values(
        "id", "nombre", "codigo_sku"
    )
    obras = await Obra.all().order_by("nombre_obra", "id").values(
        "id", "codigo_obra", "nombre_obra"
    )
    return {
        "error": False,
        "mensaje": "Filtros de Kardex retornados correctamente",
        "data": {
            "productos": productos,
            "obras": obras,
            "tipos_movimiento": [tipo.value for tipo in TipoMovimiento],
        },
    }


@router.get(
    "/resumen",
    dependencies=[Depends(check_user_any(ROLES_LECTURA_CARDEX))],
)
async def get_cardex_resumen():
    return {
        "error": False,
        "mensaje": "Resumen de movimientos consultado correctamente",
        "data": await obtener_resumen_cardex(),
    }


@router.get(
    "",
    dependencies=[Depends(check_user_any(ROLES_LECTURA_CARDEX))],
)
async def get_cardex(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    producto_id: Optional[int] = Query(None, gt=0),
    obra_id: Optional[int] = Query(None, gt=0),
    tipo_movimiento: Optional[TipoMovimiento] = None,
    buscar: Optional[str] = Query(None, max_length=100),
    pagina: int = Query(1, ge=1),
    cantidad: int = Query(20, ge=1, le=100),
):
    movimientos = _filtrar_movimientos(
        desde, hasta, producto_id, obra_id, tipo_movimiento, buscar
    )
    total = await movimientos.count()
    resultados = await movimientos.order_by("-fecha_hora", "-id").offset(
        (pagina - 1) * cantidad
    ).limit(cantidad)

    data = []
    for movimiento in resultados:
        obra = None
        if movimiento.obra_id is not None:
            obra = {
                "id": movimiento.obra_id,
                "codigo_obra": movimiento.obra.codigo_obra,
                "nombre_obra": movimiento.obra.nombre_obra,
            }

        data.append(
            {
                "id": movimiento.id,
                "fecha_hora": movimiento.fecha_hora,
                "producto": {
                    "id": movimiento.producto_id,
                    "nombre": movimiento.producto.nombre,
                    "codigo_sku": movimiento.producto.codigo_sku,
                },
                "usuario": {
                    "id": movimiento.usuario_id,
                    "nombre": movimiento.usuario.nombre,
                },
                "tipo_movimiento": movimiento.tipo_movimiento.value,
                "cantidad": movimiento.cantidad,
                "saldo_resultante": movimiento.saldo_resultante,
                "obra": obra,
                "motivo_justificacion": movimiento.motivo_justificacion,
                "costo_unitario": movimiento.costo_unitario,
                "saldo_valorizado": movimiento.saldo_valorizado,
            }
        )

    return {
        "error": False,
        "mensaje": "Movimientos de Kardex retornados correctamente",
        "data": data,
        "paginacion": {
            "pagina": pagina,
            "cantidad": cantidad,
            "total": total,
            "total_paginas": (total + cantidad - 1) // cantidad,
        },
    }


@router.get(
    "/exportar",
    dependencies=[Depends(check_user(Roles.supervisor))],
)
async def exportar_cardex(
    formato: Literal["pdf", "excel"],
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    producto_id: Optional[int] = Query(None, gt=0),
    obra_id: Optional[int] = Query(None, gt=0),
    tipo_movimiento: Optional[TipoMovimiento] = None,
):
    movimientos = await _filtrar_movimientos(
        desde, hasta, producto_id, obra_id, tipo_movimiento
    ).order_by("-fecha_hora", "-id")
    filtros = _filtros_reporte(
        desde, hasta, producto_id, obra_id, tipo_movimiento
    )

    if formato == "pdf":
        contenido = generar_reporte_pdf(movimientos, filtros)
        extension = "pdf"
        media_type = "application/pdf"
    else:
        contenido = generar_reporte_excel(movimientos, filtros)
        extension = "xlsx"
        media_type = (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    generado = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"reporte_auditoria_cardex_{generado}.{extension}"
    return Response(
        content=contenido,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
