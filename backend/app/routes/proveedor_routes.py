from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr
from typing import Any, Optional
from tortoise.exceptions import IntegrityError
from db import db
from models.proveedor import Proveedores
from middlewares.jwt_helper import check_user, validar_rol, decode_jwt
from schemas.roles import Roles

router = APIRouter()


class ProveedorBaseModel(BaseModel):
    id: int | None = None
    rut: str
    razon_social: str
    deleted: bool
    direccion: Optional[str] = None
    region: Optional[str] = None
    comuna: Optional[str] = None
    ciudad: Optional[str] = None
    contactos_jsonb: Optional[dict[str, Any]] = None


class ProveedorDeleteBaseModel(BaseModel):
    id: int


@router.get("", dependencies=[Depends(check_user(Roles.finanzas))])
async def get_proveedor(request: Request, response: Response):
    try:
        proveedores = await Proveedores.all()
        if proveedores:
            return {"error": False, "mensaje": "Lectura completa", "data": proveedores}
        else:
            return {"error": False, "mensaje": "Lectura completa", "data": []}

    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


@router.post("", dependencies=[Depends(check_user(Roles.finanzas))])
async def insert_proveedor(
    body: ProveedorBaseModel, request: Request, response: Response
):
    try:
        creado = await Proveedores.create(
            rut=body.rut,
            razon_social=body.razon_social,
            deleted=False,
            direccion=body.direccion,
            region=body.region,
            comuna=body.comuna,
            ciudad=body.ciudad,
            contactos_jsonb=body.contactos_jsonb,
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


@router.patch("", dependencies=[Depends(check_user(Roles.finanzas))])
async def update_proveedor(
    body: ProveedorBaseModel, request: Request, response: Response
):
    try:
        proveedor = await Proveedores.get(id=body.id)
        proveedor.deleted = body.deleted
        proveedor.razon_social = body.razon_social
        proveedor.rut = body.rut
        campos_ampliados = (
            "direccion",
            "region",
            "comuna",
            "ciudad",
            "contactos_jsonb",
        )
        for campo in campos_ampliados:
            if campo in body.model_fields_set:
                setattr(proveedor, campo, getattr(body, campo))
        await proveedor.save()

        return {
            "error": False,
            "mensaje": "Proveedor actualizado correctamente",
            "alert": True,
        }

    except Exception as error:
        print(error)
        return {
            "error": True,
            "mensaje": "Ocurrio un error al actualizar el proveedor",
            "alert": True,
        }
