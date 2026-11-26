from models.proveedor import Articulos
from routes.inventario_routes import _categoria_articulo, _estado_articulo, _filtrar_inventario


async def test_filtra_por_categoria(db):
    await Articulos.create(
        codigo_sku="FIL-001", nombre="Filtro de aire",
        especificaciones_tecnicas={"categoria": "Filtros"},
    )
    await Articulos.create(
        codigo_sku="LUB-001", nombre="Lubricante",
        especificaciones_tecnicas={"categoria": "Lubricantes"},
    )
    await Articulos.create(
        codigo_sku="SIN-001", nombre="Sin categoria",
        especificaciones_tecnicas={},
    )

    consulta = _filtrar_inventario(None, "Filtros", None)
    assert await consulta.count() == 1
    assert [a.codigo_sku for a in await consulta] == ["FIL-001"]


async def test_combina_categoria_con_codigo_nombre(db):
    await Articulos.create(
        codigo_sku="FIL-001", nombre="Filtro de aire",
        especificaciones_tecnicas={"categoria": "Filtros"},
    )
    await Articulos.create(
        codigo_sku="LUB-001", nombre="Lubricante",
        especificaciones_tecnicas={"categoria": "Lubricantes"},
    )
    await Articulos.create(
        codigo_sku="SIN-001", nombre="Sin categoria",
        especificaciones_tecnicas={},
    )

    consulta = _filtrar_inventario("Filtro", "Filtros", None)
    assert await consulta.count() == 1
    assert [a.codigo_sku for a in await consulta] == ["FIL-001"]

    consulta_sin_resultados = _filtrar_inventario("Lubricante", "Filtros", None)
    assert await consulta_sin_resultados.count() == 0


async def test_categoria_inexistente_devuelve_vacio(db):
    await Articulos.create(
        codigo_sku="FIL-001", nombre="Filtro de aire",
        especificaciones_tecnicas={"categoria": "Filtros"},
    )
    consulta = _filtrar_inventario(None, "NoExiste", None)
    assert await consulta.count() == 0


async def test_sin_categoria_devuelve_todos(db):
    await Articulos.create(codigo_sku="A", nombre="A", especificaciones_tecnicas={})
    await Articulos.create(codigo_sku="B", nombre="B", especificaciones_tecnicas={})
    await Articulos.create(codigo_sku="C", nombre="C", especificaciones_tecnicas={})
    consulta = _filtrar_inventario(None, None, None)
    assert await consulta.count() == 3


def test_estado_articulo():
    assert _estado_articulo(0, 3) == "SIN_STOCK"
    assert _estado_articulo(2, 3) == "BAJO_STOCK"
    assert _estado_articulo(4, 3) == "DISPONIBLE"


def test_categoria_articulo():
    a1 = Articulos(codigo_sku="X", nombre="X", especificaciones_tecnicas={"categoria": "Filtros"})
    assert _categoria_articulo(a1) == "Filtros"
    a2 = Articulos(codigo_sku="Y", nombre="Y", especificaciones_tecnicas={})
    assert _categoria_articulo(a2) is None
