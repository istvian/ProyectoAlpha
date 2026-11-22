from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field, field_validator

from middlewares.jwt_helper import check_user
from models.ajustes_operativos import Merma
from models.cardex_log import CardexLog, TipoMovimiento
from models.obra import Obra
from models.user import User
from schemas.roles import Roles
from services.stock_service import descontar_existencias
from services.operacion_idempotente import ejecutar_idempotente

router = APIRouter(tags=["Mermas"])


class MermaCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    articulo_id: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)
    obra_id: int | None = Field(default=None, gt=0)
    motivo: str = Field(..., min_length=1, max_length=255, strict=True)

    @field_validator("motivo")
    @classmethod
    def validar_motivo(cls, value: str) -> str:
        motivo = value.strip()
        if not motivo:
            raise ValueError("El motivo de la merma es obligatorio.")
        return motivo


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(check_user(Roles.bodega))],
)
async def registrar_merma(
    body: MermaCreateSchema,
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
        movimiento = await CardexLog.create(
            producto=articulo,
            usuario=usuario,
            tipo_movimiento=TipoMovimiento.MERMA,
            cantidad=body.cantidad,
            saldo_resultante=articulo.stock_actual,
            obra=obra,
            motivo_justificacion=body.motivo,
            costo_unitario=costo_unitario,
            saldo_valorizado=Decimal(articulo.stock_actual) * costo_unitario,
        )
        merma = await Merma.create(
            articulo=articulo, cantidad=body.cantidad, motivo=body.motivo,
            obra=obra, usuario=usuario, cardex=movimiento,
        )
        return {
            "error": False,
            "mensaje": "Merma registrada; existencias y Cardex actualizados.",
            "data": {
                "id": merma.id,
                "cardex_id": movimiento.id,
                "articulo_id": articulo.id,
                "articulo": articulo.nombre,
                "cantidad": merma.cantidad,
                "motivo": merma.motivo,
                "obra_id": obra.id if obra else None,
                "obra": obra.nombre_obra if obra else None,
                "usuario": usuario.nombre,
                "stock_resultante": articulo.stock_actual,
                "fecha": merma.fecha.isoformat(),
            },
        }

    return await ejecutar_idempotente(
        clave, "MERMA", body.model_dump(), usuario, registrar
    )
