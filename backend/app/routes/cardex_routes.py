from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from middlewares.jwt_helper import check_user
from models.cardex_log import CardexLog, TipoMovimiento
from schemas.roles import Roles

router = APIRouter(tags=["Cardex"])


@router.get("", dependencies=[Depends(check_user(Roles.admin))])
async def get_cardex(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    producto_id: Optional[int] = Query(None, gt=0),
    obra_id: Optional[int] = Query(None, gt=0),
    tipo_movimiento: Optional[TipoMovimiento] = None,
    pagina: int = Query(1, ge=1),
    cantidad: int = Query(20, ge=1, le=100),
):
    if desde is not None and hasta is not None and desde > hasta:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'desde' no puede ser posterior a 'hasta'.",
        )

    movimientos = CardexLog.all().select_related("producto", "usuario", "obra")
    if desde is not None:
        movimientos = movimientos.filter(
            fecha_hora__gte=datetime.combine(desde, time.min, tzinfo=timezone.utc)
        )
    if hasta is not None:
        movimientos = movimientos.filter(
            fecha_hora__lt=datetime.combine(
                hasta + timedelta(days=1), time.min, tzinfo=timezone.utc
            )
        )
    if producto_id is not None:
        movimientos = movimientos.filter(producto_id=producto_id)
    if obra_id is not None:
        movimientos = movimientos.filter(obra_id=obra_id)
    if tipo_movimiento is not None:
        movimientos = movimientos.filter(tipo_movimiento=tipo_movimiento)

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
