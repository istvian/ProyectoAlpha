from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from middlewares.jwt_helper import check_user, check_user_any
from models.obra import Obra
from models.proveedor import Articulos
from models.solicitud_material import PrioridadSolicitud, SolicitudMaterial, TipoSolicitud
from models.user import User
from schemas.roles import Roles
from tortoise.transactions import atomic

router = APIRouter(tags=["Solicitudes de material"])


class SolicitudBase(BaseModel):
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
    def validar_motivo(self) -> "SolicitudBase":
        if not self.motivo:
            raise ValueError("El motivo es obligatorio.")
        return self


class SolicitudCompraCreate(SolicitudBase):
    @model_validator(mode="after")
    def validar_articulo(self) -> "SolicitudCompraCreate":
        if self.articulo_id is not None:
            if self.nombre_articulo is not None or self.descripcion_articulo is not None:
                raise ValueError("Indique un artículo existente o uno nuevo, no ambos.")
        elif not self.nombre_articulo:
            raise ValueError("Indique el nombre del artículo nuevo.")
        return self


class SolicitudTecnicoCreate(SolicitudBase):
    obra_id: int = Field(gt=0, le=2147483647, strict=True)
    prioridad: PrioridadSolicitud

    @model_validator(mode="after")
    def validar_material(self) -> "SolicitudTecnicoCreate":
        if self.nombre_articulo is not None:
            raise ValueError("Indique una descripción para el material no catalogado.")
        if self.articulo_id is not None:
            if self.descripcion_articulo is not None:
                raise ValueError("Indique un material existente o una descripción, no ambos.")
        elif not self.descripcion_articulo:
            raise ValueError("Indique la descripción del material no catalogado.")
        return self


async def _usuario_actual(request: Request, roles: tuple[Roles, ...]) -> User:
    usuario = await User.get_or_none(correo=request.state.usuario, enabled=True)
    if not usuario or usuario.rol_id not in tuple(rol.value for rol in roles):
        raise HTTPException(status_code=401, detail="La cuenta no existe, está deshabilitada o su rol cambió.")
    return usuario


async def _buscar_articulo(articulo_id: int | None) -> Articulos | None:
    if articulo_id is None:
        return None
    articulo = await Articulos.get_or_none(id=articulo_id)
    if not articulo:
        raise HTTPException(status_code=404, detail="El artículo no existe.")
    return articulo


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
    usuario = await _usuario_actual(request, (Roles.bodega, Roles.admin))
    articulo = await _buscar_articulo(body.articulo_id)
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


@router.get("/tecnico/contexto", dependencies=[Depends(check_user(Roles.tecnico))])
async def contexto_tecnico(request: Request):
    usuario = await _usuario_actual(request, (Roles.tecnico,))
    obras = await Obra.filter(enabled=True, tecnico_responsable_id=usuario.id).order_by("nombre_obra", "id").values(
        "id", "codigo_obra", "nombre_obra"
    )
    articulos = await Articulos.all().order_by("nombre", "id").values(
        "id", "codigo_sku", "nombre"
    )
    return {"error": False, "mensaje": "Contexto consultado.", "data": {"obras": obras, "articulos": articulos}}


@router.post("/tecnico", status_code=status.HTTP_201_CREATED, dependencies=[Depends(check_user(Roles.tecnico))])
@atomic()
async def crear_solicitud_tecnico(body: SolicitudTecnicoCreate, request: Request):
    usuario = await _usuario_actual(request, (Roles.tecnico,))
    obra = await Obra.filter(
        id=body.obra_id, enabled=True, tecnico_responsable_id=usuario.id
    ).select_for_update().first()
    if not obra:
        raise HTTPException(status_code=404, detail="La obra no existe, está inactiva o no está asignada a usted.")
    articulo = await _buscar_articulo(body.articulo_id)
    solicitud = await SolicitudMaterial.create(
        tipo_solicitud=TipoSolicitud.MATERIAL_TECNICO,
        prioridad=body.prioridad,
        solicitante=usuario,
        articulo=articulo,
        nombre_articulo=articulo.nombre if articulo else "Material no catalogado",
        descripcion_articulo=articulo.descripcion if articulo else body.descripcion_articulo,
        cantidad=body.cantidad,
        obra=obra,
        motivo=body.motivo,
    )
    return {"error": False, "mensaje": "Solicitud registrada.", "data": await _serializar(solicitud)}


@router.get("", dependencies=[Depends(check_user_any((Roles.bodega, Roles.tecnico)))])
async def listar_mis_solicitudes(request: Request):
    usuario = await _usuario_actual(request, (Roles.bodega, Roles.tecnico, Roles.admin))
    solicitudes = await SolicitudMaterial.filter(solicitante_id=usuario.id).order_by("-fecha_creacion", "-id")
    return {
        "error": False,
        "mensaje": "Solicitudes consultadas.",
        "data": [await _serializar(solicitud) for solicitud in solicitudes],
    }
