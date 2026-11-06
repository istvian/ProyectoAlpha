from tortoise import Tortoise
from models.rol import Rol
from models.user import User
from middlewares.bcript_helper import encriptar_contraseña


async def SetupDB():

    await Tortoise.init(
        db_url="sqlite://db.sqlite3",
        # db_url="postgresql://postgres:xSK4B8q8BboKy95X@db.ckwvsfebfuskjsaxycaw.supabase.co:5432/postgres",
        modules={"models": ["models.user", "models.rol", "models.proveedor", "models.egreso"]},
    )
    await Tortoise.generate_schemas()
    await CreateRoles()
    await CreateAdminAccount()


async def CreateRoles():
    roles = await Rol.all()
    if len(roles) == 0:
        await Rol.create(nombre="admin")
        await Rol.create(nombre="finanzas")
        await Rol.create(nombre="bodega")
        await Rol.create(nombre="supervisor")


async def CreateAdminAccount():
    user = await User.get_or_none(correo="e.r94@outlook.cl")
    if not user:
        print("Creando usuario administrador")
        await User.create(
            nombre="Esteban",
            correo="e.r94@outlook.cl",
            password=encriptar_contraseña("Qwerty1234!"),
            enabled=True,
            rol_id=1,
        )


async def CloseDB():
    await Tortoise.close_connections()
