from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from tortoise.transactions import atomic

from middlewares.jwt_helper import check_user
from models.ajustes_operativos import UsoInterno
from models.cardex_log import CardexLog, TipoMovimiento
from models.user import User
from schemas.roles import Roles
from services.stock_service import descontar_existencias

router = APIRouter(tags=["Uso interno"])


class UsoInternoCreateSchema(BaseModel):
    articulo_id: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)
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
@atomic()
async def registrar_uso_interno(body: UsoInternoCreateSchema, request: Request):
    usuario = await User.get_or_none(
        correo=request.state.usuario,
        enabled=True,
    )
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta autenticada ya no existe o está deshabilitada.",
        )

    articulo = await descontar_existencias(body.articulo_id, body.cantidad)
    uso = await UsoInterno.create(
        articulo=articulo,
        cantidad=body.cantidad,
        destino_material=body.destino_material,
        responsable_solicitud=body.responsable_solicitud,
    )
    costo_unitario = Decimal(str(articulo.precio_medio_ponderado or 0))
    motivo = (
        f"Consumo interno para {uso.destino_material}. "
        f"Solicitado por {uso.responsable_solicitud}."
    )
    await CardexLog.create(
        producto=articulo,
        usuario=usuario,
        tipo_movimiento=TipoMovimiento.USO_INTERNO,
        cantidad=uso.cantidad,
        saldo_resultante=articulo.stock_actual,
        obra=None,
        motivo_justificacion=motivo,
        costo_unitario=costo_unitario,
        saldo_valorizado=Decimal(articulo.stock_actual) * costo_unitario,
    )

    return {
        "error": False,
        "mensaje": "Consumo interno registrado; existencias y Cardex actualizados.",
        "data": {
            "id": uso.id,
            "articulo_id": articulo.id,
            "articulo": articulo.nombre,
            "cantidad": uso.cantidad,
            "destino_material": uso.destino_material,
            "responsable_solicitud": uso.responsable_solicitud,
            "stock_resultante": articulo.stock_actual,
            "fecha": uso.fecha.isoformat(),
        },
    }
