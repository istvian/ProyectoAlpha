import pytest
from starlette.requests import Request
from tortoise import Tortoise

from db.db import PrepareLegacyConteoSchema
from models.proveedor import Articulos
from models.conteo_inventario import ConteoInventario, DetalleConteoInventario
from models.rol import Rol
from models.user import User
from routes.conteo_inventario_routes import (
    ConteoCreateSchema,
    DetalleConteoSchema,
    crear_conteo,
    obtener_catalogo_conteo,
)


def crear_solicitud(correo: str) -> Request:
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


async def test_modelo_crea_las_tablas_y_columnas_solicitadas(db):
    connection = Tortoise.get_connection("default")
    assert ConteoInventario._meta.db_table == "toma_inventario"
    assert DetalleConteoInventario._meta.db_table == "detalle_toma_inventario"

    toma_columns = {
        row["name"]
        for row in await connection.execute_query_dict('PRAGMA table_info("toma_inventario")')
    }
    detalle_columns = {
        row["name"]
        for row in await connection.execute_query_dict('PRAGMA table_info("detalle_toma_inventario")')
    }
    assert {"id", "fecha", "usuario_id", "estado"} <= toma_columns
    assert {"toma_id", "producto_id", "stock_teorico", "conteo_fisico", "diferencia"} <= detalle_columns


async def test_registra_conteo_usando_los_nuevos_campos_orm(db):
    rol = await Rol.create(id=2, nombre="Bodega")
    usuario = await User.create(nombre="Bodega de prueba", correo="bodega-conteo@example.invalid", password="test-password", rol=rol)
    articulo = await Articulos.create(
        codigo_sku="CONTEO-TEST",
        nombre="Artículo para conteo",
        stock_actual=12,
        ultimos_costos_compra=[
            {"costo_unitario": "13.75", "fecha": "2026-03-03", "folio": "F-3"},
            {"costo_unitario": "12.50", "fecha": "2026-03-02", "folio": "F-2"},
            {"costo_unitario": "11.25", "fecha": "2026-03-01", "folio": "F-1"},
        ],
    )

    respuesta = await crear_conteo(
        ConteoCreateSchema(detalles=[DetalleConteoSchema(articulo_id=articulo.id, stock_sistema=12, cantidad_contada=10)]),
        crear_solicitud(usuario.correo),
    )

    assert respuesta["data"]["creado_por"] == usuario.nombre
    assert respuesta["data"]["detalles"][0]["stock_sistema"] == 12
    assert respuesta["data"]["detalles"][0]["cantidad_contada"] == 10
    assert respuesta["data"]["detalles"][0]["ultimos_costos_compra"] == articulo.ultimos_costos_compra
    assert await ConteoInventario.filter(usuario_id=usuario.id).count() == 1
    assert await DetalleConteoInventario.filter(
        toma_id=respuesta["data"]["id"],
        producto_id=articulo.id,
        stock_teorico=12,
        conteo_fisico=10,
    ).count() == 1


async def test_catalogo_conteo_devuelve_los_tres_costos_historicos(db):
    costos = [
        {"costo_unitario": "13.75", "fecha": "2026-03-03", "folio": "F-3"},
        {"costo_unitario": "12.50", "fecha": "2026-03-02", "folio": "F-2"},
        {"costo_unitario": "11.25", "fecha": "2026-03-01", "folio": "F-1"},
    ]
    await Articulos.create(codigo_sku="CONTEO-COSTOS", nombre="Artículo con historial de costos", stock_actual=12, stock_minimo=3, ultimos_costos_compra=costos)

    respuesta = await obtener_catalogo_conteo()
    assert respuesta["data"][0]["ultimos_costos_compra"] == costos


async def test_migra_tablas_anteriores_conservando_registros(db):
    connection = Tortoise.get_connection("default")
    await connection.execute_script("""
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

    toma = await connection.execute_query_dict('SELECT "usuario_id", "estado" FROM "toma_inventario" WHERE "id" = 7')
    detalle = await connection.execute_query_dict(
        'SELECT "toma_id", "producto_id", "stock_teorico", "conteo_fisico", "diferencia" FROM "detalle_toma_inventario" WHERE "id" = 9'
    )
    assert toma[0]["usuario_id"] == 42
    assert toma[0]["estado"] == "PENDIENTE_APROBACION"
    assert detalle[0] == {
        "toma_id": 7,
        "producto_id": 13,
        "stock_teorico": 20,
        "conteo_fisico": 18,
        "diferencia": -2,
    }
    await PrepareLegacyConteoSchema()
