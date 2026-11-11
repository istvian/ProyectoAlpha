from decimal import Decimal

from tortoise import fields
from tortoise.models import Model


class Cardex(Model):
    """Registro histórico de entradas, salidas y ajustes de inventario.

    Relaciones: cada movimiento pertenece a un artículo y a un usuario; puede
    vincularse con una línea de compra, una línea de egreso, una obra o un
    movimiento revertido. Un movimiento puede tener varias reversiones.
    Justificación: el PDF Alpha A, pp. 1, 3, 5 y 6, pide trazabilidad
    inalterable de ingresos, despachos, mermas y devoluciones, con respaldo
    de costos y auditoría.
    """

    id = fields.IntField(primary_key=True)
    articulo = fields.ForeignKeyField(
        "models.Articulo",
        related_name="movimientos",
        on_delete=fields.RESTRICT,
    )
    usuario = fields.ForeignKeyField(
        "models.User",
        related_name="movimientos",
        on_delete=fields.RESTRICT,
    )
    factura_detalle = fields.ForeignKeyField(
        "models.DetalleFactura",
        related_name="movimientos",
        null=True,
        on_delete=fields.RESTRICT,
    )
    detalle_egreso = fields.ForeignKeyField(
        "models.DetalleEgreso",
        related_name="movimientos",
        null=True,
        on_delete=fields.RESTRICT,
    )
    obra = fields.ForeignKeyField(
        "models.Obra",
        related_name="movimientos",
        null=True,
        on_delete=fields.RESTRICT,
    )
    reversa_de = fields.ForeignKeyField(
        "models.Cardex",
        related_name="reversiones",
        null=True,
        on_delete=fields.RESTRICT,
    )
    tecnico_receptor_id = fields.CharField(max_length=50, null=True)
    motivo = fields.TextField()
    referencia_externa = fields.CharField(max_length=100, null=True)
    fecha_registro = fields.DatetimeField(auto_now_add=True)
    tipo_movimiento = fields.CharField(max_length=24)
    cantidad_entrada = fields.DecimalField(
        max_digits=12, decimal_places=3, default=Decimal("0")
    )
    cantidad_salida = fields.DecimalField(
        max_digits=12, decimal_places=3, default=Decimal("0")
    )
    saldo_stock = fields.DecimalField(max_digits=12, decimal_places=3)
    costo_unitario = fields.DecimalField(max_digits=12, decimal_places=2)
    saldo_valorizado = fields.DecimalField(max_digits=12, decimal_places=2)
    documento_referencia = fields.CharField(max_length=100)
    hash_integridad = fields.CharField(max_length=64)

    class Meta:
        table = "cardex"
        indexes = (
            ("articulo",),
            ("obra",),
            ("fecha_registro",),
            ("factura_detalle",),
            ("detalle_egreso",),
            ("reversa_de",),
        )

    def __str__(self):
        return f"Movimiento #{self.id} - {self.tipo_movimiento}"
