from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field, field_validator

from middlewares.jwt_helper import check_user
from models.ajustes_operativos import UsoInterno
from models.cardex_log import CardexLog, TipoMovimiento
from models.obra import Obra
from models.user import User
from schemas.roles import Roles
from services.stock_service import descontar_existencias
from services.operacion_idempotente import ejecutar_idempotente

router = APIRouter(tags=["Uso interno"])


class UsoInternoCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    articulo_id: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)
    obra_id: int | None = Field(default=None, gt=0)
    destino_material: str = Field(..., min_length=1, max_length=255, strict=True)
    responsable_solicitud: str = Field(
        ..., min_length=1, max_length=150, strict=True
    )

    @field_validator("destino_material", "responsable_solicitud")
    @classmethod
    def validar_texto_obligatorio(cls, value: str) -> str:
        texto = value.strip()
        if not texto:
            raise ValueError("Este campo es obligatorio.")
        return texto


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(check_user(Roles.bodega))],
)
async def registrar_uso_interno(
    body: UsoInternoCreateSchema,
    request: Request,
    clave: UUID = Header(..., alias="Idempotency-Key"),
):
    usuario = await User.get_or_none(
        correo=request.state.usuario,
        enabled=True,
    )
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta autenticada ya no existe o está deshabilitada.",
        )

    async def registrar():
        obra = None
        if body.obra_id is not None:
            obra = await Obra.get_or_none(id=body.obra_id, enabled=True)
            if not obra:
                raise HTTPException(404, "La obra no existe o está inactiva.")
        articulo = await descontar_existencias(body.articulo_id, body.cantidad)
        costo_unitario = Decimal(str(articulo.precio_medio_ponderado or 0))
        motivo = (
            f"Consumo interno para {body.destino_material}. "
            f"Solicitado por {body.responsable_solicitud}."
        )
        movimiento = await CardexLog.create(
            producto=articulo, usuario=usuario, tipo_movimiento=TipoMovimiento.USO_INTERNO,
            cantidad=body.cantidad, saldo_resultante=articulo.stock_actual, obra=obra,
            motivo_justificacion=motivo, costo_unitario=costo_unitario,
            saldo_valorizado=Decimal(articulo.stock_actual) * costo_unitario,
        )
        uso = await UsoInterno.create(
            articulo=articulo, cantidad=body.cantidad, obra=obra, cardex=movimiento,
            destino_material=body.destino_material,
            responsable_solicitud=body.responsable_solicitud,
        )
        return {
            "error": False,
            "mensaje": "Consumo interno registrado; existencias y Cardex actualizados.",
            "data": {
                "id": uso.id,
                "cardex_id": movimiento.id,
                "articulo_id": articulo.id,
                "articulo": articulo.nombre,
                "cantidad": uso.cantidad,
                "destino_material": uso.destino_material,
                "responsable_solicitud": uso.responsable_solicitud,
                "obra_id": obra.id if obra else None,
                "obra": obra.nombre_obra if obra else None,
                "stock_resultante": articulo.stock_actual,
                "fecha": uso.fecha.isoformat(),
            },
        }

    return await ejecutar_idempotente(
        clave, "USO_INTERNO", body.model_dump(), usuario, registrar
    )
