from tortoise import Tortoise
from models.rol import Rol


async def SetupDB():

    await Tortoise.init(
        # db_url="sqlite://db.sqlite3",
        db_url="postgresql://postgres:xSK4B8q8BboKy95X@db.ckwvsfebfuskjsaxycaw.supabase.co:5432/postgres",
        modules={"models": ["models.user", "models.rol"]},
    )
    await Tortoise.generate_schemas()
    await CreateRoles()


async def CreateRoles():
    roles = await Rol.all()
    if len(roles) == 0:
        await Rol.create(nombre="admin")
        await Rol.create(nombre="finanzas")
        await Rol.create(nombre="bodega")
        await Rol.create(nombre="supervisor")


async def CloseDB():
    await Tortoise.close_connections()
