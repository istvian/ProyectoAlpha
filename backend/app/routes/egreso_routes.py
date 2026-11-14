"""
Módulo de Rutas para la Gestión de Egresos (HU-02)
Expone los endpoints HTTP para el registro seguro de salidas de material con control atómico y validación de stock.
"""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from tortoise.transactions import atomic
from tortoise.expressions import F
from typing import List
from pydantic import BaseModel, Field

from middlewares.jwt_helper import check_user
from models.proveedor import Articulos
from models.egreso import Egreso, DetalleEgreso
from models.obra import Obra
from models.user import User
from models.cardex_log import CardexLog, TipoMovimiento
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
        ..., min_length=1, description="Lista de artículos e ítems a egresar"
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
        # Sum duplicate product lines so the stock check covers the whole request.
        cantidades_por_articulo: dict[int, int] = {}
        for item in data.detalles:
            cantidades_por_articulo[item.producto_id] = (
                cantidades_por_articulo.get(item.producto_id, 0) + item.cantidad
            )

        # --- PASO 1: VALIDACIÓN DE EXISTENCIAS Y STOCK ---
        articulos: dict[int, Articulos] = {}
        precios_unitarios: dict[int, Decimal] = {}
        for producto_id, cantidad_solicitada in cantidades_por_articulo.items():
            articulo = await Articulos.get_or_none(id=producto_id)
            if not articulo:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"El artículo con ID {producto_id} no existe en el inventario.",
                )

            if articulo.stock_actual < cantidad_solicitada:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Stock insuficiente para el artículo '{articulo.descripcion}'. "
                        f"Stock actual: {articulo.stock_actual}, "
                        f"solicitado: {cantidad_solicitada}."
                    ),
                )

            if articulo.precio_lista is None or articulo.precio_lista < 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"El artículo '{articulo.descripcion}' no tiene un precio "
                        "de lista válido configurado."
                    ),
                )
            articulos[producto_id] = articulo
            precios_unitarios[producto_id] = articulo.precio_lista

        # --- PASO 2: VALIDACIÓN DE OBRA Y RESPONSABLES ---
        obra = await Obra.get_or_none(id=data.obra_id)
        if not obra:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La obra con ID {data.obra_id} no existe.",
            )

        usuario = await User.get_or_none(id=data.usuario_id)
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"El usuario con ID {data.usuario_id} no existe.",
            )

        tecnico = await User.get_or_none(id=data.tecnico_id)
        if not tecnico:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"El usuario receptor con ID {data.tecnico_id} no existe.",
            )

        # --- PASO 3: CREACIÓN DE LA CABECERA DEL EGRESO ---
        nuevo_egreso = await Egreso.create(
            obra=obra,
            responsable_entrega=usuario.nombre,
            responsable_recepcion=tecnico.nombre,
            usuario=usuario,
        )

        # --- PASO 4: DESCUENTO CONDICIONAL DE STOCK ---
        for producto_id, cantidad_solicitada in cantidades_por_articulo.items():
            updated = await Articulos.filter(
                id=producto_id,
                stock_actual__gte=cantidad_solicitada,
            ).update(stock_actual=F("stock_actual") - cantidad_solicitada)
            if updated != 1:
                articulo = await Articulos.get(id=producto_id)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Stock insuficiente para el artículo '{articulo.descripcion}'. "
                        f"Stock actual: {articulo.stock_actual}, "
                        f"solicitado: {cantidad_solicitada}."
                    ),
                )

        # --- PASO 5: REGISTRO DE LOS DETALLES ---
        for item in data.detalles:
            await DetalleEgreso.create(
                egreso=nuevo_egreso,
                articulo=articulos[item.producto_id],
                cantidad_solicitada=item.cantidad,
                precio_lista_vigente=articulos[item.producto_id].precio_lista,
            )

        # --- PASO 6: REGISTRO DEL MOVIMIENTO EN CARDEX ---
        for producto_id, cantidad_solicitada in cantidades_por_articulo.items():
            articulo_actualizado = await Articulos.get(id=producto_id)
            costo_unitario = precios_unitarios[producto_id]
            await CardexLog.create(
                producto=articulos[producto_id],
                usuario=usuario,
                tipo_movimiento=TipoMovimiento.SALIDA_OBRA,
                cantidad=cantidad_solicitada,
                saldo_resultante=articulo_actualizado.stock_actual,
                obra=obra,
                motivo_justificacion=(
                    f"Salida a obra {obra.codigo_obra} "
                    f"- Egreso #{nuevo_egreso.id}"
                ),
                costo_unitario=costo_unitario,
                saldo_valorizado=(
                    Decimal(articulo_actualizado.stock_actual) * costo_unitario
                ),
            )

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
