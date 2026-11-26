import unittest

from tortoise import Tortoise

from models.proveedor import Articulos
from routes.inventario_routes import _filtrar_inventario

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


class InventarioFiltroCategoriaTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await Tortoise.init(db_url="sqlite://:memory:", modules=MODELOS)
        await Tortoise.generate_schemas()
        await Articulos.create(
            codigo_sku="FIL-001",
            nombre="Filtro de aire",
            especificaciones_tecnicas={"categoria": "Filtros"},
        )
        await Articulos.create(
            codigo_sku="LUB-001",
            nombre="Lubricante",
            especificaciones_tecnicas={"categoria": "Lubricantes"},
        )
        await Articulos.create(
            codigo_sku="SIN-001",
            nombre="Sin categoria",
            especificaciones_tecnicas={},
        )

    async def asyncTearDown(self):
        await Tortoise.close_connections()

    async def test_filtra_por_categoria(self):
        consulta = _filtrar_inventario(None, "Filtros", None)

        self.assertEqual(await consulta.count(), 1)
        self.assertEqual(
            [a.codigo_sku for a in await consulta],
            ["FIL-001"],
        )

    async def test_combina_categoria_con_codigo_nombre(self):
        consulta = _filtrar_inventario("Filtro", "Filtros", None)

        self.assertEqual(await consulta.count(), 1)
        self.assertEqual([a.codigo_sku for a in await consulta], ["FIL-001"])

        consulta_sin_resultados = _filtrar_inventario(
            "Lubricante", "Filtros", None
        )
        self.assertEqual(await consulta_sin_resultados.count(), 0)

    async def test_categoria_inexistente_devuelve_vacio(self):
        consulta = _filtrar_inventario(None, "NoExiste", None)

        self.assertEqual(await consulta.count(), 0)

    async def test_sin_categoria_devuelve_todos(self):
        consulta = _filtrar_inventario(None, None, None)

        self.assertEqual(await consulta.count(), 3)
