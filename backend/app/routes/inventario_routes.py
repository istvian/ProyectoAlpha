from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query, Response
from tortoise.expressions import F, Q

from middlewares.jwt_helper import check_user
from models.proveedor import Articulos
from schemas.roles import Roles
from services.inventario_report_service import (
    generar_reporte_excel_inventario,
    generar_reporte_pdf_inventario,
)

router = APIRouter(tags=["Inventario"])

EstadoInventario = Literal["SIN_STOCK", "BAJO_STOCK", "DISPONIBLE"]


def _estado_articulo(stock_actual: int, stock_minimo: int) -> str:
    if stock_actual <= 0:
        return "SIN_STOCK"
    if stock_actual <= stock_minimo:
        return "BAJO_STOCK"
    return "DISPONIBLE"


def _categoria_articulo(articulo: Articulos) -> Optional[str]:
    specs = articulo.especificaciones_tecnicas or {}
    if isinstance(specs, dict):
        valor = specs.get("categoria")
        return str(valor) if valor not in (None, "") else None
    return None


def _filtrar_inventario(
    codigo_nombre: Optional[str],
    categoria: Optional[str],
    estado: Optional[EstadoInventario],
):
    articulos = Articulos.all()

    termino = (codigo_nombre or "").strip()
    if termino:
        articulos = articulos.filter(
            Q(codigo_sku__icontains=termino) | Q(nombre__icontains=termino)
        )

    categoria_termino = (categoria or "").strip()
    if categoria_termino:
        articulos = articulos.filter(
            especificaciones_tecnicas__contains={"categoria": categoria_termino}
        )

    if estado == "SIN_STOCK":
        articulos = articulos.filter(stock_actual__lte=0)
    elif estado == "BAJO_STOCK":
        articulos = articulos.filter(
            stock_actual__gt=0, stock_actual__lte=F("stock_minimo")
        )
    elif estado == "DISPONIBLE":
        articulos = articulos.filter(stock_actual__gt=F("stock_minimo"))

    return articulos


def _filtros_reporte_inventario(
    codigo_nombre: Optional[str],
    categoria: Optional[str],
    estado: Optional[EstadoInventario],
) -> dict[str, str]:
    return {
        "Código/Nombre": (codigo_nombre or "").strip() or "Todos",
        "Categoría": (categoria or "").strip() or "Todas",
        "Estado": estado or "Todos",
    }


def _serializar_articulo(articulo: Articulos) -> dict:
    return {
        "id": articulo.id,
        "codigo_sku": articulo.codigo_sku,
        "nombre": articulo.nombre,
        "descripcion": articulo.descripcion,
        "categoria": _categoria_articulo(articulo),
        "estado": _estado_articulo(articulo.stock_actual, articulo.stock_minimo),
        "stock_actual": articulo.stock_actual,
        "stock_minimo": articulo.stock_minimo,
        "precio_lista": articulo.precio_lista,
        "precio_medio_ponderado": articulo.precio_medio_ponderado,
    }


@router.get(
    "/filtros",
    dependencies=[Depends(check_user(Roles.cualquiera))],
)
async def get_inventario_filtros():
    articulos = await Articulos.all().values("especificaciones_tecnicas")
    categorias = sorted(
        {
            str((a["especificaciones_tecnicas"] or {}).get("categoria")).strip()
            for a in articulos
            if isinstance(a.get("especificaciones_tecnicas"), dict)
            and (a["especificaciones_tecnicas"] or {}).get("categoria")
            not in (None, "")
        }
    )
    return {
        "error": False,
        "mensaje": "Filtros de inventario retornados correctamente",
        "data": {
            "categorias": categorias,
            "estados": ["SIN_STOCK", "BAJO_STOCK", "DISPONIBLE"],
        },
    }


@router.get(
    "",
    dependencies=[Depends(check_user(Roles.cualquiera))],
)
async def get_inventario(
    codigo_nombre: Optional[str] = Query(None, max_length=100),
    categoria: Optional[str] = Query(None, max_length=100),
    estado: Optional[EstadoInventario] = None,
    pagina: int = Query(1, ge=1),
    cantidad: int = Query(20, ge=1, le=100),
):
    articulos = _filtrar_inventario(codigo_nombre, categoria, estado)
    total = await articulos.count()
    resultados = (
        await articulos.order_by("nombre", "id")
        .offset((pagina - 1) * cantidad)
        .limit(cantidad)
    )

    return {
        "error": False,
        "mensaje": "Inventario retornado correctamente",
        "data": [_serializar_articulo(a) for a in resultados],
        "paginacion": {
            "pagina": pagina,
            "cantidad": cantidad,
            "total": total,
            "total_paginas": (total + cantidad - 1) // cantidad,
        },
    }


@router.get(
    "/exportar",
    dependencies=[Depends(check_user(Roles.cualquiera))],
)
async def exportar_inventario(
    formato: Literal["pdf", "excel"],
    codigo_nombre: Optional[str] = Query(None, max_length=100),
    categoria: Optional[str] = Query(None, max_length=100),
    estado: Optional[EstadoInventario] = None,
):
    articulos = await _filtrar_inventario(
        codigo_nombre, categoria, estado
    ).order_by("nombre", "id")
    filtros = _filtros_reporte_inventario(codigo_nombre, categoria, estado)

    if formato == "pdf":
        contenido = generar_reporte_pdf_inventario(articulos, filtros)
        extension = "pdf"
        media_type = "application/pdf"
    else:
        contenido = generar_reporte_excel_inventario(articulos, filtros)
        extension = "xlsx"
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    generado = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"reporte_inventario_{generado}.{extension}"
    return Response(
        content=contenido,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
