from datetime import date
import pytest

from fastapi import HTTPException
from models.cardex_log import TipoMovimiento
from routes.cardex_routes import _filtrar_movimientos, _filtros_reporte


def test_filtros_reporte():
    filtros = _filtros_reporte(date(2026, 1, 1), None, 5, None, TipoMovimiento.MERMA)
    assert filtros["Desde"] == "2026-01-01"
    assert filtros["Hasta"] == "Sin límite"
    assert filtros["Producto"] == "5"
    assert filtros["Obra"] == "Todas"
    assert filtros["Tipo de movimiento"] == "MERMA"


async def test_filtrar_movimientos_valida_rango_fechas(db):
    with pytest.raises(HTTPException) as exc:
        _filtrar_movimientos(date(2026, 2, 1), date(2026, 1, 1), None, None, None)
    assert exc.value.status_code == 400
