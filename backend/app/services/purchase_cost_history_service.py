from datetime import date
from decimal import Decimal

from models.proveedor import Articulos


async def registrar_costo_compra(
    articulo: Articulos,
    costo_unitario: Decimal,
    fecha: date,
    folio: str,
) -> None:
    historial = articulo.ultimos_costos_compra or []
    if not isinstance(historial, list) or any(
        not isinstance(item, dict) for item in historial
    ):
        raise ValueError(
            f"El historial de costos del artículo {articulo.id} no tiene un formato válido."
        )

    historial = [
        item for item in historial if item.get("folio") != folio
    ]
    historial.append(
        {
            "costo_unitario": format(costo_unitario, ".2f"),
            "fecha": fecha.isoformat(),
            "folio": folio,
        }
    )
    historial.sort(
        key=lambda item: (item["fecha"], item["folio"]),
        reverse=True,
    )
    articulo.ultimos_costos_compra = historial[:3]
    await articulo.save(update_fields=["ultimos_costos_compra"])
