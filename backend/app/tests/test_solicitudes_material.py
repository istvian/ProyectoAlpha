import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from tortoise import Tortoise
from tortoise.transactions import in_transaction

from middlewares.jwt_helper import generate_jwt
from db.db import PrepareSolicitudesMaterialItemsSchema
from models.cardex_log import CardexLog
from models.obra import Obra
from models.proveedor import Articulos
from models.rol import Rol
from models.solicitud_material import SolicitudMaterial, SolicitudMaterialItem
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
            "items": [
                {"articulo_id": self.articulo.id, "cantidad": 3},
                {"nombre_articulo": " Casco ", "descripcion_articulo": " Azul ", "cantidad": 2},
            ],
            "obra_id": self.obra.id, "motivo": " Reposición ",
        })
        self.assertEqual(existente.status_code, 201, existente.text)
        data = existente.json()["data"]
        self.assertEqual((data["items"][0]["nombre_articulo"], data["obra"], data["motivo"]),
                         ("Guantes", "Obra", "Reposición"))
        self.assertEqual((data["estado"], data["prioridad"], data["tipo_solicitud"]),
                         ("PENDIENTE", "NORMAL", "COMPRA_BODEGA"))
        self.assertEqual(len(data["items"]), 2)
        self.assertEqual(data["items"][1]["nombre_articulo"], "Casco")
        self.assertEqual(data["items"][1]["descripcion_articulo"], "Azul")
        self.assertIsNone(data["items"][1]["articulo_id"])
        self.assertEqual(await Articulos.all().count(), 1)
        self.assertEqual((await Articulos.get(id=self.articulo.id)).stock_actual, 4)
        self.assertEqual(await CardexLog.all().count(), 0)
        registro = await SolicitudMaterial.get(id=data["id"])
        self.assertEqual(registro.solicitante_id, self.usuario.id)
        self.assertIsNone(registro.revisado_por_id)
        self.assertIsNone(registro.fecha_revision)
        self.assertIsNone(registro.comentario_revision)

    async def test_lista_solo_solicitudes_del_usuario_autenticado(self):
        body = {"items": [{"articulo_id": self.articulo.id, "cantidad": 1}], "motivo": "Falta"}
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
        self.assertEqual(respuesta.json()["data"][0]["items"][0]["articulo_id"], self.articulo.id)

    async def test_validacion_y_sin_efectos_secundarios(self):
        item = {"articulo_id": self.articulo.id, "cantidad": 1}
        base = {"items": [item], "motivo": "Reponer"}
        for cantidad in (0, -1, 1.5, 1.0, True, "2", None, 2147483648):
            with self.subTest(cantidad=cantidad):
                self.assertEqual((await self.client.post("/solicitudes-material", json={**base, "items": [{**item, "cantidad": cantidad}]})).status_code, 422)
        for cambio in (
            {"motivo": "  "}, {"items": []}, {"items": [{**item, "articulo_id": None}]},
            {"items": [{**item, "articulo_id": 2147483648}]},
            {"items": [{**item, "nombre_articulo": "Otro"}]},
            {"items": [item, item]}, {"obra_id": 2147483648},
            {"solicitante_id": self.otro.id}, {"estado": "APROBADA"},
            {"tipo_solicitud": "MATERIAL_TECNICO"}, {"prioridad": "ALTA"},
        ):
            with self.subTest(cambio=cambio):
                self.assertEqual((await self.client.post("/solicitudes-material", json={**base, **cambio})).status_code, 422)
        self.assertEqual((await self.client.post("/solicitudes-material", json={"motivo": "Sin items"})).status_code, 422)
        self.assertEqual((await self.client.post("/solicitudes-material", json={**base, "items": [item, {"articulo_id": 999, "cantidad": 1}]})).status_code, 404)
        await self.obra.update_from_dict({"enabled": False}).save()
        self.assertEqual((await self.client.post("/solicitudes-material", json={**base, "obra_id": self.obra.id})).status_code, 404)
        self.assertEqual(await SolicitudMaterial.all().count(), 0)
        self.assertEqual(await SolicitudMaterialItem.all().count(), 0)
        self.assertEqual(await CardexLog.all().count(), 0)
        self.assertEqual((await Articulos.get(id=self.articulo.id)).stock_actual, 4)

    async def test_permisos_y_usuario_deshabilitado(self):
        body = {"items": [{"articulo_id": self.articulo.id, "cantidad": 1}], "motivo": "Falta"}
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

    async def test_error_al_guardar_un_item_revierte_toda_la_solicitud(self):
        crear_item = SolicitudMaterialItem.create
        intentos = 0

        async def crear_con_fallo(*args, **kwargs):
            nonlocal intentos
            intentos += 1
            if intentos == 2:
                raise RuntimeError("Fallo de escritura simulado")
            return await crear_item(*args, **kwargs)

        with patch.object(SolicitudMaterialItem, "create", side_effect=crear_con_fallo):
            with self.assertRaisesRegex(RuntimeError, "Fallo de escritura simulado"):
                await self.client.post("/solicitudes-material", json={
                    "motivo": "Reposición",
                    "items": [
                        {"articulo_id": self.articulo.id, "cantidad": 1},
                        {"nombre_articulo": "Casco", "cantidad": 2},
                    ],
                })
        self.assertEqual(intentos, 2)
        self.assertEqual(await SolicitudMaterial.all().count(), 0)
        self.assertEqual(await SolicitudMaterialItem.all().count(), 0)
        self.assertEqual((await Articulos.get(id=self.articulo.id)).stock_actual, 4)
        self.assertEqual(await CardexLog.all().count(), 0)


