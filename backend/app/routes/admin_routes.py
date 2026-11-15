import time
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, EmailStr
from models.user import User
from models.cardex_log import CardexLog, TipoMovimiento
from models.proveedor import Articulos, Proveedores
from middlewares.bcript_helper import validar_contraseña, encriptar_contraseña
from middlewares.jwt_helper import check_user, generate_jwt, validar_rol, decode_jwt
from schemas.roles import Roles
from db.nosql import get_db
from datetime import datetime, timezone
from services.cardex_summary_service import obtener_resumen_cardex

router = APIRouter()
db = get_db()


class NuevoUsuario(BaseModel):
    correo: EmailStr
    password: Optional[str] = None
    nombre: str
    enabled: bool
    rol_id: int


@router.get("/dashboard", dependencies=[Depends(check_user(Roles.admin))])
async def get_dashboard():
    articulos = await Articulos.all().values_list(
        "stock_actual", "stock_minimo", "precio_medio_ponderado"
    )
    valor_inventario = sum(
        (
            Decimal(stock) * Decimal(str(pmp))
            for stock, _, pmp in articulos
        ),
        Decimal("0.00"),
    )
    stock_critico = sum(
        1 for stock, minimo, _ in articulos if stock <= minimo
    )
    usuarios_por_rol = {
        rol.name: await User.filter(rol_id=rol.value, enabled=True).count()
        for rol in Roles
        if rol != Roles.cualquiera
    }

    return {
        "error": False,
        "mensaje": "Indicadores consultados correctamente",
        "data": {
            "productos": len(articulos),
            "valor_inventario": str(valor_inventario.quantize(Decimal("0.01"))),
            "stock_critico": stock_critico,
            "movimientos_hoy": await obtener_resumen_cardex(),
            "usuarios_activos": sum(usuarios_por_rol.values()),
            "usuarios_por_rol": usuarios_por_rol,
            "mermas_registradas": await CardexLog.filter(
                tipo_movimiento=TipoMovimiento.MERMA
            ).count(),
            "proveedores_activos": await Proveedores.filter(deleted=False).count(),
        },
    }


# Crear un usuario via panel administrador
@router.post("/user", dependencies=[Depends(check_user(Roles.admin))])
async def create_user(request: Request, body: NuevoUsuario, response: Response):
    try:
        print(body.rol_id)
        if not body.password or body.password == "":
            return {"error": True, "mensaje": "Campos incompletos"}
        user = await User.get_or_none(correo=body.correo)
        if user:
            return {"error": True, "mensaje": "Usuario ya existe"}
        await User.create(
            nombre=body.nombre,
            correo=body.correo,
            password=encriptar_contraseña(body.password),
            enabled=body.enabled,
            rol_id=body.rol_id,
        )
        return {"error": False, "mensaje": "Se creo el usuario correctamente"}
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


# Crear un usuario via panel administrador
@router.patch("/user", dependencies=[Depends(check_user(Roles.admin))])
async def modify_user(request: Request, body: NuevoUsuario, response: Response):
    try:
        user = await User.get_or_none(correo=body.correo)
        if not user:
            return {"error": True, "mensaje": "Usuario no existe"}
        update_data = {
            "nombre": body.nombre,
            "correo": body.correo,
            "enabled": body.enabled,
            "rol_id": body.rol_id,
        }
        if body.password and body.password.strip():
            update_data["password"] = encriptar_contraseña(body.password)
        user.update_from_dict(update_data)
        await user.save()
        return {"error": False, "mensaje": "Se guardo el usuario correctamente"}
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


@router.get("/users", dependencies=[Depends(check_user(Roles.admin))])
async def get_userdata(request: Request, response: Response):
    try:
        users = await User.all().values(
            "id", "nombre", "correo", "enabled", "created", "rol_id"
        )
        for user in users:
            try:
                user["rol"] = Roles(user["rol_id"]).name
            except ValueError:
                user["rol"] = "Desconocido"

        return {
            "error": False,
            "mensaje": "Consulta realizada correctamente",
            "data": users,
        }
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


@router.get("/logs", dependencies=[Depends(check_user(Roles.admin))])
async def get_logs(
    cantidad: int = 20,
    pagina: int = 1,
):
    try:
        logs = db.ObtenerUltimosLogs(cantidad, pagina)
        return {
            "error": False,
            "mensaje": "Logs retornados correctamente",
            "data": logs,
        }
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}
