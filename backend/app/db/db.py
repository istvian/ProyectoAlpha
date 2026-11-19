import os

from tortoise import Tortoise
from models.rol import Rol
from models.user import User
from middlewares.bcript_helper import encriptar_contraseña
from schemas.roles import Roles


async def SetupDB():

    await Tortoise.init(
        db_url="sqlite://db.sqlite3",
        # db_url="postgresql://postgres:xSK4B8q8BboKy95X@db.ckwvsfebfuskjsaxycaw.supabase.co:5432/postgres",
        modules={
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
        },
    )
    await PrepareLegacyEgresoSchema()
    await PrepareLegacyDetalleSchema()
    await PrepareProveedorFacturaSchema()
    await PrepareDetalleDocumentoSchema()
    await PrepareArticuloPMP()
    await PrepareLegacyConteoSchema()
    await PrepareRecepcionSchema()
    await Tortoise.generate_schemas()
    await EnsureArticuloJsonFields()
    await EnsureDocumentoTipoConstraint()
    await EnsureCardexMovementTypeConstraint()
    await EnsureCardexImmutability()
    await CreateRoles()
    await SetupAccounts()
    await SeedDemoDataInDevelopment()


async def SeedDemoDataInDevelopment():
    if os.getenv("APP_ENV", "development").strip().lower() != "development":
        return
    if Tortoise.get_connection("default").capabilities.dialect != "sqlite":
        return

    from scripts.seed_demo_data import crear_datos_demo

    resultado = await crear_datos_demo()
    print(f"Datos demo de desarrollo: {resultado}")


async def EnsureCardexMovementTypeConstraint():
    connection = Tortoise.get_connection("default")
    if connection.capabilities.dialect != "sqlite":
        return

    allowed_types = (
        "'ENTRADA_COMPRA', 'SALIDA_OBRA', 'MERMA', 'DEVOLUCION', "
        "'USO_INTERNO', 'AJUSTE_INVENTARIO'"
    )
    triggers = await connection.execute_query_dict("""
        SELECT name, sql FROM sqlite_master
        WHERE type = 'trigger'
          AND name IN (
              'cardex_logs_tipo_movimiento_insert',
              'cardex_logs_tipo_movimiento_update'
          )
        """)
    if len(triggers) == 2 and all(
        "AJUSTE_INVENTARIO" in (trigger["sql"] or "") for trigger in triggers
    ):
        return

    await connection.execute_script(f"""
        DROP TRIGGER IF EXISTS cardex_logs_tipo_movimiento_insert;
        DROP TRIGGER IF EXISTS cardex_logs_tipo_movimiento_update;

        CREATE TRIGGER IF NOT EXISTS cardex_logs_tipo_movimiento_insert
        BEFORE INSERT ON cardex_logs
        FOR EACH ROW
        WHEN NEW.tipo_movimiento NOT IN ({allowed_types})
        BEGIN
            SELECT RAISE(ABORT, 'tipo_movimiento must be a valid Cardex movement');
        END;

        CREATE TRIGGER IF NOT EXISTS cardex_logs_tipo_movimiento_update
        BEFORE UPDATE OF tipo_movimiento ON cardex_logs
        FOR EACH ROW
        WHEN NEW.tipo_movimiento NOT IN ({allowed_types})
        BEGIN
            SELECT RAISE(ABORT, 'tipo_movimiento must be a valid Cardex movement');
        END;
        """)


async def EnsureCardexImmutability():
    connection = Tortoise.get_connection("default")
    if connection.capabilities.dialect != "sqlite":
        return

    await connection.execute_script("""
        CREATE TRIGGER IF NOT EXISTS cardex_logs_prevent_update
        BEFORE UPDATE ON cardex_logs
        FOR EACH ROW
        BEGIN
            SELECT RAISE(ABORT, 'cardex_logs are immutable');
        END;

        CREATE TRIGGER IF NOT EXISTS cardex_logs_prevent_delete
        BEFORE DELETE ON cardex_logs
        FOR EACH ROW
        BEGIN
            SELECT RAISE(ABORT, 'cardex_logs are immutable');
        END;
        """)


