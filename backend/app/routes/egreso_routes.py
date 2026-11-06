"""
Módulo de Rutas para la Gestión de Egresos (HU-02)
Expone los endpoints HTTP para el registro seguro de salidas de material con control atómico y validación de stock.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from tortoise.transactions import atomic
from typing import List
from pydantic import BaseModel, Field

from middlewares.jwt_helper import check_user
from models.proveedor import Articulos
from models.egreso import Egreso, DetalleEgreso
from schemas.roles import Roles

# Configuración del enrutador de FastAPI
router = APIRouter(tags=["Egresos"])


class ItemEgresoSchema(BaseModel):
    """Esquema Pydantic para validar cada artículo individual dentro de la solicitud de egreso."""

    producto_id: int = Field(..., description="ID único del artículo en inventario")
    cantidad: int = Field(
        ..., gt=0, description="Cantidad a egresar (debe ser mayor a 0)"
    )


class EgresoSchema(BaseModel):
    """Esquema Pydantic para la validación de la solicitud general de egreso a obra."""

    obra_id: int = Field(..., description="ID de la obra de destino")
    tecnico_id: int = Field(..., description="ID del técnico receptor")
    usuario_id: int = Field(
        ..., description="ID del usuario/bodeguero que opera el sistema"
    )
    detalles: List[ItemEgresoSchema] = Field(
        ..., description="Lista de artículos e ítems a egresar"
    )


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(check_user(Roles.bodega))],
)
@atomic()
async def registrar_egreso(data: EgresoSchema):
    """
    Registra un egreso de materiales de bodega de forma atómica (ACID).

    Proceso:
    1. Valida la existencia de cada artículo solicitado en la base de datos[cite: 3].
    2. Comprueba en tiempo real que el stock actual sea suficiente[cite: 3].
    3. Crea la cabecera del egreso y sus respectivos detalles[cite: 3].
    4. Actualiza (descuenta) el stock actual del inventario de forma segura[cite: 3].
    Si ocurre cualquier fallo, se ejecuta un rollback automático garantizando la integridad de los datos.
    """
    try:
        # --- PASO 1: VALIDACIÓN DE EXISTENCIAS Y STOCK ---
        for item in data.detalles:
            articulo = await Articulos.get_or_none(id=item.producto_id)
            if not articulo:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"El artículo con ID {item.producto_id} no existe en el inventario.",
                )

            if articulo.stock_actual < item.cantidad:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Stock insuficiente para el artículo '{articulo.descripcion}'. "
                        f"Stock actual: {articulo.stock_actual}, solicitado: {item.cantidad}."
                    ),
                )

        # --- PASO 2: CREACIÓN DE LA CABECERA DEL EGRESO ---
        nuevo_egreso = await Egreso.create(
            obra_id=data.obra_id, tecnico_id=data.tecnico_id, usuario_id=data.usuario_id
        )

        # --- PASO 3: PROCESAMIENTO DE DETALLES Y DESCUENTO DE STOCK ---
        for item in data.detalles:
            articulo = await Articulos.get(id=item.producto_id)

            # Registrar línea de detalle asociada al egreso
            await DetalleEgreso.create(
                egreso=nuevo_egreso,
                articulo=articulo,
                cantidad=item.cantidad,
                costo_unitario=0.0,
            )

            # Rebaja de stock en tiempo real
            articulo.stock_actual -= item.cantidad
            await articulo.save()

        return {
            "success": True,
            "message": "Egreso de materiales registrado exitosamente y stock actualizado de forma atómica.",
            "egreso_id": nuevo_egreso.id,
        }

    except HTTPException as he:
        # Propaga las excepciones HTTP controladas (ej. 404, 400) para forzar el rollback atómico
        raise he
    except Exception as e:
        # Captura cualquier error crítico no controlado
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error crítico al procesar el egreso (Rollback ejecutado): {str(e)}",
        )
