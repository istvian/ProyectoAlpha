import unittest

from starlette.requests import Request
from tortoise import Tortoise

from db.db import PrepareLegacyConteoSchema
from models.proveedor import Articulos
from models.conteo_inventario import (
    ConteoInventario,
    DetalleConteoInventario,
)
from models.rol import Rol
from models.user import User
from routes.conteo_inventario_routes import (
    ConteoCreateSchema,
    DetalleConteoSchema,
    crear_conteo,
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


class ConteoInventarioSchemaTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await Tortoise.init(db_url="sqlite://:memory:", modules=MODELOS)
        await Tortoise.generate_schemas()
        self.connection = Tortoise.get_connection("default")

    async def asyncTearDown(self):
        await Tortoise.close_connections()

    def crear_solicitud(self, correo: str) -> Request:
        request = Request(
            {
                "type": "http",
                "asgi": {"version": "3.0"},
                "http_version": "1.1",
                "method": "POST",
                "scheme": "http",
                "path": "/api/v1/inventario/conteos",
                "raw_path": b"/api/v1/inventario/conteos",
                "query_string": b"",
                "headers": [],
                "server": ("test", 80),
                "client": ("test", 1),
            }
        )
        request.state.usuario = correo
        return request

    async def test_modelo_crea_las_tablas_y_columnas_solicitadas(self):
        self.assertEqual(ConteoInventario._meta.db_table, "toma_inventario")
        self.assertEqual(
            DetalleConteoInventario._meta.db_table,
            "detalle_toma_inventario",
        )

        toma_columns = {
            row["name"]
            for row in await self.connection.execute_query_dict(
                'PRAGMA table_info("toma_inventario")'
            )
        }
        detalle_columns = {
            row["name"]
            for row in await self.connection.execute_query_dict(
                'PRAGMA table_info("detalle_toma_inventario")'
            )
        }
        self.assertTrue({"id", "fecha", "usuario_id", "estado"} <= toma_columns)
        self.assertTrue(
            {
                "toma_id",
                "producto_id",
                "stock_teorico",
                "conteo_fisico",
                "diferencia",
            }
            <= detalle_columns
        )

    async def test_registra_conteo_usando_los_nuevos_campos_orm(self):
        rol = await Rol.create(id=2, nombre="Bodega")
        usuario = await User.create(
            nombre="Bodega de prueba",
            correo="bodega-conteo@example.invalid",
            password="test-password",
            rol=rol,
        )
        articulo = await Articulos.create(
            codigo_sku="CONTEO-TEST",
            nombre="Artículo para conteo",
            stock_actual=12,
        )

        respuesta = await crear_conteo(
            ConteoCreateSchema(
                detalles=[
                    DetalleConteoSchema(
                        articulo_id=articulo.id,
                        stock_sistema=12,
                        cantidad_contada=10,
                    )
                ]
            ),
            self.crear_solicitud(usuario.correo),
        )

        self.assertEqual(respuesta["data"]["creado_por"], usuario.nombre)
        self.assertEqual(respuesta["data"]["detalles"][0]["stock_sistema"], 12)
        self.assertEqual(respuesta["data"]["detalles"][0]["cantidad_contada"], 10)
        self.assertEqual(
            await ConteoInventario.filter(usuario_id=usuario.id).count(),
            1,
        )
        self.assertEqual(
            await DetalleConteoInventario.filter(
                toma_id=respuesta["data"]["id"],
                producto_id=articulo.id,
                stock_teorico=12,
                conteo_fisico=10,
            ).count(),
            1,
        )

    async def test_migra_tablas_anteriores_conservando_registros(self):
        await self.connection.execute_script("""
            DROP TABLE "detalle_toma_inventario";
            DROP TABLE "toma_inventario";
            CREATE TABLE "conteos_inventario" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "creado_por_id" INTEGER NOT NULL,
                "resuelto_por_id" INTEGER,
                "estado" VARCHAR(32) NOT NULL,
                "observaciones" TEXT,
                "motivo_rechazo" TEXT,
                "fecha" DATETIME NOT NULL,
                "fecha_revision" DATETIME
            );
            CREATE TABLE "detalle_conteo_inventario" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "conteo_id" INTEGER NOT NULL,
                "articulo_id" INTEGER NOT NULL,
                "stock_sistema" INTEGER NOT NULL,
                "cantidad_contada" INTEGER NOT NULL,
                "diferencia" INTEGER NOT NULL,
                UNIQUE ("conteo_id", "articulo_id")
            );
            INSERT INTO "conteos_inventario"
                ("id", "creado_por_id", "estado", "fecha")
            VALUES (7, 42, 'PENDIENTE_APROBACION', '2026-11-15 12:00:00');
            INSERT INTO "detalle_conteo_inventario"
                ("id", "conteo_id", "articulo_id", "stock_sistema",
                 "cantidad_contada", "diferencia")
            VALUES (9, 7, 13, 20, 18, -2);
            """)

        await PrepareLegacyConteoSchema()

        toma = await self.connection.execute_query_dict(
            'SELECT "usuario_id", "estado" FROM "toma_inventario" WHERE "id" = 7'
        )
        detalle = await self.connection.execute_query_dict(
            'SELECT "toma_id", "producto_id", "stock_teorico", '
            '"conteo_fisico", "diferencia" '
            'FROM "detalle_toma_inventario" WHERE "id" = 9'
        )
        self.assertEqual(toma[0]["usuario_id"], 42)
        self.assertEqual(toma[0]["estado"], "PENDIENTE_APROBACION")
        self.assertEqual(
            detalle[0],
            {
                "toma_id": 7,
                "producto_id": 13,
                "stock_teorico": 20,
                "conteo_fisico": 18,
                "diferencia": -2,
            },
        )
        await PrepareLegacyConteoSchema()


if __name__ == "__main__":
    unittest.main()
