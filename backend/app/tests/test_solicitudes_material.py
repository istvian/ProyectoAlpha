import tempfile
import unittest
from pathlib import Path

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from tortoise import Tortoise

from middlewares.jwt_helper import generate_jwt
from models.cardex_log import CardexLog
from models.obra import Obra
from models.proveedor import Articulos
from models.rol import Rol
from models.solicitud_material import SolicitudMaterial
from models.user import User
from routes.solicitudes_material_routes import router
from schemas.roles import Roles
from tests.test_mermas_routes import MODELOS as MODELOS_EXISTENTES

MODELOS = {"models": [*MODELOS_EXISTENTES["models"], "models.solicitud_material"]}


class SolicitudesMaterialTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await Tortoise.init(db_url="sqlite://:memory:", modules=MODELOS)
        await Tortoise.generate_schemas()
        self.bodega = await Rol.create(id=2, nombre="bodega")
        self.usuario = await User.create(
            nombre="Bodega", correo="bodega@example.invalid", password="test", rol=self.bodega
        )
        self.otro = await User.create(
            nombre="Otra bodega", correo="otra@example.invalid", password="test", rol=self.bodega
        )
        self.articulo = await Articulos.create(
            nombre="Guantes", codigo_sku="GUANTES", stock_actual=4, stock_minimo=5
        )
        self.obra = await Obra.create(
            codigo_obra="OB-1", nombre_obra="Obra", tipo_servicio="Prueba",
            tecnico_responsable=self.usuario,
        )
        app = FastAPI()
        app.include_router(router, prefix="/solicitudes-material")
        self.client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
        self.login(self.usuario.correo)

    def login(self, correo, rol=Roles.bodega):
        self.client.cookies.set("token", generate_jwt(correo, rol.value, 15))

    async def asyncTearDown(self):
        await self.client.aclose()
        await Tortoise.close_connections()

    async def test_crea_articulo_existente_y_nuevo_sin_afectar_stock(self):
        existente = await self.client.post("/solicitudes-material", json={
            "articulo_id": self.articulo.id, "cantidad": 3,
            "obra_id": self.obra.id, "motivo": " Reposición ",
        })
        self.assertEqual(existente.status_code, 201, existente.text)
        data = existente.json()["data"]
        self.assertEqual((data["nombre_articulo"], data["obra"], data["motivo"]),
                         ("Guantes", "Obra", "Reposición"))
        self.assertEqual((data["estado"], data["prioridad"], data["tipo_solicitud"]),
                         ("PENDIENTE", "NORMAL", "COMPRA_BODEGA"))
        nuevo = await self.client.post("/solicitudes-material", json={
            "nombre_articulo": " Casco ", "descripcion_articulo": " Azul ",
            "cantidad": 2, "motivo": "Seguridad",
        })
        self.assertEqual(nuevo.status_code, 201, nuevo.text)
        self.assertEqual(nuevo.json()["data"]["nombre_articulo"], "Casco")
        self.assertEqual(nuevo.json()["data"]["descripcion_articulo"], "Azul")
        self.assertIsNone(nuevo.json()["data"]["articulo_id"])
        self.assertIsNone(nuevo.json()["data"]["obra_id"])
        self.assertEqual(await Articulos.all().count(), 1)
        self.assertEqual((await Articulos.get(id=self.articulo.id)).stock_actual, 4)
        self.assertEqual(await CardexLog.all().count(), 0)
        registro = await SolicitudMaterial.get(id=data["id"])
        self.assertEqual(registro.solicitante_id, self.usuario.id)
        self.assertIsNone(registro.revisado_por_id)
        self.assertIsNone(registro.fecha_revision)
        self.assertIsNone(registro.comentario_revision)

    async def test_lista_solo_solicitudes_del_usuario_autenticado(self):
        body = {"articulo_id": self.articulo.id, "cantidad": 1, "motivo": "Falta"}
        primera = await self.client.post("/solicitudes-material", json=body)
        self.login(self.otro.correo)
        segunda = await self.client.post("/solicitudes-material", json=body)
        self.assertEqual(segunda.status_code, 201)
        self.login(self.usuario.correo)
        registro = await SolicitudMaterial.get(id=primera.json()["data"]["id"])
        registro.estado = "RECHAZADA"
        registro.comentario_revision = "Sin presupuesto"
        await registro.save()
        respuesta = await self.client.get("/solicitudes-material")
        self.assertEqual([item["id"] for item in respuesta.json()["data"]], [primera.json()["data"]["id"]])
        self.assertEqual(respuesta.json()["data"][0]["estado"], "RECHAZADA")
        self.assertEqual(respuesta.json()["data"][0]["comentario_revision"], "Sin presupuesto")

    async def test_validacion_y_sin_efectos_secundarios(self):
        base = {"articulo_id": self.articulo.id, "cantidad": 1, "motivo": "Reponer"}
        for cantidad in (0, -1, 1.5, 1.0, True, "2", None, 2147483648):
            with self.subTest(cantidad=cantidad):
                self.assertEqual((await self.client.post("/solicitudes-material", json={**base, "cantidad": cantidad})).status_code, 422)
        for cambio in (
            {"motivo": "  "}, {"articulo_id": None}, {"articulo_id": 2147483648},
            {"nombre_articulo": "Otro"}, {"obra_id": 2147483648},
            {"solicitante_id": self.otro.id}, {"estado": "APROBADA"},
            {"tipo_solicitud": "MATERIAL_TECNICO"}, {"prioridad": "ALTA"},
        ):
            with self.subTest(cambio=cambio):
                self.assertEqual((await self.client.post("/solicitudes-material", json={**base, **cambio})).status_code, 422)
        self.assertEqual((await self.client.post("/solicitudes-material", json={**base, "articulo_id": 999})).status_code, 404)
        await self.obra.update_from_dict({"enabled": False}).save()
        self.assertEqual((await self.client.post("/solicitudes-material", json={**base, "obra_id": self.obra.id})).status_code, 404)
        self.assertEqual(await SolicitudMaterial.all().count(), 0)
        self.assertEqual(await CardexLog.all().count(), 0)
        self.assertEqual((await Articulos.get(id=self.articulo.id)).stock_actual, 4)

    async def test_permisos_y_usuario_deshabilitado(self):
        body = {"articulo_id": self.articulo.id, "cantidad": 1, "motivo": "Falta"}
        for rol in (Roles.finanzas, Roles.supervisor):
            self.login(f"{rol.name}@example.invalid", rol)
            self.assertEqual((await self.client.post("/solicitudes-material", json=body)).status_code, 403)
            self.assertEqual((await self.client.get("/solicitudes-material")).status_code, 403)
        self.login("tecnico@example.invalid", Roles.tecnico)
        self.assertEqual((await self.client.post("/solicitudes-material", json=body)).status_code, 403)
        self.client.cookies.clear()
        self.assertEqual((await self.client.get("/solicitudes-material")).status_code, 401)
        self.login(self.usuario.correo)
        await self.usuario.update_from_dict({"enabled": False}).save()
        self.assertEqual((await self.client.post("/solicitudes-material", json=body)).status_code, 401)
        rol_admin = await Rol.create(id=Roles.admin.value, nombre="admin")
        admin = await User.create(nombre="Admin", correo="admin@example.invalid", password="test", rol=rol_admin)
        self.login(admin.correo, Roles.admin)
        self.assertEqual((await self.client.post("/solicitudes-material", json=body)).status_code, 201)
        self.assertEqual((await self.client.get("/solicitudes-material")).status_code, 200)


class SolicitudesSQLiteTests(unittest.IsolatedAsyncioTestCase):
    async def test_esquema_se_agrega_a_base_existente_sin_perder_datos(self):
        with tempfile.TemporaryDirectory() as carpeta:
            db_url = f"sqlite://{Path(carpeta) / 'existente.sqlite3'}"
            try:
                await Tortoise.init(db_url=db_url, modules=MODELOS_EXISTENTES)
                await Tortoise.generate_schemas()
                articulo = await Articulos.create(nombre="Preexistente", stock_actual=7)
                await Tortoise.close_connections()
                await Tortoise.init(db_url=db_url, modules=MODELOS)
                await Tortoise.generate_schemas(safe=True)
                await Tortoise.generate_schemas(safe=True)
                self.assertEqual((await Articulos.get(id=articulo.id)).stock_actual, 7)
                columnas = await Tortoise.get_connection("default").execute_query_dict(
                    'PRAGMA table_info("solicitudes_material")'
                )
                self.assertTrue({
                    "tipo_solicitud", "prioridad", "estado", "revisado_por_id",
                    "fecha_revision", "comentario_revision",
                }.issubset({columna["name"] for columna in columnas}))
            finally:
                await Tortoise.close_connections()
