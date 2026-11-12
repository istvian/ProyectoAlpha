from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr
from tortoise.exceptions import IntegrityError
from db import db
from models.obra import Obra
from models.user import User
from middlewares.jwt_helper import check_user, validar_rol, decode_jwt
from schemas.roles import Roles

router = APIRouter()


class ObraBaseModel(BaseModel):
    id: int | None = None
    codigo_obra: str
    nombre_obra: str
    tipo_servicio: str
    tecnico_responsable_mail: str
    enabled: bool
    fecha_creacion: str


@router.get("", dependencies=[Depends(check_user(Roles.finanzas))])
async def get_obras(request: Request, response: Response):
    try:
        obras = await Obra.all().prefetch_related("tecnico_responsable")
        data = []
        for obra in obras:
            data.append(
                {
                    "id": obra.id,
                    "codigo_obra": obra.codigo_obra,
                    "nombre_obra": obra.nombre_obra,
                    "tipo_servicio": obra.tipo_servicio,
                    "tecnico_responsable_mail": (
                        obra.tecnico_responsable.correo
                        if obra.tecnico_responsable
                        else None
                    ),
                    "tecnico_responsable_id": obra.tecnico_responsable_id,  # type: ignore
                    "enabled": obra.enabled,
                    "fecha_creacion": obra.fecha_creacion,
                }
            )
        return {"error": False, "mensaje": "Lectura completa", "data": data}

    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


@router.post("", dependencies=[Depends(check_user(Roles.finanzas))])
async def insert_obra(body: ObraBaseModel, request: Request, response: Response):
    try:
        user = await User.get_or_none(correo=body.tecnico_responsable_mail)
        if not user:
            return {
                "error": True,
                "mensaje": "No existe el técnico",
            }
        ultimaObra = await Obra.all().last()
        id = ultimaObra.id + 1 if ultimaObra is not None else 1
        creado = await Obra.create(
            codigo_obra=f"OBR-{id}",
            nombre_obra=body.nombre_obra,
            tipo_servicio=body.tipo_servicio,
            tecnico_responsable=user,
            enabled=True,
        )
        if creado:
            return {
                "error": False,
                "mensaje": "Obra creada correctamente",
            }
        else:
            return {
                "error": True,
                "mensaje": "Ocurrio un error al crear el proveedor",
            }
    except Exception as error:
        print(error)
        return {"error": True, "mensaje": str(error)}


@router.patch("", dependencies=[Depends(check_user(Roles.finanzas))])
async def update_proveedor(body: ObraBaseModel, request: Request, response: Response):
    try:
        user = await User.get_or_none(correo=body.tecnico_responsable_mail)
        if not user:
            return {
                "error": True,
                "mensaje": "No existe el técnico",
            }
        obra = await Obra.get(id=body.id)
        obra.codigo_obra = body.codigo_obra
        obra.nombre_obra = body.nombre_obra
        obra.tipo_servicio = body.tipo_servicio
        obra.tecnico_responsable = user
        obra.enabled = body.enabled
        await obra.save()

        return {
            "error": False,
            "mensaje": "Obra actualizada correctamente",
        }

    except Exception as error:
        print(error)
        return {
            "error": True,
            "mensaje": "Ocurrio un error al actualizar la obra",
            "alert": True,
        }
