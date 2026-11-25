import os
import sys

BACKEND_APP = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "backend", "app")
)
if BACKEND_APP not in sys.path:
    sys.path.insert(0, BACKEND_APP)

import pytest

MODELOS = {
    "models": [
        "models.user",
        "models.rol",
        "models.proveedor",
        "models.egreso",
        "models.cliente",
        "models.obra",
        "models.cardex_log",
        "models.ajustes_operativos",
        "models.recepcion_compra",
        "models.conteo_inventario",
    ]
}


@pytest.fixture
async def db():
    from tortoise import Tortoise

    await Tortoise.init(db_url="sqlite://:memory:", modules=MODELOS)
    await Tortoise.generate_schemas()
    yield
    await Tortoise.close_connections()


def make_request(correo: str, path: str = "/", method: str = "POST"):
    from starlette.requests import Request

    request = Request(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": method,
            "scheme": "http",
            "path": path,
            "raw_path": path.encode(),
            "query_string": b"",
            "headers": [],
            "server": ("test", 80),
            "client": ("test", 1),
        }
    )
    request.state.usuario = correo
    return request
