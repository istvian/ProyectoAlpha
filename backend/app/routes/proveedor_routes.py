from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr
from tortoise.exceptions import IntegrityError
from db import db
from models.proveedor import Proveedores
from middlewares.jwt_helper import validar_rol, decode_jwt
from schemas.roles import Roles

router = APIRouter()


class ProveedorBaseModel(BaseModel):
    id: int | None = None
    rut: str
    razon_social: str


class ProveedorDeleteBaseModel(BaseModel):
    id: int


@router.get("")
async def get_proveedor(request: Request, response: Response):
    try:
        token = request.cookies.get("token")
        if not validar_rol(token, Roles.cualquiera):
            response.delete_cookie(key="token")
            return {"error": True, "mensaje": "Token no válido"}
        proveedores = await Proveedores.filter(deleted=False).all()
        if proveedores:
            return {"error": False, "mensaje": "Lectura completa", "data": proveedores}
        else:
            return {"error": False, "mensaje": "Lectura completa", "data": []}

    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


@router.post("")
async def insert_proveedor(
    body: ProveedorBaseModel, request: Request, response: Response
):
    try:
        token = request.cookies.get("token")
        if not validar_rol(token, Roles.finanzas):
            response.delete_cookie(key="token")
            return {"error": True, "mensaje": "Token no válido"}
        creado = await Proveedores.create(
            rut=body.rut, razon_social=body.razon_social, deleted=False
        )
        if creado:
            return {
                "error": False,
                "mensaje": "Proveedor creado correctamente",
                "alert": True,
            }
        else:
            return {
                "error": True,
                "mensaje": "Ocurrio un error al crear el proveedor",
                "alert": True,
            }
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


@router.patch("")
async def update_proveedor(
    body: ProveedorBaseModel, request: Request, response: Response
):
    try:
        token = request.cookies.get("token")
        if not validar_rol(token, Roles.finanzas):
            response.delete_cookie(key="token")
            return {"error": True, "mensaje": "Token no válido"}
        proveedor = await Proveedores.get(id=body.id)
        proveedor.razon_social = body.razon_social
        proveedor.rut = body.rut
        await proveedor.save()

        return {
            "error": False,
            "mensaje": "Proveedor creado correctamente",
            "alert": True,
        }

    except Exception as error:
        print(error)
        return {
            "error": True,
            "mensaje": "Ocurrio un error al actualizar el proveedor",
            "alert": True,
        }


@router.delete("")
async def delete_proveedor(
    body: ProveedorDeleteBaseModel, request: Request, response: Response
):
    try:
        token = request.cookies.get("token")
        if not validar_rol(token, Roles.finanzas):
            response.delete_cookie(key="token")
            return {"error": True, "mensaje": "Token no válido"}
        proveedor = await Proveedores.get(id=body.id)
        proveedor.deleted = True
        await proveedor.save()

        return {
            "error": False,
            "mensaje": "Proveedor eliminado correctamente",
            "alert": True,
        }

    except Exception as error:
        print(error)
        return {
            "error": True,
            "mensaje": "Ocurrio un error al eliminar el proveedor",
            "alert": True,
        }
