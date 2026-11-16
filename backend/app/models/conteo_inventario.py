from enum import Enum

from tortoise import fields, models


class EstadoConteo(str, Enum):
    PENDIENTE_APROBACION = "PENDIENTE_APROBACION"
    APROBADO = "APROBADO"
    RECHAZADO = "RECHAZADO"
    SIN_DIFERENCIAS = "SIN_DIFERENCIAS"


class ConteoInventario(models.Model):
    id = fields.IntField(pk=True)
    usuario = fields.ForeignKeyField(
        "models.User",
        related_name="conteos_inventario_creados",
        on_delete=fields.RESTRICT,
    )
    resuelto_por = fields.ForeignKeyField(
        "models.User",
        related_name="conteos_inventario_resueltos",
        null=True,
        on_delete=fields.RESTRICT,
    )
    estado = fields.CharEnumField(
        EstadoConteo,
        default=EstadoConteo.PENDIENTE_APROBACION,
    )
    observaciones = fields.TextField(null=True)
    motivo_rechazo = fields.TextField(null=True)
    fecha = fields.DatetimeField(auto_now_add=True)
    fecha_revision = fields.DatetimeField(null=True)

    class Meta:
        table = "toma_inventario"


class DetalleConteoInventario(models.Model):
    id = fields.IntField(pk=True)
    toma = fields.ForeignKeyField(
        "models.ConteoInventario",
        related_name="detalles",
        on_delete=fields.RESTRICT,
    )
    producto = fields.ForeignKeyField(
        "models.Articulos",
        related_name="detalles_conteo",
        on_delete=fields.RESTRICT,
    )
    stock_teorico = fields.IntField()
    conteo_fisico = fields.IntField()
    diferencia = fields.IntField()

    class Meta:
        table = "detalle_toma_inventario"
        unique_together = (("toma", "producto"),)
