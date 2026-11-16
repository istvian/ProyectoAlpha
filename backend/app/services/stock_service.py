from fastapi import HTTPException, status
from tortoise.expressions import F

from models.proveedor import Articulos


async def descontar_existencias(articulo_id: int, cantidad: int) -> Articulos:
    articulo = await Articulos.filter(
        id=articulo_id
    ).select_for_update().first()
    if not articulo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El artículo no existe en el inventario.",
        )
    if articulo.stock_actual < cantidad:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Stock insuficiente para '{articulo.nombre}'. "
                f"Disponible: {articulo.stock_actual}; solicitado: {cantidad}."
            ),
        )

    actualizado = await Articulos.filter(
        id=articulo.id,
        stock_actual__gte=cantidad,
    ).update(stock_actual=F("stock_actual") - cantidad)
    if actualizado != 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Las existencias cambiaron. Actualice el inventario e inténtelo "
                "nuevamente."
            ),
        )

    return await Articulos.get(id=articulo.id)
