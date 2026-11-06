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
    obra_id = fields.IntField(description="ID o referencia a la obra de destino")
    tecnico_id = fields.IntField(description="Técnico responsable que recibe el material")
    usuario_id = fields.IntField(description="Bodeguero o usuario que registra el egreso en el sistema")
    fecha_registro = fields.DatetimeField(auto_now_add=True, description="Fecha y hora exacta del registro")

    class Meta:
        table = "egresos"

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
        description="Cabecera del egreso a la que pertenece este detalle"
    )
    articulo = fields.ForeignKeyField(
        "models.Articulos", 
        related_name="egresos_articulo", 
        description="Artículo del inventario que está siendo egresado"
    )
    cantidad = fields.IntField(description="Cantidad de unidades retiradas")
    costo_unitario = fields.DecimalField(max_digits=10, decimal_places=2, default=0.0, description="Costo unitario de salida")

    class Meta:
        table = "detalle_egreso"

    def __str__(self):
        return f"Detalle {self.id}: {self.cantidad} unidades del artículo ID {self.articulo}"