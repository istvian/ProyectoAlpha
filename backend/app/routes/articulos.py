from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel
from tortoise.exceptions import IntegrityError

from db import db
from middlewares.jwt_helper import check_user
from models.proveedor import Articulos
from schemas.roles import Roles

router = APIRouter()


class ArticuloBaseModel(BaseModel):
    id: int | None = None
    codigo_sku: str | None = None
    nombre: str
    descripcion: str | None = None
    categoria: str | None = None
    ubicacion: str | None = None
    stock_actual: int = 0
    stock_minimo: int = 0
    precio_lista: float | None = None


class ArticuloDeleteBaseModel(BaseModel):
    id: int


def _serializar_articulo(articulo: Articulos) -> dict[str, Any]:
    specs = articulo.especificaciones_tecnicas or {}
    if not isinstance(specs, dict):
        specs = {}
    return {
        "id": articulo.id,
        "codigo_sku": articulo.codigo_sku,
        "nombre": articulo.nombre,
        "descripcion": articulo.descripcion,
        "categoria": specs.get("categoria"),
        "ubicacion": specs.get("ubicacion"),
        "stock_actual": articulo.stock_actual,
        "stock_minimo": articulo.stock_minimo,
        "precio_lista": (
            float(articulo.precio_lista)
            if articulo.precio_lista is not None
            else None
        ),
        "precio_medio_ponderado": float(articulo.precio_medio_ponderado or 0),
        "especificaciones_tecnicas": specs,
        "ultimos_costos_compra": articulo.ultimos_costos_compra or [],
    }


@router.get("", dependencies=[Depends(check_user(Roles.finanzas))])
async def get_articulos(request: Request, response: Response):
    try:
        articulos = await Articulos.all().order_by("nombre", "id")
        data = [_serializar_articulo(articulo) for articulo in articulos]
        return {"error": False, "mensaje": "Lectura completa", "data": data}

    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


@router.post("", dependencies=[Depends(check_user(Roles.finanzas))])
async def insert_articulo(
    body: ArticuloBaseModel, request: Request, response: Response
):
    try:
        specs: dict[str, Any] = {}
        if body.categoria:
            specs["categoria"] = body.categoria
        if body.ubicacion:
            specs["ubicacion"] = body.ubicacion

        creado = await Articulos.create(
            codigo_sku=body.codigo_sku or None,
            nombre=body.nombre,
            descripcion=body.descripcion,
            stock_actual=body.stock_actual,
            stock_minimo=body.stock_minimo,
            precio_lista=(
                Decimal(str(body.precio_lista))
                if body.precio_lista is not None
                else None
            ),
            especificaciones_tecnicas=specs,
        )
        if creado:
            return {
                "error": False,
                "mensaje": "Artículo creado correctamente",
                "alert": True,
            }
        else:
            return {
                "error": True,
                "mensaje": "Ocurrio un error al crear el artículo",
                "alert": True,
            }
    except IntegrityError as error:
        print(error)
        return {
            "error": True,
            "mensaje": "Ya existe un artículo con ese código SKU",
            "alert": True,
        }
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


@router.patch("", dependencies=[Depends(check_user(Roles.finanzas))])
async def update_articulo(
    body: ArticuloBaseModel, request: Request, response: Response
):
    try:
        articulo = await Articulos.get(id=body.id)
        articulo.nombre = body.nombre
        articulo.descripcion = body.descripcion
        articulo.stock_actual = body.stock_actual
        articulo.stock_minimo = body.stock_minimo
        articulo.precio_lista = (
            Decimal(str(body.precio_lista))
            if body.precio_lista is not None
            else None
        )

        if "codigo_sku" in body.model_fields_set:
            articulo.codigo_sku = body.codigo_sku or None

        specs = articulo.especificaciones_tecnicas or {}
        if not isinstance(specs, dict):
            specs = {}
        if "categoria" in body.model_fields_set:
            specs["categoria"] = body.categoria
        if "ubicacion" in body.model_fields_set:
            specs["ubicacion"] = body.ubicacion
        articulo.especificaciones_tecnicas = specs

        await articulo.save()

        return {
            "error": False,
            "mensaje": "Artículo actualizado correctamente",
            "alert": True,
        }
    except IntegrityError as error:
        print(error)
        return {
            "error": True,
            "mensaje": "Ya existe un artículo con ese código SKU",
            "alert": True,
        }
    except Exception as error:
        print(error)
        return {
            "error": True,
            "mensaje": "Ocurrio un error al actualizar el artículo",
            "alert": True,
        }


@router.delete("", dependencies=[Depends(check_user(Roles.finanzas))])
async def delete_articulo(
    body: ArticuloDeleteBaseModel, request: Request, response: Response
):
    try:
        articulo = await Articulos.get_or_none(id=body.id)
        if not articulo:
            return {
                "error": True,
                "mensaje": "No se encontró el artículo",
                "alert": True,
            }
        await articulo.delete()
        return {
            "error": False,
            "mensaje": "Artículo eliminado correctamente",
            "alert": True,
        }
    except IntegrityError as error:
        print(error)
        return {
            "error": True,
            "mensaje": (
                "No se puede eliminar el artículo porque está asociado a "
                "documentos o movimientos de inventario"
            ),
            "alert": True,
        }
    except Exception as error:
        print(error)
        return {
            "error": True,
            "mensaje": "Ocurrio un error al eliminar el artículo",
            "alert": True,
        }
