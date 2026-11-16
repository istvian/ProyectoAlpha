from enum import Enum

from tortoise import fields, models


class TipoMovimiento(str, Enum):
    ENTRADA_COMPRA = "ENTRADA_COMPRA"
    SALIDA_OBRA = "SALIDA_OBRA"
    MERMA = "MERMA"
    DEVOLUCION = "DEVOLUCION"
    USO_INTERNO = "USO_INTERNO"
    AJUSTE_INVENTARIO = "AJUSTE_INVENTARIO"


class CardexLog(models.Model):
    id = fields.IntField(pk=True)
    producto = fields.ForeignKeyField(
        "models.Articulos",
        related_name="movimientos_cardex",
        on_delete=fields.RESTRICT,
    )
    usuario = fields.ForeignKeyField(
        "models.User",
        related_name="movimientos_cardex",
        on_delete=fields.RESTRICT,
    )
    tipo_movimiento = fields.CharEnumField(TipoMovimiento)
    cantidad = fields.IntField()
    saldo_resultante = fields.IntField()
    obra = fields.ForeignKeyField(
        "models.Obra",
        related_name="movimientos_cardex",
        null=True,
        on_delete=fields.RESTRICT,
    )
    motivo_justificacion = fields.TextField()
    costo_unitario = fields.DecimalField(max_digits=10, decimal_places=2)
    saldo_valorizado = fields.DecimalField(max_digits=14, decimal_places=2)
    fecha_hora = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "cardex_logs"

    def __str__(self):
        return f"{self.tipo_movimiento.value} - producto {self.producto_id}" # type: ignore
