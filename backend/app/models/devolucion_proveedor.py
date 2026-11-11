from tortoise import fields
from tortoise.models import Model


class DevolucionProveedor(Model):
    """Vínculo que permite rastrear una devolución a proveedor.

    Relaciones: cada devolución referencia una nota de crédito, la línea
    devuelta, la línea de compra original y su movimiento de Cardex. Las
    restricciones únicas del esquema limitan a una devolución por línea de
    nota y por movimiento.
    Justificación: el PDF Alpha A, pp. 1, 3 y 5, identifica las devoluciones
    como parte del flujo de inventario y exige conservar su trazabilidad.
    """

    id = fields.IntField(primary_key=True)
    nota_credito = fields.ForeignKeyField(
        "models.FacturaProveedor",
        related_name="devoluciones_proveedor",
        on_delete=fields.RESTRICT,
    )
    detalle_nota = fields.ForeignKeyField(
        "models.DetalleFactura",
        related_name="devoluciones_como_nota",
        unique=True,
        on_delete=fields.RESTRICT,
    )
    detalle_compra_origen = fields.ForeignKeyField(
        "models.DetalleFactura",
        related_name="devoluciones_como_origen",
        on_delete=fields.RESTRICT,
    )
    movimiento_cardex = fields.ForeignKeyField(
        "models.Cardex",
        related_name="devoluciones_proveedor",
        unique=True,
        on_delete=fields.RESTRICT,
    )
    cantidad = fields.DecimalField(max_digits=12, decimal_places=3)
    creado_en = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "devoluciones_proveedor"

    def __str__(self):
        return f"Devolución #{self.id} - Nota de crédito #{self.nota_credito_id}"
