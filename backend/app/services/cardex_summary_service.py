from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from models.cardex_log import CardexLog, TipoMovimiento

CHILE_TIMEZONE = ZoneInfo("America/Santiago")


def rango_fecha_local(fecha: date) -> tuple[datetime, datetime]:
    inicio = datetime.combine(fecha, time.min, tzinfo=CHILE_TIMEZONE)
    fin = datetime.combine(fecha + timedelta(days=1), time.min, tzinfo=CHILE_TIMEZONE)
    return inicio.astimezone(timezone.utc), fin.astimezone(timezone.utc)


async def obtener_resumen_cardex(fecha: date | None = None) -> dict:
    fecha = fecha or datetime.now(CHILE_TIMEZONE).date()
    inicio, fin = rango_fecha_local(fecha)
    movimientos = CardexLog.filter(fecha_hora__gte=inicio, fecha_hora__lt=fin)
    por_tipo = {
        tipo.value: await movimientos.filter(tipo_movimiento=tipo).count()
        for tipo in TipoMovimiento
    }
    entradas = por_tipo[TipoMovimiento.ENTRADA_COMPRA.value] + por_tipo[
        TipoMovimiento.DEVOLUCION.value
    ]
    salidas = sum(
        por_tipo[tipo.value]
        for tipo in (
            TipoMovimiento.SALIDA_OBRA,
            TipoMovimiento.MERMA,
            TipoMovimiento.USO_INTERNO,
        )
    )
    return {
        "fecha": fecha.isoformat(),
        "movimientos": sum(por_tipo.values()),
        "entradas": entradas,
        "salidas": salidas,
        "ajustes": por_tipo[TipoMovimiento.AJUSTE_INVENTARIO.value],
        "por_tipo": por_tipo,
    }
