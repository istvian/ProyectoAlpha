from decimal import Decimal

from tortoise import fields
from tortoise.models import Model


class Articulo(Model):
    """Producto controlado en el inventario de bodega.

    Relaciones: cada artículo puede tener cero o una categoría y puede aparecer
    en muchas líneas de compra, egreso y solicitud, además de muchos
    movimientos de Cardex.
    Justificación: el PDF Alpha A, pp. 1-2, solicita centralizar el inventario,
    mantener su catálogo y prevenir quiebres mediante stock mínimo/crítico.
    """

    id = fields.IntField(primary_key=True)
    codigo_sku = fields.CharField(max_length=50, unique=True)
    codigo_barras = fields.CharField(max_length=100, null=True, unique=True)
    descripcion = fields.CharField(max_length=255)
    categoria = fields.ForeignKeyField(
        "models.CategoriaArticulo",
        related_name="articulos",
        null=True,
        on_delete=fields.RESTRICT,
    )
    unidad_medida = fields.CharField(max_length=30, default="UNIDAD")
    ubicacion = fields.CharField(max_length=100, null=True)
    sector_bodega = fields.CharField(max_length=50, null=True)
    stock_actual = fields.DecimalField(
        max_digits=12, decimal_places=3, default=Decimal("0")
    )
    stock_minimo = fields.DecimalField(
        max_digits=12, decimal_places=3, default=Decimal("5")
    )
    costo_promedio_ponderado = fields.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    activo = fields.BooleanField(default=True)
    especificaciones_tecnicas = fields.JSONField(default=dict)
    creado_en = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "articulos"
        indexes = (("categoria",),)

    def __str__(self):
        return f"{self.codigo_sku} - {self.descripcion}"
