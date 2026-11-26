import unittest

from tortoise import Tortoise

from models.proveedor import Articulos
from routes.alertas_routes import get_alertas_stock_minimo

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


class AlertasStockRoutesTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await Tortoise.init(db_url="sqlite://:memory:", modules=MODELOS)
        await Tortoise.generate_schemas()

    async def asyncTearDown(self):
        await Tortoise.close_connections()

    async def test_devuelve_articulos_con_minimo_configurado_y_stock_critico(self):
        await Articulos.create(
            codigo_sku="STOCK-BAJO",
            nombre="Stock bajo",
            stock_actual=1,
            stock_minimo=3,
        )
        await Articulos.create(
            codigo_sku="STOCK-IGUAL",
            nombre="Stock igual al mínimo",
            stock_actual=2,
            stock_minimo=2,
        )
        await Articulos.create(
            codigo_sku="STOCK-SUFICIENTE",
            nombre="Stock suficiente",
            stock_actual=4,
            stock_minimo=3,
        )
        await Articulos.create(
            codigo_sku="STOCK-SIN-MINIMO",
            nombre="Stock agotado sin mínimo configurado",
            stock_actual=0,
            stock_minimo=0,
        )

        respuesta = await get_alertas_stock_minimo()

        self.assertFalse(respuesta["error"])
        self.assertEqual(
            [articulo["codigo_sku"] for articulo in respuesta["data"]],
            ["STOCK-BAJO", "STOCK-IGUAL"],
        )
        self.assertEqual(
            set(respuesta["data"][0]),
            {"id", "codigo_sku", "nombre", "stock_actual", "stock_minimo"},
        )

    async def test_devuelve_lista_vacia_si_no_hay_stock_critico(self):
        await Articulos.create(
            codigo_sku="STOCK-OK",
            nombre="Stock suficiente",
            stock_actual=5,
            stock_minimo=2,
        )

        respuesta = await get_alertas_stock_minimo()

        self.assertEqual(respuesta["data"], [])

    async def test_no_alerta_si_el_minimo_no_esta_configurado(self):
        await Articulos.create(
            codigo_sku="STOCK-MINIMO-PREDETERMINADO",
            nombre="Stock sin mínimo configurado",
            stock_actual=0,
            stock_minimo=0,
        )

        respuesta = await get_alertas_stock_minimo()

        self.assertEqual(respuesta["data"], [])
