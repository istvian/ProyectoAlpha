import asyncio
import unittest

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from tortoise import Tortoise

from middlewares.jwt_helper import generate_jwt
from models.cardex_log import CardexLog
from models.obra import Obra
from models.proveedor import Articulos
from models.recepcion_compra import OrdenCompra
from models.rol import Rol
from models.solicitud_material import SolicitudMaterial
from models.user import User
from routes.solicitudes_material_routes import router
from schemas.roles import Roles
from tests.test_solicitudes_material import MODELOS


class SolicitudesFinanzasTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await Tortoise.init(db_url="sqlite://:memory:", modules=MODELOS)
        await Tortoise.generate_schemas()
        self.usuarios = {}
        for rol in (Roles.admin, Roles.bodega, Roles.finanzas, Roles.supervisor, Roles.tecnico):
            registro = await Rol.create(id=rol.value, nombre=rol.name)
            self.usuarios[rol] = await User.create(
                nombre=rol.name, correo=f"{rol.name}@example.invalid", password="test", rol=registro,
            )
        self.otro = await User.create(
            nombre="Otra bodega", correo="otro@example.invalid", password="test",
            rol_id=Roles.bodega.value,
        )
        self.articulo = await Articulos.create(nombre="Guantes", codigo_sku="G", stock_actual=4)
        self.obra = await Obra.create(
            codigo_obra="A", nombre_obra="Obra", tipo_servicio="Prueba",
            tecnico_responsable=self.usuarios[Roles.tecnico],
        )
        app = FastAPI()
        app.include_router(router, prefix="/solicitudes-material")
        self.client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")

    def login(self, usuario, rol):
        self.client.cookies.set("token", generate_jwt(usuario.correo, rol.value, 15))

    async def crear_solicitudes(self):
        self.login(self.usuarios[Roles.bodega], Roles.bodega)
        compra = await self.client.post("/solicitudes-material", json={
            "items": [{"articulo_id": self.articulo.id, "cantidad": 2},
                      {"nombre_articulo": "Casco", "cantidad": 1}], "motivo": "Reposición",
        })
        self.assertEqual(compra.status_code, 201, compra.text)
        self.login(self.usuarios[Roles.tecnico], Roles.tecnico)
        material = await self.client.post("/solicitudes-material/tecnico", json={
            "obra_id": self.obra.id, "items": [
                {"descripcion_articulo": "Cable especial", "cantidad": 3},
                {"articulo_id": self.articulo.id, "cantidad": 1},
            ], "prioridad": "ALTA", "motivo": "Instalación",
        })
        self.assertEqual(material.status_code, 201, material.text)
        return compra.json()["data"]["id"], material.json()["data"]["id"]

    async def asyncTearDown(self):
        await self.client.aclose()
        await Tortoise.close_connections()

    async def test_decisiones_filtros_historial_e_integridad(self):
        compra, material = await self.crear_solicitudes()
        stock = (await Articulos.get(id=self.articulo.id)).stock_actual
        cardex = await CardexLog.all().count()
        ordenes = await OrdenCompra.all().count()
        self.login(self.usuarios[Roles.finanzas], Roles.finanzas)
        lista = await self.client.get("/solicitudes-material/finanzas")
        self.assertEqual({s["id"] for s in lista.json()["data"]}, {compra, material})
        tecnico = next(s for s in lista.json()["data"] if s["id"] == material)
        self.assertEqual(tecnico["solicitante_nombre"], "tecnico")
        self.assertEqual(tecnico["items"][0]["descripcion_articulo"], "Cable especial")
        self.assertEqual(len(tecnico["items"]), 2)
        self.assertEqual(tecnico["obra"], "Obra")
        filtrada = await self.client.get("/solicitudes-material/finanzas", params={
            "estado": "PENDIENTE", "tipo_solicitud": "MATERIAL_TECNICO",
        })
        self.assertEqual([s["id"] for s in filtrada.json()["data"]], [material])
        self.assertEqual((await self.client.get("/solicitudes-material/finanzas?estado=OTRO")).status_code, 422)
        self.assertEqual((await self.client.get("/solicitudes-material/finanzas?tipo_solicitud=OTRO")).status_code, 422)

        aprobada = await self.client.post(f"/solicitudes-material/{compra}/aprobar", json={
            "comentario_revision": " Aprobado para gestionar ",
        })
        self.assertEqual(aprobada.status_code, 200, aprobada.text)
        data = aprobada.json()["data"]
        self.assertEqual((data["estado"], data["revisado_por_id"], data["revisado_por_nombre"]),
                         ("APROBADA", self.usuarios[Roles.finanzas].id, "finanzas"))
        self.assertEqual(data["comentario_revision"], "Aprobado para gestionar")
        self.assertIsNotNone(data["fecha_revision"])
        self.assertEqual([item["nombre_articulo"] for item in data["items"]], ["Guantes", "Casco"])
        rechazada = await self.client.post(f"/solicitudes-material/{material}/rechazar", json={
            "comentario_revision": "Sin presupuesto",
        })
        self.assertEqual(rechazada.status_code, 200, rechazada.text)
        self.assertEqual(rechazada.json()["data"]["estado"], "RECHAZADA")
        self.assertEqual(len(rechazada.json()["data"]["items"]), 2)
        for estado, esperado in (("PENDIENTE", []), ("APROBADA", [compra]), ("RECHAZADA", [material])):
            respuesta = await self.client.get("/solicitudes-material/finanzas", params={"estado": estado})
            self.assertEqual([s["id"] for s in respuesta.json()["data"]], esperado)
        for usuario, rol, esperado, decision, comentario in (
            (self.usuarios[Roles.bodega], Roles.bodega, compra, "APROBADA", "Aprobado para gestionar"),
            (self.usuarios[Roles.tecnico], Roles.tecnico, material, "RECHAZADA", "Sin presupuesto"),
        ):
            self.login(usuario, rol)
            mis = (await self.client.get("/solicitudes-material")).json()["data"]
            self.assertEqual([s["id"] for s in mis], [esperado])
            self.assertEqual((mis[0]["estado"], mis[0]["revisado_por_nombre"], mis[0]["comentario_revision"]),
                             (decision, "finanzas", comentario))
            self.assertEqual(len(mis[0]["items"]), 2)
        self.login(self.otro, Roles.bodega)
        self.assertEqual((await self.client.get("/solicitudes-material")).json()["data"], [])
        self.assertEqual((await Articulos.get(id=self.articulo.id)).stock_actual, stock)
        self.assertEqual(await CardexLog.all().count(), cardex)
        self.assertEqual(await OrdenCompra.all().count(), ordenes)

    async def test_permisos_y_usuario_real(self):
        compra, _ = await self.crear_solicitudes()
        for rol in (Roles.bodega, Roles.tecnico, Roles.supervisor):
            self.login(self.usuarios[rol], rol)
            self.assertEqual((await self.client.get("/solicitudes-material/finanzas")).status_code, 403)
            for accion in ("aprobar", "rechazar"):
                self.assertEqual((await self.client.post(
                    f"/solicitudes-material/{compra}/{accion}", json={"comentario_revision": "Motivo"}
                )).status_code, 403)
        self.client.cookies.clear()
        self.assertEqual((await self.client.get("/solicitudes-material/finanzas")).status_code, 401)
        self.assertEqual((await self.client.post(f"/solicitudes-material/{compra}/aprobar", json={})).status_code, 401)
        self.login(self.usuarios[Roles.finanzas], Roles.finanzas)
        await self.usuarios[Roles.finanzas].update_from_dict({"enabled": False}).save()
        self.assertEqual((await self.client.get("/solicitudes-material/finanzas")).status_code, 401)
        self.assertEqual((await self.client.post(f"/solicitudes-material/{compra}/aprobar", json={})).status_code, 401)
        self.login(self.usuarios[Roles.admin], Roles.admin)
        self.assertEqual((await self.client.get("/solicitudes-material/finanzas")).status_code, 200)
        respuesta = await self.client.post(f"/solicitudes-material/{compra}/aprobar", json={})
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()["data"]["revisado_por_id"], self.usuarios[Roles.admin].id)

    async def test_validacion_conflictos_y_concurrencia(self):
        compra, material = await self.crear_solicitudes()
        self.login(self.usuarios[Roles.finanzas], Roles.finanzas)
        for comentario in ("", "  ", None):
            respuesta = await self.client.post(
                f"/solicitudes-material/{compra}/rechazar", json={"comentario_revision": comentario},
            )
            self.assertEqual(respuesta.status_code, 422)
        for cuerpo in ({"revisado_por_id": 1}, {"estado": "RECHAZADA"}, {"comentario_revision": 5}):
            self.assertEqual((await self.client.post(f"/solicitudes-material/{compra}/aprobar", json=cuerpo)).status_code, 422)
        self.assertEqual((await self.client.post("/solicitudes-material/9999/aprobar", json={})).status_code, 404)
        respuestas = await asyncio.gather(
            self.client.post(f"/solicitudes-material/{compra}/aprobar", json={}),
            self.client.post(f"/solicitudes-material/{compra}/rechazar", json={"comentario_revision": "Motivo"}),
        )
        self.assertEqual(sorted(r.status_code for r in respuestas), [200, 409])
        registro = await SolicitudMaterial.get(id=compra)
        estado = registro.estado
        self.assertIn(estado, ("APROBADA", "RECHAZADA"))
        self.assertEqual((await self.client.post(f"/solicitudes-material/{compra}/aprobar", json={})).status_code, 409)
        self.assertEqual((await SolicitudMaterial.get(id=compra)).estado, estado)
        self.assertEqual((await SolicitudMaterial.get(id=material)).estado, "PENDIENTE")
