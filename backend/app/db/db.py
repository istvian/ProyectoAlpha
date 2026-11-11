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
            ]
        },
    )
    await PrepareLegacyEgresoSchema()
    await Tortoise.generate_schemas()
    await CreateRoles()
    await SetupAccounts()


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


async def CreateRoles():
    roles = await Rol.all()
    if len(roles) == 0:
        await Rol.create(nombre="admin")
        await Rol.create(nombre="bodega")
        await Rol.create(nombre="finanzas")
        await Rol.create(nombre="supervisor")


async def SetupAccounts():
    await CreateAccount("admin@mail.cl", "Qwerty1234!", Roles.admin, "Juan Perez")
    await CreateAccount("bodega@mail.cl", "Qwerty1234!", Roles.bodega, "Pedro Gonzalez")
    await CreateAccount(
        "finanzas@mail.cl", "Qwerty1234!", Roles.finanzas, "Maria Fuentes"
    )
    await CreateAccount(
        "supervisor@mail.cl", "Qwerty1234!", Roles.supervisor, "Diego Muñoz"
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