class SolicitudesSQLiteTests(unittest.IsolatedAsyncioTestCase):
    async def test_migra_solicitudes_anteriores_atomica_e_idempotentemente(self):
        with tempfile.TemporaryDirectory() as carpeta:
            db_url = f"sqlite://{Path(carpeta) / 'anterior.sqlite3'}"
            try:
                await Tortoise.init(db_url=db_url, modules=MODELOS_EXISTENTES)
                await Tortoise.generate_schemas()
                bodega = await Rol.create(id=2, nombre="bodega")
                finanzas = await Rol.create(id=3, nombre="finanzas")
                usuario = await User.create(nombre="Bodega", correo="b@example.invalid", password="test", rol=bodega)
                revisor = await User.create(nombre="Finanzas", correo="f@example.invalid", password="test", rol=finanzas)
                articulo = await Articulos.create(nombre="Guantes actuales", codigo_sku="G", stock_actual=7)
                conn = Tortoise.get_connection("default")
                await conn.execute_query(
                    'CREATE TABLE "solicitudes_material" ('
                    '"id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, '
                    '"tipo_solicitud" VARCHAR(16) NOT NULL, "prioridad" VARCHAR(6) NOT NULL, '
                    '"estado" VARCHAR(9) NOT NULL, "nombre_articulo" VARCHAR(150) NOT NULL, '
                    '"descripcion_articulo" VARCHAR(255), "cantidad" INT NOT NULL, '
                    '"motivo" TEXT NOT NULL, "fecha_creacion" TIMESTAMP NOT NULL, '
                    '"fecha_revision" TIMESTAMP, "comentario_revision" TEXT, '
                    '"articulo_id" INT REFERENCES "articulos" ("id") ON DELETE RESTRICT, '
                    '"obra_id" INT REFERENCES "obras" ("id") ON DELETE RESTRICT, '
                    '"revisado_por_id" INT REFERENCES "user" ("id") ON DELETE RESTRICT, '
                    '"solicitante_id" INT NOT NULL REFERENCES "user" ("id") ON DELETE RESTRICT)'
                )
                await conn.execute_query(
                    'INSERT INTO "solicitudes_material" '
                    '(id, tipo_solicitud, prioridad, estado, nombre_articulo, descripcion_articulo, '
                    'cantidad, motivo, fecha_creacion, fecha_revision, comentario_revision, articulo_id, '
                    'revisado_por_id, solicitante_id) VALUES '
                    "(1, 'COMPRA_BODEGA', 'NORMAL', 'APROBADA', 'Guantes históricos', 'Original', "
                    "3, 'Reposición', '2026-01-01 12:00:00+00:00', '2026-01-02 12:00:00+00:00', "
                    "'Aprobado', ?, ?, ?)",
                    [articulo.id, revisor.id, usuario.id],
                )
                await conn.execute_query(
                    'INSERT INTO "solicitudes_material" '
                    '(id, tipo_solicitud, prioridad, estado, nombre_articulo, descripcion_articulo, '
                    'cantidad, motivo, fecha_creacion, solicitante_id) VALUES '
                    "(2, 'MATERIAL_TECNICO', 'ALTA', 'PENDIENTE', 'Material no catalogado', "
                    "'Cable especial', 5, 'Terreno', '2026-01-03 12:00:00+00:00', ?)",
                    [usuario.id],
                )
                await conn.execute_query("UPDATE sqlite_sequence SET seq=20 WHERE name='solicitudes_material'")
                await conn.execute_query('CREATE INDEX "idx_estado_solicitudes" ON "solicitudes_material" ("estado")')
                await conn.execute_query('CREATE INDEX "idx_legacy_nombre" ON "solicitudes_material" ("nombre_articulo")')

                with self.assertRaisesRegex(RuntimeError, "índice o trigger"):
                    await PrepareSolicitudesMaterialItemsSchema()
                await conn.execute_query('DROP INDEX "idx_legacy_nombre"')

                class TransaccionConFallo:
                    async def __aenter__(self):
                        self.contexto = in_transaction()
                        self.transaccion = await self.contexto.__aenter__()
                        return self

                    async def __aexit__(self, *args):
                        return await self.contexto.__aexit__(*args)

                    async def execute_query(self, sql, values=None):
                        if sql.startswith('CREATE TABLE "solicitudes_material_items"'):
                            raise RuntimeError("Fallo simulado durante la migración")
                        return await self.transaccion.execute_query(sql, values)

                with patch("db.db.in_transaction", return_value=TransaccionConFallo()):
                    with self.assertRaisesRegex(RuntimeError, "Fallo simulado"):
                        await PrepareSolicitudesMaterialItemsSchema()
                originales = await conn.execute_query_dict('SELECT id, nombre_articulo FROM "solicitudes_material" ORDER BY id')
                self.assertEqual([row["nombre_articulo"] for row in originales], ["Guantes históricos", "Material no catalogado"])
                self.assertEqual(await conn.execute_query_dict(
                    "SELECT name FROM sqlite_master WHERE name='solicitudes_material_items'"
                ), [])
                await Tortoise.close_connections()

                await Tortoise.init(db_url=db_url, modules=MODELOS)
                await PrepareSolicitudesMaterialItemsSchema()
                await Tortoise.generate_schemas(safe=True)
                await PrepareSolicitudesMaterialItemsSchema()
                conn = Tortoise.get_connection("default")
                self.assertEqual(await conn.execute_query_dict("PRAGMA foreign_key_check"), [])
                self.assertTrue(await conn.execute_query_dict(
                    "SELECT name FROM sqlite_master WHERE name='idx_estado_solicitudes'"
                ))
                registros = await SolicitudMaterial.all().order_by("id")
                self.assertEqual([(r.id, r.estado.value, r.revisado_por_id, r.comentario_revision) for r in registros],
                                 [(1, "APROBADA", revisor.id, "Aprobado"), (2, "PENDIENTE", None, None)])
                items = await SolicitudMaterialItem.all().order_by("solicitud_id")
                self.assertEqual([(i.solicitud_id, i.articulo_id, i.nombre_articulo, i.descripcion_articulo, i.cantidad) for i in items],
                                 [(1, articulo.id, "Guantes históricos", "Original", 3),
                                  (2, None, "Material no catalogado", "Cable especial", 5)])
                self.assertEqual((await Articulos.get(id=articulo.id)).stock_actual, 7)
                self.assertEqual(await CardexLog.all().count(), 0)
                self.assertEqual((await conn.execute_query_dict(
                    "SELECT seq FROM sqlite_sequence WHERE name='solicitudes_material'"
                ))[0]["seq"], 20)
                app = FastAPI()
                app.include_router(router, prefix="/solicitudes-material")
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    client.cookies.set("token", generate_jwt(usuario.correo, Roles.bodega.value, 15))
                    lista = await client.get("/solicitudes-material")
                    self.assertEqual(lista.status_code, 200, lista.text)
                    self.assertEqual({s["id"]: s["items"][0]["cantidad"] for s in lista.json()["data"]}, {1: 3, 2: 5})
                    nueva = await client.post("/solicitudes-material", json={
                        "items": [{"nombre_articulo": "Nuevo", "cantidad": 1}], "motivo": "Prueba",
                    })
                    self.assertEqual(nueva.status_code, 201, nueva.text)
                    self.assertGreater(nueva.json()["data"]["id"], 20)
                    client.cookies.set("token", generate_jwt(revisor.correo, Roles.finanzas.value, 15))
                    revision = await client.post("/solicitudes-material/2/aprobar", json={})
                    self.assertEqual(revision.status_code, 200, revision.text)
                    self.assertEqual(revision.json()["data"]["items"][0]["descripcion_articulo"], "Cable especial")
                    self.assertEqual(revision.json()["data"]["revisado_por_id"], revisor.id)
            finally:
                await Tortoise.close_connections()

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
