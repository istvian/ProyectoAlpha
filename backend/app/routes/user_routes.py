from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr
from tortoise.exceptions import IntegrityError
from db import db
from models.rol import Rol
from models.user import User
from middlewares.bcript_helper import encriptar_contraseña, validar_contraseña
from middlewares.jwt_helper import generate_jwt, validar_rol, decode_jwt
from schemas.roles import Roles

router = APIRouter()


class UsuarioRegister(BaseModel):
    correo: EmailStr
    password: str
    nombre: str


class UsuarioLogin(BaseModel):
    correo: EmailStr
    password: str


@router.get("/renew")
def renew(request: Request, response: Response):
    try:
        token = request.cookies.get("token")
        if not validar_rol(token, Roles.supervisor):
            response.delete_cookie(key="token")
            return {"error": True, "mensaje": "Token no válido"}
        else:
            payload = decode_jwt(token)
            if not payload:
                return {"error": True, "mensaje": "Error refrescando token"}
            token = generate_jwt(payload["correo"], payload["rol"], 15)
            response.set_cookie(
                key="token",
                value=token,
                max_age=15 * 60,
                httponly=True,
                secure=False,  # Cambiar para producción
                samesite="lax",
            )
            return {"error": False, "mensaje": "Token refrescado"}
    except Exception as error:
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


@router.get("/userdata")
async def user_data(request: Request, response: Response):
    try:
        token = request.cookies.get("token")
        if not validar_rol(token, Roles.cualquiera):
            response.delete_cookie(key="token")
            return {"error": True, "mensaje": "Token no válido"}
        else:
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
            }
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


@router.post("/register")
async def register_user(body: UsuarioRegister):
    try:
        default_rol = await Rol.get_or_none(nombre="supervisor")
        print(default_rol)
        if default_rol == None:
            raise Exception("El rol no se ha encontrado")
        contraseña_encriptada = encriptar_contraseña(body.password)
        user = await User.create(
            correo=body.correo,
            password=contraseña_encriptada,
            rol=default_rol,
            nombre=body.nombre,
        )
        return {"mensaje": "Usuario registrado exitosamente", "id": user.id}
    except IntegrityError as e:
        print(e)
        return {
            "error": True,
            "mensaje": "Error: No se pudo crear porque el usuario ya existe",
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
        token = generate_jwt(user.correo, user.rol.id, 15)
        response.set_cookie(
            key="token",
            value=token,
            max_age=15 * 60,
            httponly=True,
            secure=False,  # Cambiar para producción
            samesite="lax",
        )
        return {
            "error": False,
            "mensaje": "Inicio de sesión exitoso",
            "user_id": user.id,
        }
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}
