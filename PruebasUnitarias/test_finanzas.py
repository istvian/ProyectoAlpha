from decimal import Decimal

from routes.finanzas_routes import (
    FacturaCreateSchema,
    ProductoSchema,
    _aplicar_descuentos,
    _calcular_finanzas,
    _redondear_monto,
)


def test_redondear_monto():
    assert _redondear_monto(Decimal("1.005")) == Decimal("1.01")
    assert _redondear_monto(Decimal("2.345")) == Decimal("2.35")


def test_aplicar_descuentos():
    costo_neto, descuento_total = _aplicar_descuentos(Decimal("100.00"), [10.0, 5.0])
    assert costo_neto == Decimal("85.50")
    assert descuento_total == Decimal("14.50")


def test_calcular_finanzas():
    body = FacturaCreateSchema(
        tipo="Factura",
        proveedor="Proveedor",
        rut="1-9",
        folio="F-1",
        emision="2026-01-01",
        vencimiento="2026-02-01",
        descuento1=10.0,
        productos=[
            ProductoSchema(nombre="Prod", stock=2, precio_neto=100.0),
        ],
    )
    lineas, totales = _calcular_finanzas(body)
    assert len(lineas) == 1
    assert totales["cantidad_productos"] == 2
    assert totales["importe_base"] == Decimal("200.00")
    assert totales["iva"] == _redondear_monto(totales["subtotal"] * Decimal("0.19"))
    assert totales["total"] == totales["subtotal"] + totales["iva"]
