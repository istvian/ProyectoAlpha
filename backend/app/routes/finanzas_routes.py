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
from models.user import User
from models.cardex_log import CardexLog, TipoMovimiento
from middlewares.jwt_helper import check_user, decode_jwt, validar_rol
from schemas.roles import Roles
from db.nosql import get_db
from datetime import date

router = APIRouter()
db = get_db()


class ProductoSchema(BaseModel):
    nombre: str
    sku: Optional[str]
    descripcion: Optional[str] = ""
    stock: int
    stock_minimo: int = Field(0, ge=0)
    precio_neto: float = Field(..., gt=0)
    importe_base: Optional[float] = 0.0
    costo_neto: Optional[float] = 0.0
    neto_final: Optional[float] = 0.0


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

    importe_base: float
    descuento_total: float
    subtotal: float
    iva: float
    total: float
    cantidad_productos: int

    productos: List[ProductoSchema]


# Insertar una factura via pestaña finanzas
@router.post("/factura", dependencies=[Depends(check_user(Roles.finanzas))])
async def create_factura(
    request: Request, body: DocumentoTributarioCreateSchema, response: Response
):
    try:
        token = request.cookies.get("token")
        payload = decode_jwt(token)
        usuario = await User.get_or_none(correo=payload["correo"])
        if not usuario:
            return {"error": True, "mensaje": "Usuario no autenticado o no existe"}
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
                importe_base=body.importe_base,
                descuento_total=body.descuento_total,
                subtotal=body.subtotal,
                iva=body.iva,
                total=body.total,
                cantidad_productos=body.cantidad_productos,
            )
        else:
            return {"error": True, "mensaje": "El folio del documento ya existe"}
        for producto in body.productos:
            detalle = {}
            ultimo = await Articulos.all().last()
            id = ultimo.id + 1 if ultimo is not None else 1
            today = date.today()
            anio_actual = today.year
            sku = f"PROD-{anio_actual}-{id}"
            articulo = await Articulos.create(
                codigo_sku=sku,
                nombre=producto.nombre,
                descripcion=producto.descripcion,
                stock_actual=producto.stock,
                stock_minimo=producto.stock_minimo,
                precio_lista=producto.precio_neto,
            )
            detalle["documento"] = documento
            detalle["articulo"] = articulo
            detalle["cantidad"] = articulo.stock_actual
            detalle["precio_neto"] = producto.precio_neto
            detalle["importe_base"] = producto.importe_base
            detalle["costo_neto_unitario"] = producto.costo_neto
            detalle["neto_final"] = producto.neto_final
            await DetalleDocumento.create(**detalle)
            await CardexLog.create(
                producto=articulo,
                usuario=usuario,
                tipo_movimiento=TipoMovimiento.ENTRADA_COMPRA,
                cantidad=articulo.stock_actual,
                saldo_resultante=articulo.stock_actual,
                obra=None,
                motivo_justificacion=f"Ingreso de producto en Factura Folio {documento.folio}",
                costo_unitario=articulo.precio_lista,
                saldo_valorizado=articulo.precio_lista,
            )

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


@router.get("/tecnicos", dependencies=[Depends(check_user(Roles.finanzas))])
async def get_tecnicos():
    try:
        data = await User.all().filter(rol=Roles.tecnico.value)
        for user in data:
            del user.password
        return {
            "error": False,
            "mensaje": "Facturas retornadas correctamente",
            "data": data,
        }
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}
