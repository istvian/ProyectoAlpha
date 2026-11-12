import time
import traceback

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, EmailStr
from models.user import User
from middlewares.bcript_helper import validar_contraseña
from middlewares.jwt_helper import check_user, generate_jwt, validar_rol, decode_jwt
from schemas.roles import Roles
from db.nosql import get_db

router = APIRouter()
db = get_db()


class UsuarioRegister(BaseModel):
    correo: EmailStr
    password: str
    nombre: str


class UsuarioLogin(BaseModel):
    correo: EmailStr
    password: str


@router.get("/renew", dependencies=[Depends(check_user(Roles.cualquiera))])
async def renew(request: Request, response: Response):
    try:
        token = request.cookies.get("token")
        payload = decode_jwt(token)
        if not payload:
            return {"error": True, "mensaje": "Error refrescando token"}
        user = await User.get_or_none(correo=payload.get("correo")).select_related(
            "rol"
        )
        rol = user.rol_id  # type: ignore
        if not user:
            return {
                "error": True,
                "mensaje": "Cuenta no existe",
            }
        if user.enabled == False:
            return {
                "error": True,
                "mensaje": "Cuenta deshabilitada hable con un administrador",
            }
        newtoken = generate_jwt(user.correo, rol, 15)
        response.set_cookie(
            key="token",
            value=newtoken,
            max_age=15 * 60,
            httponly=True,
            secure=False,  # Cambiar para producción
            samesite="lax",
        )
        expires_in = 15 * 60
        return {
            "error": False,
            "mensaje": "Token refrescado",
            "user_id": user.id,
            "expires": int(time.time() * 1000) + expires_in * 1000,
        }
    except Exception as error:
        traceback.print_exc()
        print(error)
        return {"error": True, "mensaje": str(error)}


@router.get("/logout")
def logout(request: Request, response: Response):
    try:
        response.delete_cookie(key="token")
        return {"error": False, "mensaje": "Se ha cerrado la sesión correctamente"}
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


@router.get("/check")
def check_auth(request: Request, response: Response):
    try:
        token = request.cookies.get("token")
        if not validar_rol(token, Roles.cualquiera):
            response.delete_cookie(key="token")
            return {"error": True, "mensaje": "Token no válido"}
        else:
            return {"error": False, "mensaje": "Token valido"}
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


@router.get("/userdata", dependencies=[Depends(check_user(Roles.cualquiera))])
async def user_data(
    request: Request,
    response: Response,
):
    try:
        token = request.cookies.get("token")
        data = decode_jwt(token)
        if not data:
            return {"error": True, "mensaje": "Token no válido"}
        correo = data.get("correo", "")
        user = await User.get_or_none(correo=correo).select_related("rol")
        if not user:
            return {"error": True, "mensaje": "No existe el usuario"}
        return {
            "error": False,
            "mensaje": "Información de usuario",
            "correo": user.correo,
            "rol": Roles(user.rol.id).name,
            "rol_id": Roles(user.rol.id),
            "nombre": user.nombre,
        }
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


@router.post("/login")
async def login_user(body: UsuarioLogin, response: Response):
    try:
        user = await User.get_or_none(correo=body.correo).select_related("rol")
        if not user or not validar_contraseña(body.password, user.password):
            return {"error": True, "mensaje": "Correo o contraseña incorrectos"}
        if user.enabled == False:
            return {
                "error": True,
                "mensaje": "Cuenta deshabilitada hable con un administrador",
            }
        token = generate_jwt(user.correo, user.rol.id, 15)
        expires_in = 15 * 60
        response.set_cookie(
            key="token",
            value=token,
            max_age=expires_in,
            httponly=True,
            secure=False,  # Cambiar para producción
            samesite="lax",
        )
        return {
            "error": False,
            "mensaje": "Inicio de sesión exitoso",
            "user_id": user.id,
            "expires": int(time.time() * 1000) + expires_in * 1000,
        }
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}
