"""
Módulo de Modelos para la Gestión de Egresos de Materiales (HU-02)
Define la estructura relacional de la cabecera del egreso y sus respectivos ítems o detalles.
"""

from tortoise import fields, models


class Egreso(models.Model):
    """
    Modelo que representa la cabecera de un egreso de materiales hacia una obra.
    Registra el contexto operativo del movimiento de inventario.
    """
    id = fields.IntField(pk=True)
    # Obra data (code, name, client, and budget reference) is reached through this FK
    # rather than copied here, preserving the normalized relationship.
    obra = fields.ForeignKeyField(
        "models.Obra",
        related_name="egresos",
        on_delete=fields.RESTRICT,
        description="Obra a la que corresponde el egreso",
    )
    responsable_entrega = fields.CharField(max_length=150)
    responsable_recepcion = fields.CharField(max_length=150)
    usuario = fields.ForeignKeyField(
        "models.User",
        related_name="egresos_registrados",
        on_delete=fields.RESTRICT,
        description="Usuario que registra el egreso",
    )
    fecha_salida = fields.DatetimeField(auto_now_add=True)
    # SQLite stores serialized JSON as TEXT; PostgreSQL can use JSONB after migration.
    evidencia_adjunta = fields.TextField(null=True)

    class Meta:
        table = "egresos_obra"

    def __str__(self):
        return f"Egreso #{self.id} - Obra {self.obra_id}"


class DetalleEgreso(models.Model):
    """
    Modelo que representa el detalle por ítem de un egreso de materiales.
    Mantiene la relación directa con el artículo sustraído y la cantidad despachada.
    """
    id = fields.IntField(pk=True)
    egreso = fields.ForeignKeyField(
        "models.Egreso",
        related_name="detalles",
        on_delete=fields.RESTRICT,
        description="Cabecera del egreso a la que pertenece este detalle",
    )
    articulo = fields.ForeignKeyField(
        "models.Articulos",
        related_name="egresos_articulo",
        on_delete=fields.RESTRICT,
        description="Artículo del inventario que está siendo egresado",
    )
    cantidad_solicitada = fields.IntField(
        description="Cantidad de unidades solicitadas"
    )
    precio_lista_vigente = fields.DecimalField(
        max_digits=10,
        decimal_places=2,
        description="Precio de lista vigente al momento del egreso",
    )

    class Meta:
        table = "detalle_egreso"

    def __str__(self):
        return (
            f"Detalle {self.id}: {self.cantidad_solicitada} unidades "
            f"del artículo ID {self.articulo}"
        )