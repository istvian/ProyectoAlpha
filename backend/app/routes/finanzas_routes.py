import time
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, List, Literal, Optional

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


class FacturaCreateSchema(BaseModel):
    tipo: Literal["Factura"]
    proveedor: str
    rut: str
    folio: str
    emision: date
    vencimiento: date
    observaciones: Optional[str] = ""

    # Descuentos
    descuento1: float = Field(0.0, ge=0, le=100)
    descuento2: float = Field(0.0, ge=0, le=100)
    descuento3: float = Field(0.0, ge=0, le=100)

    importe_base: Optional[float] = Field(default=None, ge=0)
    descuento_total: Optional[float] = Field(default=None, ge=0)
    subtotal: Optional[float] = Field(default=None, ge=0)
    iva: Optional[float] = Field(default=None, ge=0)
    total: Optional[float] = Field(default=None, ge=0)
    cantidad_productos: Optional[int] = Field(default=None, ge=0)

    datos_dte: Optional[dict[str, Any]] = None
    productos: List[ProductoSchema] = Field(default_factory=list)


def _redondear_monto(monto: Decimal) -> Decimal:
    return monto.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _aplicar_descuentos(
    costo_base: Decimal, descuentos: list[float]
) -> tuple[Decimal, Decimal]:
    costo_neto = _redondear_monto(costo_base)
    descuento_total = Decimal("0.00")
    for porcentaje in descuentos:
        descuento = _redondear_monto(costo_neto * Decimal(str(porcentaje)) / 100)
        costo_neto = _redondear_monto(costo_neto - descuento)
        descuento_total += descuento
    return costo_neto, descuento_total


def _calcular_finanzas(
    body: FacturaCreateSchema,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    descuentos = [body.descuento1, body.descuento2, body.descuento3]
    lineas: list[dict[str, Any]] = []
    importe_base = Decimal("0.00")
    descuento_total = Decimal("0.00")
    subtotal = Decimal("0.00")
    cantidad_productos = 0

    for producto in body.productos:
        precio_neto = _redondear_monto(Decimal(str(producto.precio_neto)))
        costo_neto_unitario, descuento_unitario = _aplicar_descuentos(
            precio_neto, descuentos
        )
        cantidad = producto.stock
        importe_linea = precio_neto * cantidad
        neto_linea = costo_neto_unitario * cantidad
        importe_base += importe_linea
        descuento_total += descuento_unitario * cantidad
        subtotal += neto_linea
        cantidad_productos += cantidad
        lineas.append(
            {
                "producto": producto,
                "precio_neto": precio_neto,
                "costo_neto_unitario": costo_neto_unitario,
                "importe_base": importe_linea,
                "neto_final": neto_linea,
            }
        )

    iva = _redondear_monto(subtotal * Decimal("0.19"))
    total = subtotal + iva
    return lineas, {
        "importe_base": importe_base,
        "descuento_total": descuento_total,
        "subtotal": subtotal,
        "iva": iva,
        "total": total,
        "cantidad_productos": cantidad_productos,
    }


# Insertar una factura via pestaña finanzas
@router.post("/factura", dependencies=[Depends(check_user(Roles.finanzas))])
async def create_factura(
    request: Request, body: FacturaCreateSchema, response: Response
):
    try:
        return await _create_factura_atomically(request, body)
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


@atomic()
async def _create_factura_atomically(
    request: Request, body: FacturaCreateSchema
) -> dict[str, Any]:
    if not body.productos:
        return {
            "error": True,
            "mensaje": "Debe agregar al menos un producto a la factura.",
        }

    lineas, totales = _calcular_finanzas(body)

    token = request.cookies.get("token")
    payload = decode_jwt(token)
    usuario = await User.get_or_none(correo=payload["correo"])
    if not usuario:
        return {"error": True, "mensaje": "Usuario no autenticado o no existe"}

    documento_existente = await DocumentosTributarios.get_or_none(folio=body.folio)
    if documento_existente:
        return {"error": True, "mensaje": "El folio de la factura ya existe"}

    proveedor = await Proveedores.get_or_none(rut=body.rut)
    if not proveedor:
        proveedor = await Proveedores.create(
            rut=body.rut, razon_social=body.proveedor, deleted=False
        )
    documento = await DocumentosTributarios.create(
        tipo=body.tipo,
        proveedor=proveedor,
        folio=body.folio,
        emision=body.emision,
        vencimiento=body.vencimiento,
        observaciones=body.observaciones,
        datos_dte=body.datos_dte,
        descuento1=body.descuento1,
        descuento2=body.descuento2,
        descuento3=body.descuento3,
        importe_base=totales["importe_base"],
        descuento_total=totales["descuento_total"],
        subtotal=totales["subtotal"],
        iva=totales["iva"],
        total=totales["total"],
        cantidad_productos=totales["cantidad_productos"],
    )

    for linea in lineas:
        producto = linea["producto"]
        sku = producto.sku.strip() if producto.sku else ""
        articulo = (
            await Articulos.filter(codigo_sku=sku).select_for_update().first()
            if sku
            else None
        )
        if not articulo:
            articulo = await Articulos.create(
                codigo_sku=sku or None,
                nombre=producto.nombre,
                descripcion=producto.descripcion,
                stock_actual=0,
                stock_minimo=producto.stock_minimo,
                precio_lista=linea["precio_neto"],
            )
            if not sku:
                articulo.codigo_sku = f"PROD-{date.today().year}-{articulo.id}"
                await articulo.save(update_fields=["codigo_sku"])

        stock_anterior = articulo.stock_actual
        pmp_anterior = Decimal(str(articulo.precio_medio_ponderado))
        if stock_anterior > 0 and pmp_anterior <= 0:
            pmp_anterior = Decimal(
                str(articulo.precio_lista or linea["costo_neto_unitario"])
            )
        nuevo_stock = stock_anterior + producto.stock
        nuevo_pmp = _redondear_monto(
            (
                Decimal(stock_anterior) * pmp_anterior
                + Decimal(producto.stock) * linea["costo_neto_unitario"]
            )
            / Decimal(nuevo_stock)
        )
        updated = await Articulos.filter(id=articulo.id).update(
            stock_actual=F("stock_actual") + producto.stock,
            precio_lista=linea["precio_neto"],
            precio_medio_ponderado=nuevo_pmp,
        )
        if updated != 1:
            raise RuntimeError(
                f"No se pudo actualizar el stock del SKU "
                f"{sku or articulo.codigo_sku}"
            )

        articulo = await Articulos.get(id=articulo.id)
        await DetalleDocumento.create(
            documento=documento,
            articulo=articulo,
            cantidad=producto.stock,
            precio_neto=linea["precio_neto"],
            importe_base=linea["importe_base"],
            costo_neto_unitario=linea["costo_neto_unitario"],
            neto_final=linea["neto_final"],
            precio_lista_actualizado=linea["precio_neto"],
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
                f"Ingreso por Factura folio {documento.folio}"
            ),
            costo_unitario=linea["costo_neto_unitario"],
            saldo_valorizado=(
                Decimal(articulo.stock_actual)
                * articulo.precio_medio_ponderado
            ),
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
