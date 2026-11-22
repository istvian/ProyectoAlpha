import asyncio
import unittest
from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

from fastapi import FastAPI
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError
from starlette.requests import Request
from tortoise import Tortoise
from tortoise.exceptions import IntegrityError

from db.db import EnsureCardexImmutability, PrepareMermasUsoInternoSchema
from middlewares.jwt_helper import generate_jwt
from models.ajustes_operativos import Merma, OperacionIdempotente, UsoInterno
from models.cardex_log import CardexLog, TipoMovimiento
from models.obra import Obra
from models.proveedor import Articulos
from models.rol import Rol
from models.user import User
from routes.mermas_routes import MermaCreateSchema, registrar_merma, router as mermas_router
from routes.uso_interno_routes import (
    UsoInternoCreateSchema,
    registrar_uso_interno,
)

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


def crear_solicitud(correo: str) -> Request:
    request = Request(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/api/v1/mermas",
            "raw_path": b"/api/v1/mermas",
            "query_string": b"",
            "headers": [],
            "server": ("test", 80),
            "client": ("test", 1),
        }
    )
    request.state.usuario = correo
    return request


class MermaRouteTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await Tortoise.init(db_url="sqlite://:memory:", modules=MODELOS)
        await Tortoise.generate_schemas()

    async def asyncTearDown(self):
        await Tortoise.close_connections()

    def test_motivo_rechaza_nulo_vacio_o_solo_espacios(self):
        for motivo in (None, "", "   "):
            with self.subTest(motivo=motivo):
                with self.assertRaises(ValidationError):
                    MermaCreateSchema(
                        articulo_id=1,
                        cantidad=1,
                        obra_id=1,
                        motivo=motivo,
                    )

    def test_consumo_interno_rechaza_destino_o_responsable_vacios(self):
        for campo in ("destino_material", "responsable_solicitud"):
            with self.subTest(campo=campo):
                valores = {
                    "articulo_id": 1,
                    "cantidad": 1,
                    "destino_material": "Reparación",
                    "responsable_solicitud": "Jefe de bodega",
                }
                valores[campo] = "   "
                with self.assertRaises(ValidationError):
                    UsoInternoCreateSchema(**valores)

    async def test_registra_merma_y_no_descontara_stock_insuficiente(self):
        rol = await Rol.create(id=2, nombre="Bodega")
        usuario = await User.create(
            nombre="Bodega de prueba",
            correo="bodega@example.invalid",
            password="test-password",
            rol=rol,
        )
        obra = await Obra.create(
            codigo_obra="OBRA-TEST",
            nombre_obra="Obra de prueba",
            tipo_servicio="Prueba",
            tecnico_responsable=usuario,
        )
        articulo = await Articulos.create(
            codigo_sku="MERMA-TEST",
            nombre="Artículo de prueba",
            stock_actual=8,
            precio_medio_ponderado=Decimal("3.50"),
        )
        request = crear_solicitud(usuario.correo)
        respuesta = await registrar_merma(
            MermaCreateSchema(
                articulo_id=articulo.id,
                cantidad=3,
                obra_id=obra.id,
                motivo="  Empaque dañado  ",
            ),
            request,
            uuid4(),
        )

        self.assertEqual(respuesta["data"]["motivo"], "Empaque dañado")
        self.assertEqual(respuesta["data"]["stock_resultante"], 5)
        self.assertEqual(await Merma.all().count(), 1)
        movimiento = await CardexLog.get(
            tipo_movimiento=TipoMovimiento.MERMA
        )
        self.assertEqual(movimiento.cantidad, 3)
        self.assertEqual(movimiento.saldo_resultante, 5)

        with self.assertRaises(HTTPException) as error:
            await registrar_merma(
                MermaCreateSchema(
                    articulo_id=articulo.id,
                    cantidad=6,
                    obra_id=obra.id,
                    motivo="Rotura",
                ),
                request,
                uuid4(),
            )

        self.assertEqual(error.exception.status_code, 400)
        articulo_actualizado = await Articulos.get(id=articulo.id)
        self.assertEqual(articulo_actualizado.stock_actual, 5)
        self.assertEqual(await Merma.all().count(), 1)
        self.assertEqual(await CardexLog.all().count(), 1)

    async def test_registra_uso_interno_y_actualiza_stock_y_cardex(self):
        rol = await Rol.create(id=2, nombre="Bodega")
        usuario = await User.create(
            nombre="Bodega de prueba",
            correo="bodega@example.invalid",
            password="test-password",
            rol=rol,
        )
        articulo = await Articulos.create(
            codigo_sku="USO-TEST",
            nombre="Artículo de uso interno",
            stock_actual=6,
            precio_medio_ponderado=Decimal("2.00"),
        )
        respuesta = await registrar_uso_interno(
            UsoInternoCreateSchema(
                articulo_id=articulo.id,
                cantidad=2,
                destino_material="Mantención de herramientas",
                responsable_solicitud="Jefe de bodega",
            ),
            crear_solicitud(usuario.correo),
            uuid4(),
        )

        self.assertEqual(respuesta["data"]["stock_resultante"], 4)
        articulo_actualizado = await Articulos.get(id=articulo.id)
        self.assertEqual(articulo_actualizado.stock_actual, 4)
        self.assertEqual(await CardexLog.all().count(), 1)
        movimiento = await CardexLog.get(tipo_movimiento=TipoMovimiento.USO_INTERNO)
        self.assertEqual(movimiento.cantidad, 2)
        self.assertEqual(movimiento.saldo_resultante, 4)
        self.assertIn("Mantención de herramientas", movimiento.motivo_justificacion)

    async def test_idempotencia_y_obra_opcional_en_ambos_tipos(self):
        rol = await Rol.create(id=2, nombre="Bodega")
        usuario = await User.create(
            nombre="Bodega", correo="bodega@example.invalid", password="test", rol=rol
        )
        obra = await Obra.create(
            codigo_obra="OB-1", nombre_obra="Obra", tipo_servicio="Prueba",
            tecnico_responsable=usuario,
        )
        articulo = await Articulos.create(nombre="Artículo", stock_actual=10)
        request = crear_solicitud(usuario.correo)
        clave_merma = uuid4()
        merma = MermaCreateSchema(articulo_id=articulo.id, cantidad=2, motivo="Rotura")
        primera = await registrar_merma(merma, request, clave_merma)
        repetida = await registrar_merma(merma, request, clave_merma)
        self.assertEqual(primera, repetida)
        self.assertEqual((await Merma.get(id=primera["data"]["id"])).cardex_id, primera["data"]["cardex_id"])
        self.assertIsNone(primera["data"]["obra_id"])
        with self.assertRaises(HTTPException) as conflicto:
            await registrar_merma(
                merma.model_copy(update={"cantidad": 3}), request, clave_merma
            )
        self.assertEqual(conflicto.exception.status_code, 409)

        clave_uso = uuid4()
        uso = UsoInternoCreateSchema(
            articulo_id=articulo.id, cantidad=3, obra_id=obra.id,
            destino_material="Reparación", responsable_solicitud="Encargado",
        )
        respuesta = await registrar_uso_interno(uso, request, clave_uso)
        self.assertEqual(respuesta, await registrar_uso_interno(uso, request, clave_uso))
        registro = await UsoInterno.get(id=respuesta["data"]["id"])
        self.assertEqual(registro.cardex_id, respuesta["data"]["cardex_id"])
        self.assertEqual(registro.obra_id, obra.id)
        self.assertEqual((await CardexLog.get(id=registro.cardex_id)).obra_id, obra.id)
        self.assertEqual((await Articulos.get(id=articulo.id)).stock_actual, 5)
        self.assertEqual(await CardexLog.all().count(), 2)
        self.assertEqual(await registrar_merma(merma, request, clave_merma), primera)

    async def test_reintentos_concurrentes_y_clave_de_otro_usuario(self):
        rol = await Rol.create(id=2, nombre="Bodega")
        usuario = await User.create(
            nombre="Bodega", correo="bodega@example.invalid", password="test", rol=rol
        )
        otro = await User.create(
            nombre="Otro", correo="otro@example.invalid", password="test", rol=rol
        )
        articulo = await Articulos.create(nombre="Artículo", stock_actual=5)
        body = MermaCreateSchema(articulo_id=articulo.id, cantidad=3, motivo="Rotura")
        clave = uuid4()
        resultados = await asyncio.gather(
            registrar_merma(body, crear_solicitud(usuario.correo), clave),
            registrar_merma(body, crear_solicitud(usuario.correo), clave),
        )
        self.assertEqual(resultados[0], resultados[1])
        self.assertEqual((await Articulos.get(id=articulo.id)).stock_actual, 2)
        self.assertEqual(await CardexLog.all().count(), 1)
        with self.assertRaises(HTTPException) as conflicto:
            await registrar_merma(body, crear_solicitud(otro.correo), clave)
        self.assertEqual(conflicto.exception.status_code, 409)

    async def test_obra_inactiva_y_rollback_tras_error(self):
        rol = await Rol.create(id=2, nombre="Bodega")
        usuario = await User.create(
            nombre="Bodega", correo="bodega@example.invalid", password="test", rol=rol
        )
        obra = await Obra.create(
            codigo_obra="OB-2", nombre_obra="Inactiva", tipo_servicio="Prueba",
            tecnico_responsable=usuario, enabled=False,
        )
        articulo = await Articulos.create(nombre="Artículo", stock_actual=5)
        request = crear_solicitud(usuario.correo)
        for funcion, body in (
            (registrar_merma, MermaCreateSchema(articulo_id=articulo.id, cantidad=1, motivo="Rotura", obra_id=obra.id)),
            (registrar_uso_interno, UsoInternoCreateSchema(articulo_id=articulo.id, cantidad=1, destino_material="Bodega", responsable_solicitud="Encargado", obra_id=obra.id)),
        ):
            with self.assertRaises(HTTPException) as error:
                await funcion(body, request, uuid4())
            self.assertEqual(error.exception.status_code, 404)
        with patch("routes.mermas_routes.Merma.create", side_effect=RuntimeError("fallo")):
            with self.assertRaisesRegex(RuntimeError, "fallo"):
                await registrar_merma(
                    MermaCreateSchema(articulo_id=articulo.id, cantidad=2, motivo="Rotura"),
                    request, uuid4(),
                )
        self.assertEqual((await Articulos.get(id=articulo.id)).stock_actual, 5)
        self.assertEqual(await CardexLog.all().count(), 0)
        self.assertEqual(await OperacionIdempotente.all().count(), 0)

    async def test_vinculo_no_requiere_modificar_cardex_inmutable(self):
        await EnsureCardexImmutability()
        rol = await Rol.create(id=2, nombre="Bodega")
        usuario = await User.create(
            nombre="Bodega", correo="bodega@example.invalid", password="test", rol=rol
        )
        articulo = await Articulos.create(nombre="Artículo", stock_actual=5)
        respuesta = await registrar_merma(
            MermaCreateSchema(articulo_id=articulo.id, cantidad=1, motivo="Rotura"),
            crear_solicitud(usuario.correo), uuid4(),
        )
        cardex_id = respuesta["data"]["cardex_id"]
        self.assertEqual((await Merma.get(id=respuesta["data"]["id"])).cardex_id, cardex_id)
        with self.assertRaises(IntegrityError):
            await CardexLog.filter(id=cardex_id).update(cantidad=4)
        with self.assertRaises(IntegrityError):
            await CardexLog.filter(id=cardex_id).delete()

    async def test_http_exige_clave_y_devuelve_misma_respuesta(self):
        rol = await Rol.create(id=2, nombre="Bodega")
        usuario = await User.create(
            nombre="Bodega", correo="bodega@example.invalid", password="test", rol=rol
        )
        articulo = await Articulos.create(nombre="Artículo", stock_actual=5)
        app = FastAPI()
        app.include_router(mermas_router, prefix="/mermas")
        token = generate_jwt(usuario.correo, rol.id, 15)
        body = {"articulo_id": articulo.id, "cantidad": 2, "motivo": "Rotura"}
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            missing = await client.post("/mermas", json=body, cookies={"token": token})
            self.assertEqual(missing.status_code, 422)
            headers = {"Idempotency-Key": str(uuid4())}
            primera = await client.post("/mermas", json=body, cookies={"token": token}, headers=headers)
            repetida = await client.post("/mermas", json=body, cookies={"token": token}, headers=headers)
            self.assertEqual(primera.status_code, 201)
            self.assertEqual(primera.json(), repetida.json())
            self.assertEqual((await Articulos.get(id=articulo.id)).stock_actual, 3)

    async def test_migracion_preserva_registros_y_acepta_obra_nula(self):
        connection = Tortoise.get_connection("default")
        await connection.execute_script("""
            DROP TABLE mermas;
            DROP TABLE uso_interno;
            CREATE TABLE mermas (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                cantidad INT NOT NULL, motivo VARCHAR(255) NOT NULL,
                fecha TIMESTAMP NOT NULL,
                articulo_id INT NOT NULL REFERENCES articulos(id) ON DELETE RESTRICT,
                obra_id INT NOT NULL REFERENCES obras(id) ON DELETE RESTRICT,
                usuario_id INT NOT NULL REFERENCES user(id) ON DELETE RESTRICT
            );
            CREATE TABLE uso_interno (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                destino_material VARCHAR(255) NOT NULL,
                responsable_solicitud VARCHAR(150) NOT NULL,
                cantidad INT NOT NULL, fecha TIMESTAMP NOT NULL,
                articulo_id INT NOT NULL REFERENCES articulos(id) ON DELETE RESTRICT
            );
        """)
        rol = await Rol.create(id=2, nombre="Bodega")
        usuario = await User.create(nombre="Bodega", correo="bodega@example.invalid", password="test", rol=rol)
        obra = await Obra.create(codigo_obra="OB", nombre_obra="Obra", tipo_servicio="Prueba", tecnico_responsable=usuario)
        articulo = await Articulos.create(nombre="Artículo", stock_actual=5)
        await connection.execute_query(
            "INSERT INTO mermas (cantidad,motivo,fecha,articulo_id,obra_id,usuario_id) VALUES (1,'Rotura','2026-01-01',?,?,?)",
            [articulo.id, obra.id, usuario.id],
        )
        await connection.execute_query(
            "INSERT INTO uso_interno (destino_material,responsable_solicitud,cantidad,fecha,articulo_id) VALUES ('Bodega','Jefe',1,'2026-01-01',?)",
            [articulo.id],
        )
        await PrepareMermasUsoInternoSchema()
        await PrepareMermasUsoInternoSchema()
        self.assertEqual((await Merma.get(id=1)).obra_id, obra.id)
        self.assertIsNone((await Merma.get(id=1)).cardex_id)
        self.assertIsNone((await UsoInterno.get(id=1)).obra_id)
        await Merma.create(articulo=articulo, usuario=usuario, cantidad=1, motivo="Rotura")


if __name__ == "__main__":
    unittest.main()
