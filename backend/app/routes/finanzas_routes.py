import time
from typing import List, Optional

from fastapi import APIRouter, Depends, Request, Response
from tortoise.contrib.pydantic import pydantic_model_creator, pydantic_queryset_creator
from pydantic import BaseModel, EmailStr, Field, create_model
from models.proveedor import (
    Articulos,
    DetalleDocumento,
    DocumentosTributarios,
    Proveedores,
)
from middlewares.jwt_helper import check_user, validar_rol
from schemas.roles import Roles
from db.nosql import get_db
from datetime import date

router = APIRouter()
db = get_db()


class ProductoSchema(BaseModel):
    nombre: str
    sku: str
    descripcion: Optional[str] = ""
    stock: int
    stockMinimo: int = Field(0, ge=0)
    precioNeto: float = Field(..., gt=0)
    importeBase: Optional[float] = 0.0
    costoNeto: Optional[float] = 0.0
    netoFinal: Optional[float] = 0.0


class DocumentoTributarioCreateSchema(BaseModel):
    tipo: str
    proveedor: str
    rut: str
    folio: str
    emision: date
    vencimiento: date
    observaciones: Optional[str] = ""

    # Descuentos
    descuento1: Optional[float] = 0.0
    descuento2: Optional[float] = 0.0
    descuento3: Optional[float] = 0.0

    importeBase: float
    descuentoTotal: float
    subtotal: float
    iva: float
    total: float
    cantidadProductos: int

    productos: List[ProductoSchema]


# Insertar una factura via pestaña finanzas
@router.post("/factura", dependencies=[Depends(check_user(Roles.finanzas))])
async def create_factura(
    request: Request, body: DocumentoTributarioCreateSchema, response: Response
):
    try:
        proveedor = await Proveedores.get_or_none(rut=body.rut)
        if not proveedor:
            proveedor = await Proveedores.create(
                rut=body.rut, razon_social=body.proveedor, deleted=False
            )
        documento = await DocumentosTributarios.get_or_none(folio=body.folio)
        if not documento:
            documento = await DocumentosTributarios.create(
                tipo=body.tipo,
                proveedor=proveedor,
                folio=body.folio,
                emision=body.emision,
                vencimiento=body.vencimiento,
                observaciones=body.observaciones,
                descuento1=body.descuento1,
                descuento2=body.descuento2,
                descuento3=body.descuento3,
                importe_base=body.importeBase,
                descuento_total=body.descuentoTotal,
                subtotal=body.subtotal,
                iva=body.iva,
                total=body.total,
                cantidad_productos=body.cantidadProductos,
            )
        for producto in body.productos:
            detalle = {}
            articulo = await Articulos.create(
                codigo_sku=producto.sku,
                nombre=producto.nombre,
                descripcion=producto.descripcion,
                stock_actual=producto.stock,
                stock_minimo=producto.stockMinimo,
                precio_lista=producto.precioNeto,
            )
            detalle["documento"] = documento
            detalle["articulo"] = articulo
            detalle["cantidad"] = articulo.stock_actual
            detalle["precio_neto"] = producto.precioNeto
            detalle["importe_base"] = producto.importeBase
            detalle["costo_neto_unitario"] = producto.costoNeto
            detalle["neto_final"] = producto.netoFinal
            await DetalleDocumento.create(**detalle)

        return {"error": False, "mensaje": "Se creo correctamente"}
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


@router.get("/factura", dependencies=[Depends(check_user(Roles.finanzas))])
async def get_facturas():
    try:
        data = await DocumentosTributarios.all()
        return {
            "error": False,
            "mensaje": "Facturas retornadas correctamente",
            "data": data,
        }
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}
