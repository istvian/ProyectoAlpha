import pytest
from fastapi import HTTPException
from decimal import Decimal

from models.proveedor import Articulos
from services.stock_service import descontar_existencias


async def test_descontar_existencias_exitoso(db):
    articulo = await Articulos.create(
        codigo_sku="STOCK-SVC", nombre="Articulo stock", stock_actual=10
    )
    actualizado = await descontar_existencias(articulo.id, 3)
    assert actualizado.stock_actual == 7
    assert (await Articulos.get(id=articulo.id)).stock_actual == 7


async def test_descontar_existencias_articulo_inexistente(db):
    with pytest.raises(HTTPException) as exc:
        await descontar_existencias(999999, 1)
    assert exc.value.status_code == 404


async def test_descontar_existencias_insuficiente(db):
    articulo = await Articulos.create(
        codigo_sku="STOCK-LOW", nombre="Articulo bajo", stock_actual=2
    )
    with pytest.raises(HTTPException) as exc:
        await descontar_existencias(articulo.id, 5)
    assert exc.value.status_code == 400
    assert (await Articulos.get(id=articulo.id)).stock_actual == 2
