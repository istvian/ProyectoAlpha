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
            ]
        },
    )
    await PrepareLegacyEgresoSchema()
    await PrepareLegacyDetalleSchema()
    await Tortoise.generate_schemas()
    await EnsureCardexMovementTypeConstraint()
    await CreateRoles()
    await SetupAccounts()


async def EnsureCardexMovementTypeConstraint():
    connection = Tortoise.get_connection("default")
    if connection.capabilities.dialect != "sqlite":
        return

    allowed_types = (
        "'ENTRADA_COMPRA', 'SALIDA_OBRA', 'MERMA', 'DEVOLUCION', 'USO_INTERNO'"
    )
    await connection.execute_script(
        f"""
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
        """
    )


async def PrepareLegacyEgresoSchema():
    connection = Tortoise.get_connection("default")
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
    await CreateAccount(
        "tecnico@mail.cl", "Qwerty1234!", Roles.tecnico, "Jose Tecnico"
    )


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
