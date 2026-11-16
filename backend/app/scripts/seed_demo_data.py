"""Crea datos coherentes de demostración en una base SQLite de desarrollo."""

import argparse
import asyncio
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from tortoise import Tortoise
from tortoise.transactions import atomic

from db.db import EnsureCardexMovementTypeConstraint, PrepareRecepcionSchema
from models.cardex_log import CardexLog, TipoMovimiento
from models.conteo_inventario import (
    ConteoInventario,
    DetalleConteoInventario,
    EstadoConteo,
)
from models.egreso import DetalleEgreso, Egreso
from models.proveedor import (
    Articulos,
    DetalleDocumento,
    DocumentosTributarios,
    Proveedores,
)
from models.recepcion_compra import (
    DetalleOrdenCompra,
    DetalleRecepcionCompra,
    EstadoOrdenCompra,
    EstadoRecepcion,
    FacturaOrdenCompra,
    OrdenCompra,
    RecepcionCompra,
)
from models.rol import Rol
from models.user import User
from models.obra import Obra
from schemas.roles import Roles

MODELOS = [
    "models.user",
    "models.rol",
    "models.proveedor",
    "models.egreso",
    "models.cliente",
    "models.obra",
    "models.cardex_log",
    "models.ajustes_operativos",
    "models.recepcion_compra",
    "models.conteo_inventario",
]

RUT_DEMO = "99012345-4"
SKU_SALIDA = "ALPHA-DEMO-001"
SKU_RECEPCION = "ALPHA-DEMO-002"
CODIGO_OBRA = "OBR-ALPHA-DEMO-001"
FOLIO_APERTURA = "ALPHA-DEMO-FACT-001"
FOLIO_VINCULADA = "ALPHA-DEMO-FACT-002"
ORDEN_CERRADA = "ALPHA-DEMO-OC-001"
ORDEN_ABIERTA = "ALPHA-DEMO-OC-002"
ORDEN_PENDIENTE = "ALPHA-DEMO-OC-003"
GUIA_APROBADA = "ALPHA-DEMO-GUIA-001"
GUIA_PENDIENTE = "ALPHA-DEMO-GUIA-002"
OBSERVACION_CONTEO_DEMO = "Conteo físico demo pendiente de aprobación"


async def _crear_conteo_demo(
    articulo: Articulos,
    usuario: User,
) -> ConteoInventario:
    stock_contado = max(0, articulo.stock_actual - 1)
    conteo = await ConteoInventario.create(
        usuario=usuario,
        estado=EstadoConteo.PENDIENTE_APROBACION,
        observaciones=OBSERVACION_CONTEO_DEMO,
    )
    await DetalleConteoInventario.create(
        toma=conteo,
        producto=articulo,
        stock_teorico=articulo.stock_actual,
        conteo_fisico=stock_contado,
        diferencia=stock_contado - articulo.stock_actual,
    )
    return conteo


