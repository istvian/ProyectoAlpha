from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from middlewares.jwt_helper import check_user
from models.obra import Obra
from models.proveedor import Articulos
from models.solicitud_material import SolicitudMaterial, TipoSolicitud
from models.user import User
from schemas.roles import Roles

router = APIRouter(tags=["Solicitudes de material"])


class SolicitudCompraCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    articulo_id: int | None = Field(default=None, gt=0, le=2147483647, strict=True)
    nombre_articulo: str | None = Field(default=None, max_length=150, strict=True)
    descripcion_articulo: str | None = Field(default=None, max_length=255, strict=True)
    cantidad: int = Field(gt=0, le=2147483647, strict=True)
    obra_id: int | None = Field(default=None, gt=0, le=2147483647, strict=True)
    motivo: str = Field(min_length=1, max_length=2000, strict=True)

    @field_validator("nombre_articulo", "descripcion_articulo", "motivo")
    @classmethod
    def limpiar_texto(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @model_validator(mode="after")
    def validar_articulo_y_motivo(self) -> "SolicitudCompraCreate":
        if not self.motivo:
            raise ValueError("El motivo es obligatorio.")
        if self.articulo_id is not None:
            if self.nombre_articulo is not None or self.descripcion_articulo is not None:
                raise ValueError("Indique un artículo existente o uno nuevo, no ambos.")
        elif not self.nombre_articulo:
            raise ValueError("Indique el nombre del artículo nuevo.")
        return self


async def _usuario_actual(request: Request) -> User:
    usuario = await User.get_or_none(correo=request.state.usuario, enabled=True)
    if not usuario or usuario.rol_id not in (Roles.bodega.value, Roles.admin.value):
        raise HTTPException(status_code=401, detail="La cuenta no existe, está deshabilitada o su rol cambió.")
    return usuario


async def _serializar(solicitud: SolicitudMaterial) -> dict:
    await solicitud.fetch_related("articulo", "obra")
    return {
        "id": solicitud.id,
        "tipo_solicitud": solicitud.tipo_solicitud.value,
        "prioridad": solicitud.prioridad.value,
        "estado": solicitud.estado.value,
        "articulo_id": solicitud.articulo_id,
        "codigo_sku": solicitud.articulo.codigo_sku if solicitud.articulo else None,
        "nombre_articulo": solicitud.nombre_articulo,
        "descripcion_articulo": solicitud.descripcion_articulo,
        "cantidad": solicitud.cantidad,
        "obra_id": solicitud.obra_id,
        "obra": solicitud.obra.nombre_obra if solicitud.obra else None,
        "motivo": solicitud.motivo,
        "fecha_creacion": solicitud.fecha_creacion.isoformat(),
        "fecha_revision": solicitud.fecha_revision.isoformat() if solicitud.fecha_revision else None,
        "comentario_revision": solicitud.comentario_revision,
    }


@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[Depends(check_user(Roles.bodega))])
async def crear_solicitud(body: SolicitudCompraCreate, request: Request):
    usuario = await _usuario_actual(request)
    articulo = None
    if body.articulo_id is not None:
        articulo = await Articulos.get_or_none(id=body.articulo_id)
        if not articulo:
            raise HTTPException(status_code=404, detail="El artículo no existe.")
    obra = None
    if body.obra_id is not None:
        obra = await Obra.get_or_none(id=body.obra_id, enabled=True)
        if not obra:
            raise HTTPException(status_code=404, detail="La obra no existe o está inactiva.")

    solicitud = await SolicitudMaterial.create(
        tipo_solicitud=TipoSolicitud.COMPRA_BODEGA,
        solicitante=usuario,
        articulo=articulo,
        nombre_articulo=articulo.nombre if articulo else body.nombre_articulo,
        descripcion_articulo=articulo.descripcion if articulo else body.descripcion_articulo or None,
        cantidad=body.cantidad,
        obra=obra,
        motivo=body.motivo,
    )
    return {"error": False, "mensaje": "Solicitud registrada.", "data": await _serializar(solicitud)}


@router.get("", dependencies=[Depends(check_user(Roles.bodega))])
async def listar_mis_solicitudes(request: Request):
    usuario = await _usuario_actual(request)
    solicitudes = await SolicitudMaterial.filter(solicitante_id=usuario.id).order_by("-fecha_creacion", "-id")
    return {
        "error": False,
        "mensaje": "Solicitudes consultadas.",
        "data": [await _serializar(solicitud) for solicitud in solicitudes],
    }
