from datetime import date, datetime, timezone

from services.cardex_summary_service import CHILE_TIMEZONE, rango_fecha_local


def test_rango_fecha_local():
    inicio, fin = rango_fecha_local(date(2026, 1, 15))
    assert inicio.tzinfo is not None
    assert fin.tzinfo is not None
    assert inicio.astimezone(CHILE_TIMEZONE).date().isoformat() == "2026-01-15"
    assert fin.astimezone(CHILE_TIMEZONE).date().isoformat() == "2026-01-16"
