import unittest

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
from routes.obras_routes import router as obras_router
from routes.finanzas_routes import router as finanzas_router
from routes.solicitudes_material_routes import router
from schemas.roles import Roles
from tests.test_solicitudes_material import MODELOS


class SolicitudesTecnicoTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await Tortoise.init(db_url="sqlite://:memory:", modules=MODELOS)
        await Tortoise.generate_schemas()
        roles = {}
        for rol in (Roles.admin, Roles.bodega, Roles.finanzas, Roles.supervisor, Roles.tecnico):
            roles[rol] = await Rol.create(id=rol.value, nombre=rol.name)
        self.usuarios = {}
        for rol in roles:
            self.usuarios[rol] = await User.create(
                nombre=rol.name, correo=f"{rol.name}@example.invalid",
                password="test", rol=roles[rol],
            )
        self.otro = await User.create(nombre="Otro", correo="otro@example.invalid", password="test", rol=roles[Roles.tecnico])
        self.inactivo = await User.create(nombre="Inactivo", correo="inactivo@example.invalid", password="test", rol=roles[Roles.tecnico], enabled=False)
        self.tecnico = self.usuarios[Roles.tecnico]
        self.obra = await Obra.create(codigo_obra="A", nombre_obra="Asignada", tipo_servicio="Prueba", tecnico_responsable=self.tecnico)
        self.obra_inactiva = await Obra.create(codigo_obra="I", nombre_obra="Inactiva", tipo_servicio="Prueba", tecnico_responsable=self.tecnico, enabled=False)
        self.obra_ajena = await Obra.create(codigo_obra="B", nombre_obra="Ajena", tipo_servicio="Prueba", tecnico_responsable=self.otro)
        self.articulo = await Articulos.create(nombre="Guantes", codigo_sku="GUANTES", stock_actual=4, stock_minimo=5)
        app = FastAPI()
        app.include_router(router, prefix="/solicitudes-material")
        app.include_router(obras_router, prefix="/obras")
        app.include_router(finanzas_router, prefix="/finanzas")
        self.client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
        self.login(self.tecnico, Roles.tecnico)

    def login(self, usuario, rol):
        self.client.cookies.set("token", generate_jwt(usuario.correo, rol.value, 15))

    async def asyncTearDown(self):
        await self.client.aclose()
        await Tortoise.close_connections()

    async def test_contexto_solo_obras_propias_activas_y_catalogo(self):
        respuesta = await self.client.get("/solicitudes-material/tecnico/contexto")
        self.assertEqual(respuesta.status_code, 200)
        datos = respuesta.json()["data"]
        self.assertEqual([obra["id"] for obra in datos["obras"]], [self.obra.id])
        self.assertEqual(datos["articulos"], [{"id": self.articulo.id, "codigo_sku": "GUANTES", "nombre": "Guantes"}])

    async def test_crea_solicitudes_y_lista_solo_las_propias_sin_movimientos(self):
        base = {"obra_id": self.obra.id, "motivo": " Trabajo ", "prioridad": "ALTA"}
        existente = await self.client.post("/solicitudes-material/tecnico", json={**base, "items": [
            {"articulo_id": self.articulo.id, "cantidad": 2},
            {"descripcion_articulo": " Material especial ", "cantidad": 3},
        ]})
        self.assertEqual(existente.status_code, 201, existente.text)
        data = existente.json()["data"]
        self.assertEqual((data["tipo_solicitud"], data["estado"], data["prioridad"], data["motivo"]),
                         ("MATERIAL_TECNICO", "PENDIENTE", "ALTA", "Trabajo"))
        self.assertEqual(len(data["items"]), 2)
        self.assertEqual(data["items"][1]["descripcion_articulo"], "Material especial")
        self.assertIsNone(data["items"][1]["articulo_id"])
        self.login(self.otro, Roles.tecnico)
        ajena = await self.client.post("/solicitudes-material/tecnico", json={**base, "obra_id": self.obra_ajena.id, "items": [{"articulo_id": self.articulo.id, "cantidad": 1}]})
        self.assertEqual(ajena.status_code, 201)
        self.login(self.tecnico, Roles.tecnico)
        lista = (await self.client.get("/solicitudes-material")).json()["data"]
        self.assertEqual({item["id"] for item in lista}, {data["id"]})
        self.assertEqual(len(lista[0]["items"]), 2)
        self.assertEqual((await SolicitudMaterial.get(id=data["id"])).solicitante_id, self.tecnico.id)
        self.assertEqual((await Articulos.get(id=self.articulo.id)).stock_actual, 4)
        self.assertEqual(await Articulos.all().count(), 1)
        self.assertEqual(await CardexLog.all().count(), 0)

    async def test_rechaza_obras_no_asignadas_y_entradas_invalidas(self):
        item = {"articulo_id": self.articulo.id, "cantidad": 1}
        base = {"obra_id": self.obra.id, "motivo": "Necesario", "prioridad": "NORMAL", "items": [item]}
        for obra in (self.obra_inactiva, self.obra_ajena):
            self.assertEqual((await self.client.post("/solicitudes-material/tecnico", json={**base, "obra_id": obra.id})).status_code, 404)
        for cambio in (
            {"obra_id": None}, {"items": []}, {"items": [{**item, "cantidad": 0}]},
            {"items": [{**item, "cantidad": 1.5}]}, {"items": [{**item, "cantidad": True}]},
            {"prioridad": "URGENTE"}, {"motivo": "  "},
            {"items": [{**item, "articulo_id": None}]},
            {"items": [{**item, "descripcion_articulo": "Ambos"}]}, {"items": [item, item]},
            {"solicitante_id": self.otro.id}, {"estado": "APROBADA"},
        ):
            with self.subTest(cambio=cambio):
                self.assertEqual((await self.client.post("/solicitudes-material/tecnico", json={**base, **cambio})).status_code, 422)
        self.assertEqual((await self.client.post("/solicitudes-material/tecnico", json={**base, "items": [item, {"articulo_id": 999, "cantidad": 1}]})).status_code, 404)
        self.assertEqual(await SolicitudMaterial.all().count(), 0)
        self.assertEqual(await CardexLog.all().count(), 0)

    async def test_permisos_y_cuenta_deshabilitada(self):
        base = {"obra_id": self.obra.id, "motivo": "Necesario", "prioridad": "BAJA", "items": [{"articulo_id": self.articulo.id, "cantidad": 1}]}
        for rol in (Roles.bodega, Roles.finanzas, Roles.supervisor):
            self.login(self.usuarios[rol], rol)
            self.assertEqual((await self.client.get("/solicitudes-material/tecnico/contexto")).status_code, 403)
            self.assertEqual((await self.client.post("/solicitudes-material/tecnico", json=base)).status_code, 403)
        self.login(self.usuarios[Roles.admin], Roles.admin)
        self.assertEqual((await self.client.get("/solicitudes-material/tecnico/contexto")).status_code, 401)
        self.client.cookies.clear()
        self.assertEqual((await self.client.get("/solicitudes-material/tecnico/contexto")).status_code, 401)
        self.login(self.inactivo, Roles.tecnico)
        self.assertEqual((await self.client.post("/solicitudes-material/tecnico", json=base)).status_code, 401)
        self.assertEqual((await self.client.get("/solicitudes-material")).status_code, 401)

    async def test_finanzas_solo_asigna_tecnicos_habilitados_en_creacion_y_edicion(self):
        self.login(self.usuarios[Roles.finanzas], Roles.finanzas)
        base = {
            "id": self.obra.id, "codigo_obra": self.obra.codigo_obra,
            "nombre_obra": "Asignada", "tipo_servicio": "Prueba",
            "enabled": True, "fecha_creacion": "2026-01-01",
        }
        for usuario in (self.inactivo, self.usuarios[Roles.bodega]):
            for metodo in ("post", "patch"):
                with self.subTest(usuario=usuario.correo, metodo=metodo):
                    respuesta = await getattr(self.client, metodo)("/obras", json={**base, "tecnico_responsable_mail": usuario.correo})
                    self.assertTrue(respuesta.json()["error"])
                    self.assertEqual((await Obra.get(id=self.obra.id)).tecnico_responsable_id, self.tecnico.id)
        tecnicos = (await self.client.get("/finanzas/tecnicos")).json()["data"]
        self.assertEqual({tecnico["id"] for tecnico in tecnicos}, {self.tecnico.id, self.otro.id})
        creada = await self.client.post("/obras", json={**base, "tecnico_responsable_mail": self.otro.correo})
        self.assertFalse(creada.json()["error"])
        respuesta = await self.client.patch("/obras", json={**base, "tecnico_responsable_mail": self.otro.correo})
        self.assertFalse(respuesta.json()["error"])
        self.login(self.tecnico, Roles.tecnico)
        self.assertEqual((await self.client.get("/solicitudes-material/tecnico/contexto")).json()["data"]["obras"], [])
        intento = await self.client.post("/solicitudes-material/tecnico", json={
            "obra_id": self.obra.id, "motivo": "Necesario",
            "prioridad": "NORMAL", "items": [{"articulo_id": self.articulo.id, "cantidad": 1}],
        })
        self.assertEqual(intento.status_code, 404)
