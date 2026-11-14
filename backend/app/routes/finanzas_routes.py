import time
from decimal import Decimal
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Request, Response
from tortoise.expressions import F
from tortoise.contrib.pydantic import pydantic_model_creator, pydantic_queryset_creator
from tortoise.transactions import atomic
from pydantic import BaseModel, EmailStr, Field, create_model
from models.proveedor import (
    Articulos,
    DetalleDocumento,
    DocumentosTributarios,
    Proveedores,
    TipoDocumentoTributario,
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
    sku: Optional[str] = None
    descripcion: Optional[str] = ""
    stock: int = Field(..., gt=0)
    stock_minimo: int = Field(0, ge=0)
    precio_neto: float = Field(..., gt=0)
    importe_base: Optional[float] = 0.0
    costo_neto: Optional[float] = 0.0
    neto_final: Optional[float] = 0.0


class DocumentoTributarioCreateSchema(BaseModel):
    tipo: TipoDocumentoTributario
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

    datos_dte: Optional[dict[str, Any]] = None
    productos: List[ProductoSchema] = Field(default_factory=list)


# Insertar una factura via pestaña finanzas
@router.post("/factura", dependencies=[Depends(check_user(Roles.finanzas))])
async def create_factura(
    request: Request, body: DocumentoTributarioCreateSchema, response: Response
):
    try:
        return await _create_factura_atomically(request, body)
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


@atomic()
async def _create_factura_atomically(
    request: Request, body: DocumentoTributarioCreateSchema
) -> dict[str, Any]:
    es_nota_credito = body.tipo == TipoDocumentoTributario.NOTA_CREDITO
    if es_nota_credito and body.productos:
        return {
            "error": True,
            "mensaje": "La Nota de Crédito se registra sin crear productos ni movimientos de inventario.",
        }
    if not es_nota_credito and not body.productos:
        return {
            "error": True,
            "mensaje": "Debe agregar al menos un producto al documento.",
        }

    token = request.cookies.get("token")
    payload = decode_jwt(token)
    usuario = await User.get_or_none(correo=payload["correo"])
    if not usuario:
        return {"error": True, "mensaje": "Usuario no autenticado o no existe"}

    documento_existente = await DocumentosTributarios.get_or_none(folio=body.folio)
    if documento_existente:
        return {"error": True, "mensaje": "El folio del documento ya existe"}

    proveedor = await Proveedores.get_or_none(rut=body.rut)
    if not proveedor:
        proveedor = await Proveedores.create(
            rut=body.rut, razon_social=body.proveedor, deleted=False
        )
    documento = await DocumentosTributarios.create(
        tipo=body.tipo.value,
        proveedor=proveedor,
        folio=body.folio,
        emision=body.emision,
        vencimiento=body.vencimiento,
        observaciones=body.observaciones,
        datos_dte=body.datos_dte,
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

    for producto in body.productos:
        sku = producto.sku.strip() if producto.sku else ""
        articulo = await Articulos.get_or_none(codigo_sku=sku) if sku else None
        if not articulo:
            articulo = await Articulos.create(
                codigo_sku=sku or None,
                nombre=producto.nombre,
                descripcion=producto.descripcion,
                stock_actual=0,
                stock_minimo=producto.stock_minimo,
                precio_lista=producto.precio_neto,
            )
            if not sku:
                articulo.codigo_sku = f"PROD-{date.today().year}-{articulo.id}"
                await articulo.save(update_fields=["codigo_sku"])

        updated = await Articulos.filter(id=articulo.id).update(
            stock_actual=F("stock_actual") + producto.stock,
            precio_lista=producto.precio_neto,
        )
        if updated != 1:
            raise RuntimeError(
                f"No se pudo actualizar el stock del SKU "
                f"{sku or articulo.codigo_sku}"
            )

        articulo = await Articulos.get(id=articulo.id)
        costo_unitario = (
            Decimal(str(producto.costo_neto))
            if producto.costo_neto and producto.costo_neto > 0
            else Decimal(str(producto.precio_neto))
        )
        await DetalleDocumento.create(
            documento=documento,
            articulo=articulo,
            cantidad=producto.stock,
            precio_neto=producto.precio_neto,
            importe_base=producto.importe_base,
            costo_neto_unitario=costo_unitario,
            neto_final=producto.neto_final,
            precio_lista_actualizado=articulo.precio_lista,
            descuento1=body.descuento1 or 0,
            descuento2=body.descuento2 or 0,
            descuento3=body.descuento3 or 0,
        )
        await CardexLog.create(
            producto=articulo,
            usuario=usuario,
            tipo_movimiento=TipoMovimiento.ENTRADA_COMPRA,
            cantidad=producto.stock,
            saldo_resultante=articulo.stock_actual,
            obra=None,
            motivo_justificacion=(
                f"Ingreso por {body.tipo.value} folio {documento.folio}"
            ),
            costo_unitario=costo_unitario,
            saldo_valorizado=Decimal(articulo.stock_actual) * costo_unitario,
        )

    return {"error": False, "mensaje": "Se creo correctamente"}


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
