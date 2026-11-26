from datetime import datetime, timezone, timedelta

from services.cardex_report_service import _fecha_utc


def test_fecha_utc_naive():
    dt = datetime(2026, 1, 1, 12, 0, 0)
    out = _fecha_utc(dt)
    assert out.tzinfo is not None
    assert out.utcoffset().total_seconds() == 0


def test_fecha_utc_con_tz():
    dt = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone(timedelta(hours=-3)))
    out = _fecha_utc(dt)
    assert out.utcoffset().total_seconds() == 0
