from models.proveedor import Articulos
from services.inventario_report_service import _categoria, _estado


def test_estado_articulo():
    assert _estado(0, 3) == "SIN_STOCK"
    assert _estado(2, 3) == "BAJO_STOCK"
    assert _estado(3, 3) == "BAJO_STOCK"
    assert _estado(4, 3) == "DISPONIBLE"


def test_categoria_articulo():
    a1 = Articulos(codigo_sku="X", nombre="X", especificaciones_tecnicas={"categoria": "Filtros"})
    assert _categoria(a1) == "Filtros"
    a2 = Articulos(codigo_sku="Y", nombre="Y", especificaciones_tecnicas={})
    assert _categoria(a2) == "Sin categoría"
    a3 = Articulos(codigo_sku="Z", nombre="Z", especificaciones_tecnicas={"categoria": ""})
    assert _categoria(a3) == "Sin categoría"
