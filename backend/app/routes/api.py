from fastapi import APIRouter
from routes.user_routes import router as user_router
from routes.proveedor_routes import router as proveedor_router

api_router = APIRouter()
api_router.include_router(user_router, prefix="/users", tags=["Users"])
api_router.include_router(proveedor_router, prefix="/proveedor", tags=["Proveedor"])