@atomic()
async def crear_datos_demo() -> dict[str, int | str]:
    proveedor_existente = await Proveedores.get_or_none(rut=RUT_DEMO)
    articulos_existentes = await Articulos.filter(
        codigo_sku__in=[SKU_SALIDA, SKU_RECEPCION]
    ).count()
    obra_existente = await Obra.get_or_none(codigo_obra=CODIGO_OBRA)
    documento_existente = await DocumentosTributarios.get_or_none(
        folio=FOLIO_APERTURA
    )
    marcadores = (
        proveedor_existente is not None,
        articulos_existentes > 0,
        obra_existente is not None,
        documento_existente is not None,
    )
    if all(marcadores):
        conteo_demo = await ConteoInventario.get_or_none(
            observaciones=OBSERVACION_CONTEO_DEMO
        )
        if conteo_demo:
            return {"estado": "ya_existian", "articulos": articulos_existentes}

        usuario_bodega = await User.filter(
            rol_id=Roles.bodega.value,
            enabled=True,
        ).order_by("id").first()
        articulo = await Articulos.get_or_none(codigo_sku=SKU_SALIDA)
        if not usuario_bodega or not articulo:
            raise RuntimeError(
                "No se pudo completar el conteo demo; falta el usuario de Bodega "
                "o el artículo de demostración."
            )
        conteo_demo = await _crear_conteo_demo(articulo, usuario_bodega)
        return {
            "estado": "conteo_agregado",
            "conteo_id": conteo_demo.id,
            "articulos": articulos_existentes,
        }
    if any(marcadores):
        raise RuntimeError(
            "Hay datos demo parciales. Revise las filas ALPHA-DEMO antes de continuar."
        )

    usuarios: dict[Roles, User] = {}
    for rol in (Roles.admin, Roles.bodega, Roles.finanzas, Roles.tecnico):
        if not await Rol.get_or_none(id=rol.value):
            raise RuntimeError(f"No existe el rol requerido: {rol.name}")
        usuario = await User.filter(
            rol_id=rol.value,
            enabled=True,
        ).order_by("id").first()
        if not usuario:
            raise RuntimeError(
                f"No existe un usuario activo para el rol {rol.name}."
            )
        usuarios[rol] = usuario

    proveedor = await Proveedores.create(
        rut=RUT_DEMO,
        razon_social="Proveedor Demo Alpha",
        deleted=False,
        direccion="Dirección de prueba",
        region="Ñuble",
        comuna="Chillán",
        ciudad="Chillán",
        contactos_jsonb={"correo": "demo@example.test"},
    )
    obra = await Obra.create(
        codigo_obra=CODIGO_OBRA,
        nombre_obra="Obra de prueba Alpha",
        tipo_servicio="Climatización",
        tecnico_responsable=usuarios[Roles.tecnico],
        enabled=True,
    )
    articulo_salida = await Articulos.create(
        codigo_sku=SKU_SALIDA,
        nombre="Filtro de aire demo",
        descripcion="Artículo de demostración para egresos a obra",
        stock_actual=12,
        stock_minimo=3,
        precio_lista=Decimal("10000.00"),
        precio_medio_ponderado=Decimal("10000.00"),
    )
    articulo_recepcion = await Articulos.create(
        codigo_sku=SKU_RECEPCION,
        nombre="Motor de ventilación demo",
        descripcion="Artículo de demostración para recepción de compras",
        stock_actual=3,
        stock_minimo=2,
        precio_lista=Decimal("25000.00"),
        precio_medio_ponderado=Decimal("25000.00"),
    )

    fecha = date.today()
    documento_apertura = await DocumentosTributarios.create(
        tipo="Factura",
        proveedor=proveedor,
        folio=FOLIO_APERTURA,
        emision=fecha,
        vencimiento=fecha + timedelta(days=30),
        observaciones="Factura inicial de datos de demostración",
        descuento1=0,
        descuento2=0,
        descuento3=0,
        importe_base=Decimal("195000.00"),
        descuento_total=Decimal("0.00"),
        subtotal=Decimal("195000.00"),
        iva=Decimal("37050.00"),
        total=Decimal("232050.00"),
        cantidad_productos=15,
    )
    await DetalleDocumento.create(
        documento=documento_apertura,
        articulo=articulo_salida,
        cantidad=12,
        precio_neto=Decimal("10000.00"),
        importe_base=Decimal("120000.00"),
        costo_neto_unitario=Decimal("10000.00"),
        neto_final=Decimal("120000.00"),
        precio_lista_actualizado=Decimal("10000.00"),
    )
    await DetalleDocumento.create(
        documento=documento_apertura,
        articulo=articulo_recepcion,
        cantidad=3,
        precio_neto=Decimal("25000.00"),
        importe_base=Decimal("75000.00"),
        costo_neto_unitario=Decimal("25000.00"),
        neto_final=Decimal("75000.00"),
        precio_lista_actualizado=Decimal("25000.00"),
    )

    await CardexLog.create(
        producto=articulo_salida,
        usuario=usuarios[Roles.finanzas],
        tipo_movimiento=TipoMovimiento.ENTRADA_COMPRA,
        cantidad=12,
        saldo_resultante=12,
        obra=None,
        motivo_justificacion=f"Factura {FOLIO_APERTURA}",
        costo_unitario=Decimal("10000.00"),
        saldo_valorizado=Decimal("120000.00"),
    )
    await CardexLog.create(
        producto=articulo_recepcion,
        usuario=usuarios[Roles.finanzas],
        tipo_movimiento=TipoMovimiento.ENTRADA_COMPRA,
        cantidad=3,
        saldo_resultante=3,
        obra=None,
        motivo_justificacion=f"Factura {FOLIO_APERTURA}",
        costo_unitario=Decimal("25000.00"),
        saldo_valorizado=Decimal("75000.00"),
    )

    egreso = await Egreso.create(
        obra=obra,
        responsable_entrega=usuarios[Roles.bodega].nombre,
        responsable_recepcion=usuarios[Roles.tecnico].nombre,
        usuario=usuarios[Roles.bodega],
    )
    await DetalleEgreso.create(
        egreso=egreso,
        articulo=articulo_salida,
        cantidad_solicitada=2,
        precio_lista_vigente=Decimal("10000.00"),
    )
    articulo_salida.stock_actual = 10
    await articulo_salida.save(update_fields=["stock_actual"])
    await CardexLog.create(
        producto=articulo_salida,
        usuario=usuarios[Roles.bodega],
        tipo_movimiento=TipoMovimiento.SALIDA_OBRA,
        cantidad=2,
        saldo_resultante=10,
        obra=obra,
        motivo_justificacion=f"Salida a obra {obra.codigo_obra} - Egreso #{egreso.id}",
        costo_unitario=Decimal("10000.00"),
        saldo_valorizado=Decimal("100000.00"),
    )

    orden_cerrada = await OrdenCompra.create(
        numero_orden=ORDEN_CERRADA,
        proveedor=proveedor,
        creado_por=usuarios[Roles.finanzas],
        estado=EstadoOrdenCompra.COMPLETA,
    )
    detalle_cerrado = await DetalleOrdenCompra.create(
        orden_compra=orden_cerrada,
        articulo=articulo_recepcion,
        cantidad_solicitada=1,
        cantidad_recibida=1,
        precio_unitario=Decimal("25000.00"),
    )
    recepcion_aprobada = await RecepcionCompra.create(
        orden_compra=orden_cerrada,
        numero_guia=GUIA_APROBADA,
        usuario=usuarios[Roles.bodega],
        bultos_guia=1,
        bultos_recibidos=1,
        estado=EstadoRecepcion.APROBADA,
        aprobado_por=usuarios[Roles.admin],
        observaciones="Recepción demo aprobada",
        fecha_aprobacion=datetime.now(timezone.utc),
    )
    await DetalleRecepcionCompra.create(
        recepcion=recepcion_aprobada,
        detalle_orden=detalle_cerrado,
        cantidad_guia=1,
        cantidad_recibida=1,
    )
    articulo_recepcion.stock_actual = 4
    await articulo_recepcion.save(update_fields=["stock_actual"])
    await CardexLog.create(
        producto=articulo_recepcion,
        usuario=usuarios[Roles.admin],
        tipo_movimiento=TipoMovimiento.ENTRADA_COMPRA,
        cantidad=1,
        saldo_resultante=4,
        obra=None,
        motivo_justificacion=f"Recepción de OC {ORDEN_CERRADA}, guía {GUIA_APROBADA}",
        costo_unitario=Decimal("25000.00"),
        saldo_valorizado=Decimal("100000.00"),
    )

    factura_vinculada = await DocumentosTributarios.create(
        tipo="Factura",
        proveedor=proveedor,
        folio=FOLIO_VINCULADA,
        emision=fecha,
        vencimiento=fecha + timedelta(days=30),
        observaciones="Factura demo vinculada a recepción aprobada",
        descuento1=0,
        descuento2=0,
        descuento3=0,
        importe_base=Decimal("25000.00"),
        descuento_total=Decimal("0.00"),
        subtotal=Decimal("25000.00"),
        iva=Decimal("4750.00"),
        total=Decimal("29750.00"),
        cantidad_productos=1,
    )
    await FacturaOrdenCompra.create(
        factura=factura_vinculada,
        orden_compra=orden_cerrada,
    )
    await DetalleDocumento.create(
        documento=factura_vinculada,
        articulo=articulo_recepcion,
        cantidad=1,
        precio_neto=Decimal("25000.00"),
        importe_base=Decimal("25000.00"),
        costo_neto_unitario=Decimal("25000.00"),
        neto_final=Decimal("25000.00"),
        precio_lista_actualizado=Decimal("25000.00"),
    )

    orden_abierta = await OrdenCompra.create(
        numero_orden=ORDEN_ABIERTA,
        proveedor=proveedor,
        creado_por=usuarios[Roles.finanzas],
        estado=EstadoOrdenCompra.ABIERTA,
    )
    await DetalleOrdenCompra.create(
        orden_compra=orden_abierta,
        articulo=articulo_recepcion,
        cantidad_solicitada=5,
        precio_unitario=Decimal("25000.00"),
    )

    orden_pendiente = await OrdenCompra.create(
        numero_orden=ORDEN_PENDIENTE,
        proveedor=proveedor,
        creado_por=usuarios[Roles.finanzas],
        estado=EstadoOrdenCompra.ABIERTA,
    )
    detalle_pendiente = await DetalleOrdenCompra.create(
        orden_compra=orden_pendiente,
        articulo=articulo_recepcion,
        cantidad_solicitada=4,
        precio_unitario=Decimal("26000.00"),
    )
    recepcion_pendiente = await RecepcionCompra.create(
        orden_compra=orden_pendiente,
        numero_guia=GUIA_PENDIENTE,
        usuario=usuarios[Roles.bodega],
        bultos_guia=1,
        bultos_recibidos=1,
        estado=EstadoRecepcion.PENDIENTE_APROBACION,
        observaciones="Recepción parcial de demostración; faltan unidades.",
        detalle_discrepancia=(
            f"{SKU_RECEPCION}: OC pendiente 4, recepción física 2"
        ),
    )
    await DetalleRecepcionCompra.create(
        recepcion=recepcion_pendiente,
        detalle_orden=detalle_pendiente,
        cantidad_guia=2,
        cantidad_recibida=2,
    )

    conteo_demo = await _crear_conteo_demo(
        articulo_salida,
        usuarios[Roles.bodega],
    )

    return {
        "estado": "creados",
        "articulos": 2,
        "obra_id": obra.id,
        "egreso_id": egreso.id,
        "orden_abierta_id": orden_abierta.id,
        "recepcion_pendiente_id": recepcion_pendiente.id,
        "conteo_id": conteo_demo.id,
    }


async def main(database_url: str) -> None:
    if not database_url.startswith("sqlite://"):
        raise ValueError("Los datos demo solo se pueden crear en SQLite local.")
    await Tortoise.init(db_url=database_url, modules={"models": MODELOS})
    await PrepareRecepcionSchema()
    await Tortoise.generate_schemas(safe=True)
    await EnsureCardexMovementTypeConstraint()
    try:
        resultado = await crear_datos_demo()
        print(resultado)
    finally:
        await Tortoise.close_connections()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Agrega registros coherentes de prueba a SQLite de desarrollo."
    )
    parser.add_argument(
        "--database-url",
        required=True,
        help="URL SQLite explícita, por ejemplo sqlite://db.sqlite3",
    )
    parser.add_argument(
        "--confirm-development-database",
        action="store_true",
        help="Confirma que la base indicada es local y de desarrollo.",
    )
    arguments = parser.parse_args()
    if not arguments.confirm_development_database:
        parser.error("Use --confirm-development-database para confirmar el destino.")
    asyncio.run(main(arguments.database_url))
