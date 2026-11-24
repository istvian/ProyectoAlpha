"""API aislada para las pruebas de navegador; no se monta en la aplicación real."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from tortoise import Tortoise

from db.db import EnsureCardexImmutability
from middlewares.jwt_helper import generate_jwt
from middlewares.bcript_helper import encriptar_contraseña
from models.obra import Obra
from models.proveedor import Articulos
from models.rol import Rol
from models.user import User
from routes.api import api_router
from tests.test_solicitudes_material import MODELOS


@asynccontextmanager
async def lifespan(app: FastAPI):
    await Tortoise.init(
        db_url="sqlite://:memory:", modules=MODELOS, _enable_global_fallback=True
    )
    await Tortoise.generate_schemas()
    await EnsureCardexImmutability()
    usuarios = {}
    for role, name in ((1, "Admin"), (2, "Bodega"), (3, "Finanzas"), (4, "Supervisor"), (5, "Tecnico")):
        rol = await Rol.create(id=role, nombre=name)
        usuarios[role] = await User.create(
            nombre=name, correo=f"e2e-{role}@example.com" if role == 5 else f"e2e-{role}@example.invalid",
            password=encriptar_contraseña("PruebaTecnico1!") if role == 5 else "no-login",
            rol=rol,
        )
    otro_tecnico = await User.create(
        nombre="Otro técnico", correo="e2e-otro@example.invalid",
        password="no-login", rol_id=usuarios[5].rol_id,
    )
    await Articulos.create(codigo_sku="E2E-MERMAS", nombre="Artículo E2E", stock_actual=30)
    await Articulos.create(codigo_sku="E2E-BAJO", nombre="Artículo bajo E2E", stock_actual=2, stock_minimo=5)
    await Obra.create(
        codigo_obra="E2E-OBRA", nombre_obra="Obra E2E", tipo_servicio="Prueba",
        tecnico_responsable=usuarios[5],
    )
    await Obra.create(
        codigo_obra="E2E-AJENA", nombre_obra="Obra ajena",
        tipo_servicio="Prueba", tecnico_responsable=otro_tecnico,
    )
    await Obra.create(
        codigo_obra="E2E-INACTIVA", nombre_obra="Obra inactiva",
        tipo_servicio="Prueba", tecnico_responsable=usuarios[5], enabled=False,
    )
    yield
    await Tortoise.close_connections()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5188"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)
app.include_router(api_router, prefix="/api/v1")


@app.get("/__test__/login/{role}")
def test_login(role: int, response: Response):
    if role not in (1, 2, 3, 4, 5):
        response.status_code = 404
        return {"error": True}
    response.set_cookie(
        "token", generate_jwt(f"e2e-{role}@example.com" if role == 5 else f"e2e-{role}@example.invalid", role, 15), httponly=True
    )
    return {"error": False}
