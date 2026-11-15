import unittest
from datetime import date
from decimal import Decimal

from tortoise import Tortoise

from db.db import EnsureArticuloJsonFields
from models.proveedor import (
    Articulos,
    DetalleDocumento,
    DocumentosTributarios,
    Proveedores,
)
from services.purchase_cost_history_service import registrar_costo_compra

MODELOS = {
    "models": [
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
}


class HistorialCostosArticuloTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await Tortoise.init(db_url="sqlite://:memory:", modules=MODELOS)
        await Tortoise.generate_schemas()

    async def asyncTearDown(self):
        await Tortoise.close_connections()

    async def test_guarda_especificaciones_y_solo_los_tres_costos_recientes(self):
        articulo = await Articulos.create(
            codigo_sku="COSTOS-TEST",
            nombre="Artículo con historial",
            especificaciones_tecnicas={"voltaje": "220 V", "material": "acero"},
        )

        for numero, costo in enumerate(
            ("10.00", "11.25", "12.50", "13.75"),
            start=1,
        ):
            await registrar_costo_compra(
                articulo=articulo,
                costo_unitario=Decimal(costo),
                fecha=date(2026, 1, numero),
                folio=f"F-{numero}",
            )

        articulo_guardado = await Articulos.get(id=articulo.id)
        self.assertEqual(articulo_guardado.stock_actual, 0)
        self.assertEqual(articulo_guardado.stock_minimo, 0)
        self.assertEqual(
            articulo_guardado.especificaciones_tecnicas,
            {"voltaje": "220 V", "material": "acero"},
        )
        self.assertEqual(
            articulo_guardado.ultimos_costos_compra,
            [
                {
                    "costo_unitario": "13.75",
                    "fecha": "2026-01-04",
                    "folio": "F-4",
                },
                {
                    "costo_unitario": "12.50",
                    "fecha": "2026-01-03",
                    "folio": "F-3",
                },
                {
                    "costo_unitario": "11.25",
                    "fecha": "2026-01-02",
                    "folio": "F-2",
                },
            ],
        )

    async def test_migracion_sqlite_rellena_costos_desde_facturas_existentes(self):
        articulo = await Articulos.create(
            codigo_sku="MIGRACION-TEST",
            nombre="Artículo con compras anteriores",
        )
        proveedor = await Proveedores.create(
            rut="TEST-123",
            razon_social="Proveedor de prueba",
        )

        for numero, costo in enumerate(
            ("20.00", "21.00", "22.00", "23.00"),
            start=1,
        ):
            documento = await DocumentosTributarios.create(
                tipo="Factura",
                proveedor=proveedor,
                folio=f"LEGACY-{numero}",
                emision=date(2026, 2, numero),
                vencimiento=date(2026, 3, numero),
            )
            await DetalleDocumento.create(
                documento=documento,
                articulo=articulo,
                cantidad=1,
                precio_neto=Decimal(costo),
                importe_base=Decimal(costo),
                costo_neto_unitario=Decimal(costo),
                neto_final=Decimal(costo),
            )

        connection = Tortoise.get_connection("default")
        await connection.execute_script("""
            ALTER TABLE "articulos" DROP COLUMN "especificaciones_tecnicas";
            ALTER TABLE "articulos" DROP COLUMN "ultimos_costos_compra";
            """)

        await EnsureArticuloJsonFields()

        articulo_migrado = await Articulos.get(id=articulo.id)
        self.assertEqual(articulo_migrado.especificaciones_tecnicas, {})
        self.assertEqual(
            articulo_migrado.ultimos_costos_compra,
            [
                {
                    "costo_unitario": "23.00",
                    "fecha": "2026-02-04",
                    "folio": "LEGACY-4",
                },
                {
                    "costo_unitario": "22.00",
                    "fecha": "2026-02-03",
                    "folio": "LEGACY-3",
                },
                {
                    "costo_unitario": "21.00",
                    "fecha": "2026-02-02",
                    "folio": "LEGACY-2",
                },
            ],
        )


if __name__ == "__main__":
    unittest.main()
