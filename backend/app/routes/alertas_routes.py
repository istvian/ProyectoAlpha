from fastapi import APIRouter, Depends
from tortoise.expressions import F

from middlewares.jwt_helper import check_user_any
from models.proveedor import Articulos
from schemas.roles import Roles

router = APIRouter()
ROLES_LECTURA_ALERTAS = (Roles.bodega, Roles.supervisor)


@router.get(
    "/stock-minimo",
    dependencies=[Depends(check_user_any(ROLES_LECTURA_ALERTAS))],
)
async def get_alertas_stock_minimo():
    articulos = await (
        Articulos.filter(stock_actual__lte=F("stock_minimo"))
        .order_by("stock_actual", "nombre", "id")
        .values("id", "codigo_sku", "nombre", "stock_actual", "stock_minimo")
    )
    return {
        "error": False,
        "mensaje": "Alertas de stock mínimo consultadas correctamente",
        "data": articulos,
    }
