from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, EmailStr
from tortoise.exceptions import IntegrityError
from db import db
from models.rol import Rol
from models.user import User
from middlewares.bcript_helper import encriptar_contraseña, validar_contraseña
from middlewares.jwt_helper import generate_jwt, decode_jwt

router = APIRouter()


class UsuarioRegister(BaseModel):
    correo: EmailStr
    password: str
    nombre: str


class UsuarioLogin(BaseModel):
    correo: EmailStr
    password: str


@router.get("/")
def get_user_data(req):
    return {"ok": True}


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
        return {"message": "Usuario registrado exitosamente", "id": user.id}
    except IntegrityError as e:
        print(e)
        return {"message": "Error: No se pudo crear porque el usuario ya existe"}
    except Exception as error:
        print(error)
        return {"message": str(error)}


@router.post("/login")
async def login_user(body: UsuarioLogin, response: Response):
    user = await User.get_or_none(correo=body.correo).select_related("rol")
    if not user or not validar_contraseña(body.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = generate_jwt(user.correo, user.rol.id, 15)

    response.set_cookie(
        key="access_token",
        value=token,
        max_age=15 * 60,
        httponly=True,
        secure=False,  # Cambiar para producción
        samesite="lax",
    )

    return {"message": "Inicio de sesión exitoso", "user_id": user.id}
