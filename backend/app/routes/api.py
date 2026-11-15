from fastapi import APIRouter
from routes.user_routes import router as user_router
from routes.admin_routes import router as admin_router
from routes.proveedor_routes import router as proveedor_router
from routes.egreso_routes import router as egreso_router
from routes.cardex_routes import router as cardex_router
from routes.finanzas_routes import router as finanzas_router
from routes.facturas_routes import router as facturas_router
from routes.obras_routes import router as obras_router
from routes.conteo_inventario_routes import router as conteo_inventario_router
from routes.mermas_routes import router as mermas_router
from routes.uso_interno_routes import router as uso_interno_router

api_router = APIRouter()
api_router.include_router(user_router, prefix="/users", tags=["Users"])
api_router.include_router(admin_router, prefix="/admin", tags=["Admin"])
api_router.include_router(proveedor_router, prefix="/proveedor", tags=["Proveedor"])
api_router.include_router(egreso_router, prefix="/egresos", tags=["Egresos"])
api_router.include_router(cardex_router, prefix="/cardex", tags=["Cardex"])
api_router.include_router(finanzas_router, prefix="/finanzas", tags=["Finanzas"])
api_router.include_router(
    facturas_router, prefix="/facturas", tags=["Recepción de compras"]
)
api_router.include_router(obras_router, prefix="/obras", tags=["Obras"])
api_router.include_router(
    conteo_inventario_router,
    prefix="/inventario/conteos",
    tags=["Conteo físico"],
)
api_router.include_router(mermas_router, prefix="/mermas", tags=["Mermas"])
api_router.include_router(
    uso_interno_router,
    prefix="/usos-internos",
    tags=["Uso interno"],
)
