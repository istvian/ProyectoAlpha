from fastapi import APIRouter
from routes.user_routes import router as user_router
from routes.admin_routes import router as admin_router
from routes.proveedor_routes import router as proveedor_router
from routes.egreso_routes import router as egreso_router
from routes.finanzas_routes import router as finanzas_router

api_router = APIRouter()
api_router.include_router(user_router, prefix="/users", tags=["Users"])
api_router.include_router(admin_router, prefix="/admin", tags=["Admin"])
api_router.include_router(proveedor_router, prefix="/proveedor", tags=["Proveedor"])
api_router.include_router(egreso_router, prefix="/egresos", tags=["Egresos"])
api_router.include_router(finanzas_router, prefix="/finanzas", tags=["Finanzas"])