async def PrepareLegacyEgresoSchema():
    connection = Tortoise.get_connection("default")
    if connection.capabilities.dialect != "sqlite":
        return
    tables = {
        row["name"]
        for row in await connection.execute_query_dict(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }

    if "egresos" not in tables or "egresos_obra" in tables:
        return

    egreso_count = (
        await connection.execute_query_dict('SELECT COUNT(*) AS count FROM "egresos"')
    )[0]["count"]
    detalle_count = 0
    if "detalle_egreso" in tables:
        detalle_count = (
            await connection.execute_query_dict(
                'SELECT COUNT(*) AS count FROM "detalle_egreso"'
            )
        )[0]["count"]

    if egreso_count or detalle_count:
        raise RuntimeError(
            "La base SQLite contiene egresos antiguos. Migra sus datos y relaciones "
            "antes de cambiar el esquema a egresos_obra."
        )

    # The legacy tables are empty; drop them so Tortoise can recreate the detail FK
    # against egresos_obra. Existing data is never discarded automatically.
    if "detalle_egreso" in tables:
        await connection.execute_script('DROP TABLE "detalle_egreso"')
    await connection.execute_script('DROP TABLE "egresos"')


async def PrepareLegacyDetalleSchema():
    connection = Tortoise.get_connection("default")
    if connection.capabilities.dialect != "sqlite":
        return
    tables = {
        row["name"]
        for row in await connection.execute_query_dict(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }

    if "articulos" in tables:
        article_columns = {
            row["name"]
            for row in await connection.execute_query_dict(
                'PRAGMA table_info("articulos")'
            )
        }
        if "precio_lista" not in article_columns:
            await connection.execute_script(
                'ALTER TABLE "articulos" ADD COLUMN "precio_lista" DECIMAL(10, 2)'
            )

    if "detalle_egreso" not in tables:
        return

    detail_columns = {
        row["name"]
        for row in await connection.execute_query_dict(
            'PRAGMA table_info("detalle_egreso")'
        )
    }
    if {"cantidad_solicitada", "precio_lista_vigente"} <= detail_columns:
        return

    detail_count = (
        await connection.execute_query_dict(
            'SELECT COUNT(*) AS count FROM "detalle_egreso"'
        )
    )[0]["count"]
    if detail_count:
        raise RuntimeError(
            "La tabla detalle_egreso contiene registros con el esquema anterior. "
            "Migra cantidad y define explícitamente precio_lista_vigente para cada "
            "detalle antes de actualizar el esquema."
        )

    await connection.execute_script('DROP TABLE "detalle_egreso"')


async def PrepareProveedorFacturaSchema():
    connection = Tortoise.get_connection("default")
    if connection.capabilities.dialect != "sqlite":
        return

    tables = {
        row["name"]
        for row in await connection.execute_query_dict(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }

    if "proveedores" in tables:
        columns = {
            row["name"]
            for row in await connection.execute_query_dict(
                'PRAGMA table_info("proveedores")'
            )
        }
        additions = {
            "direccion": "VARCHAR(255)",
            "region": "VARCHAR(100)",
            "comuna": "VARCHAR(100)",
            "ciudad": "VARCHAR(100)",
            "contactos_jsonb": "JSON",
        }
        for name, sql_type in additions.items():
            if name not in columns:
                await connection.execute_script(
                    f'ALTER TABLE "proveedores" ADD COLUMN "{name}" {sql_type}'
                )

    if "documentos_tributarios" in tables:
        columns = {
            row["name"]
            for row in await connection.execute_query_dict(
                'PRAGMA table_info("documentos_tributarios")'
            )
        }
        if "fecha_ingreso" not in columns:
            await connection.execute_script(
                'ALTER TABLE "documentos_tributarios" '
                'ADD COLUMN "fecha_ingreso" DATETIME'
            )
        if "datos_dte" not in columns:
            await connection.execute_script(
                'ALTER TABLE "documentos_tributarios" ADD COLUMN "datos_dte" JSON'
            )

        await connection.execute_script("""
            UPDATE "documentos_tributarios"
            SET "tipo" = 'Factura'
            WHERE "tipo" IN ('Factura electrónica', 'Factura electronica');

            UPDATE "documentos_tributarios"
            SET "tipo" = 'Boleta'
            WHERE "tipo" IN ('Boleta electrónica', 'Boleta electronica');

            UPDATE "documentos_tributarios"
            SET "tipo" = 'Nota de Crédito'
            WHERE "tipo" IN ('Nota de Credito', 'Nota de crédito');
            """)


async def PrepareDetalleDocumentoSchema():
    connection = Tortoise.get_connection("default")
    if connection.capabilities.dialect != "sqlite":
        return

    tables = {
        row["name"]
        for row in await connection.execute_query_dict(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }
    if "detalle_documento" not in tables:
        return

    columns = {
        row["name"]
        for row in await connection.execute_query_dict(
            'PRAGMA table_info("detalle_documento")'
        )
    }
    additions = {
        "precio_lista_actualizado": "DECIMAL(12, 2) NOT NULL DEFAULT 0",
        "descuento1": "DECIMAL(5, 2) NOT NULL DEFAULT 0",
        "descuento2": "DECIMAL(5, 2) NOT NULL DEFAULT 0",
        "descuento3": "DECIMAL(5, 2) NOT NULL DEFAULT 0",
    }
    added_columns = set()
    for name, sql_type in additions.items():
        if name not in columns:
            await connection.execute_script(
                f'ALTER TABLE "detalle_documento" ADD COLUMN "{name}" {sql_type}'
            )
            added_columns.add(name)

    if "precio_lista_actualizado" in added_columns and "precio_neto" in columns:
        await connection.execute_script("""
            UPDATE "detalle_documento"
            SET "precio_lista_actualizado" = "precio_neto"
            WHERE "precio_lista_actualizado" = 0;
            """)

    if "documentos_tributarios" not in tables:
        return
    document_columns = {
        row["name"]
        for row in await connection.execute_query_dict(
            'PRAGMA table_info("documentos_tributarios")'
        )
    }
    if "documento_id" not in columns:
        return
    for name in ("descuento1", "descuento2", "descuento3"):
        if name not in added_columns or name not in document_columns:
            continue
        await connection.execute_script(f"""
            UPDATE "detalle_documento"
            SET "{name}" = COALESCE(
                (
                    SELECT documentos_tributarios."{name}"
                    FROM documentos_tributarios
                    WHERE documentos_tributarios.id = detalle_documento.documento_id
                ),
                0
            );
            """)


async def PrepareArticuloPMP():
    connection = Tortoise.get_connection("default")
    if connection.capabilities.dialect != "sqlite":
        return

    tables = {
        row["name"]
        for row in await connection.execute_query_dict(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }
    if "articulos" not in tables:
        return

    columns = {
        row["name"]
        for row in await connection.execute_query_dict('PRAGMA table_info("articulos")')
    }
    if "precio_medio_ponderado" in columns:
        return

    await connection.execute_script(
        'ALTER TABLE "articulos" ADD COLUMN '
        '"precio_medio_ponderado" DECIMAL(12, 2) NOT NULL DEFAULT 0'
    )
    if "precio_lista" not in columns:
        return

    if "detalle_documento" in tables:
        detail_columns = {
            row["name"]
            for row in await connection.execute_query_dict(
                'PRAGMA table_info("detalle_documento")'
            )
        }
        if {"articulo_id", "cantidad", "costo_neto_unitario"} <= detail_columns:
            await connection.execute_script("""
                UPDATE "articulos"
                SET "precio_medio_ponderado" = COALESCE(
                    (
                        SELECT ROUND(
                            SUM(detalle_documento.cantidad * detalle_documento.costo_neto_unitario)
                            / NULLIF(SUM(detalle_documento.cantidad), 0),
                            2
                        )
                        FROM detalle_documento
                        WHERE detalle_documento.articulo_id = articulos.id
                    ),
                    "precio_lista",
                    0
                );
                """)
            return

    await connection.execute_script("""
        UPDATE "articulos"
        SET "precio_medio_ponderado" = COALESCE("precio_lista", 0);
        """)


async def EnsureArticuloJsonFields():
    connection = Tortoise.get_connection("default")
    if connection.capabilities.dialect != "sqlite":
        return

    tables = {
        row["name"]
        for row in await connection.execute_query_dict(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }
    if "articulos" not in tables:
        return

    columns = {
        row["name"]
        for row in await connection.execute_query_dict('PRAGMA table_info("articulos")')
    }
    nuevas_columnas = {
        "especificaciones_tecnicas": "JSON NOT NULL DEFAULT '{}'",
        "ultimos_costos_compra": "JSON NOT NULL DEFAULT '[]'",
    }
    historial_agregado = "ultimos_costos_compra" not in columns
    for nombre, definicion in nuevas_columnas.items():
        if nombre not in columns:
            await connection.execute_script(
                f'ALTER TABLE "articulos" ADD COLUMN "{nombre}" {definicion}'
            )

    if not historial_agregado or "detalle_documento" not in tables:
        return

    from models.proveedor import Articulos, DetalleDocumento

    for articulo in await Articulos.all():
        detalles = (
            await DetalleDocumento.filter(articulo_id=articulo.id)
            .select_related("documento")
            .order_by("-documento__emision", "-id")
            .limit(3)
        )
        articulo.ultimos_costos_compra = [
            {
                "costo_unitario": format(detalle.costo_neto_unitario, ".2f"),
                "fecha": detalle.documento.emision.isoformat(),
                "folio": detalle.documento.folio,
            }
            for detalle in detalles
        ]
        if articulo.ultimos_costos_compra:
            await articulo.save(update_fields=["ultimos_costos_compra"])


async def PrepareRecepcionSchema():
    connection = Tortoise.get_connection("default")
    if connection.capabilities.dialect != "sqlite":
        return

    tables = {
        row["name"]
        for row in await connection.execute_query_dict(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }
    if "recepciones_compra" not in tables:
        return

    columns = {
        row["name"]
        for row in await connection.execute_query_dict(
            'PRAGMA table_info("recepciones_compra")'
        )
    }
    additions = {
        "bultos_guia": "INTEGER NOT NULL DEFAULT 0",
        "bultos_recibidos": "INTEGER NOT NULL DEFAULT 0",
    }
    for name, sql_type in additions.items():
        if name not in columns:
            await connection.execute_script(
                f'ALTER TABLE "recepciones_compra" ADD COLUMN "{name}" {sql_type}'
            )


async def PrepareLegacyConteoSchema():
    connection = Tortoise.get_connection("default")
    if connection.capabilities.dialect != "sqlite":
        return

    tables = {
        row["name"]
        for row in await connection.execute_query_dict(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }
    table_renames = (
        ("conteos_inventario", "toma_inventario"),
        ("detalle_conteo_inventario", "detalle_toma_inventario"),
    )
    for old_name, new_name in table_renames:
        if old_name in tables and new_name in tables:
            raise RuntimeError(
                f"No se puede migrar el conteo: existen ambas tablas "
                f"'{old_name}' y '{new_name}'."
            )
        if old_name in tables:
            await connection.execute_script(
                f'ALTER TABLE "{old_name}" RENAME TO "{new_name}"'
            )
            tables.remove(old_name)
            tables.add(new_name)

    column_renames = {
        "toma_inventario": (("creado_por_id", "usuario_id"),),
        "detalle_toma_inventario": (
            ("conteo_id", "toma_id"),
            ("articulo_id", "producto_id"),
            ("stock_sistema", "stock_teorico"),
            ("cantidad_contada", "conteo_fisico"),
        ),
    }
    for table_name, renames in column_renames.items():
        if table_name not in tables:
            continue
        columns = {
            row["name"]
            for row in await connection.execute_query_dict(
                f'PRAGMA table_info("{table_name}")'
            )
        }
        for old_name, new_name in renames:
            if old_name in columns and new_name in columns:
                raise RuntimeError(
                    f"No se puede migrar el conteo: la tabla '{table_name}' "
                    f"contiene las columnas '{old_name}' y '{new_name}'."
                )
            if old_name in columns:
                await connection.execute_script(
                    f'ALTER TABLE "{table_name}" '
                    f'RENAME COLUMN "{old_name}" TO "{new_name}"'
                )
                columns.remove(old_name)
                columns.add(new_name)


async def EnsureDocumentoTipoConstraint():
    connection = Tortoise.get_connection("default")
    if connection.capabilities.dialect != "sqlite":
        return

    await connection.execute_script("""
        CREATE TRIGGER IF NOT EXISTS documentos_tributarios_tipo_insert
        BEFORE INSERT ON documentos_tributarios
        FOR EACH ROW
        WHEN NEW.tipo NOT IN ('Factura', 'Boleta', 'Nota de Crédito')
        BEGIN
            SELECT RAISE(ABORT, 'tipo must be Factura, Boleta or Nota de Crédito');
        END;

        CREATE TRIGGER IF NOT EXISTS documentos_tributarios_tipo_update
        BEFORE UPDATE OF tipo ON documentos_tributarios
        FOR EACH ROW
        WHEN NEW.tipo NOT IN ('Factura', 'Boleta', 'Nota de Crédito')
        BEGIN
            SELECT RAISE(ABORT, 'tipo must be Factura, Boleta or Nota de Crédito');
        END;
        """)


async def CreateRoles():
    roles = await Rol.all()
    if len(roles) == 0:
        await Rol.create(nombre="admin")
        await Rol.create(nombre="bodega")
        await Rol.create(nombre="finanzas")
        await Rol.create(nombre="supervisor")
        await Rol.create(nombre="tecnico")


async def SetupAccounts():
    await CreateAccount("admin@mail.cl", "Qwerty1234!", Roles.admin, "Juan Perez")
    await CreateAccount("bodega@mail.cl", "Qwerty1234!", Roles.bodega, "Pedro Gonzalez")
    await CreateAccount(
        "finanzas@mail.cl", "Qwerty1234!", Roles.finanzas, "Maria Fuentes"
    )
    await CreateAccount(
        "supervisor@mail.cl", "Qwerty1234!", Roles.supervisor, "Diego Muñoz"
    )
    await CreateAccount("tecnico@mail.cl", "Qwerty1234!", Roles.tecnico, "Jose Tecnico")


async def CreateAccount(mail, password, rol: Roles, name):
    user = await User.get_or_none(correo=mail)
    if not user:
        print("Creando usuario")
        await User.create(
            nombre=name,
            correo=mail,
            password=encriptar_contraseña(password),
            enabled=True,
            rol_id=rol.value,
        )


async def CloseDB():
    await Tortoise.close_connections()
