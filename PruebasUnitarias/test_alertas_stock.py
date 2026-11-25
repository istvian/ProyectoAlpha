from models.proveedor import Articulos
from routes.alertas_routes import get_alertas_stock_minimo


async def test_devuelve_articulos_con_stock_igual_o_inferior_al_minimo(db):
    await Articulos.create(codigo_sku="STOCK-BAJO", nombre="Stock bajo", stock_actual=1, stock_minimo=3)
    await Articulos.create(codigo_sku="STOCK-IGUAL", nombre="Stock igual al mínimo", stock_actual=2, stock_minimo=2)
    await Articulos.create(codigo_sku="STOCK-SUFICIENTE", nombre="Stock suficiente", stock_actual=4, stock_minimo=3)

    respuesta = await get_alertas_stock_minimo()
    assert respuesta["error"] is False
    assert [a["codigo_sku"] for a in respuesta["data"]] == ["STOCK-BAJO", "STOCK-IGUAL"]
    assert set(respuesta["data"][0]) == {"id", "codigo_sku", "nombre", "stock_actual", "stock_minimo"}


async def test_devuelve_lista_vacia_si_no_hay_stock_critico(db):
    await Articulos.create(codigo_sku="STOCK-OK", nombre="Stock suficiente", stock_actual=5, stock_minimo=2)
    respuesta = await get_alertas_stock_minimo()
    assert respuesta["data"] == []
