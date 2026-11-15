from enum import Enum

from tortoise import fields, models


class EstadoConteo(str, Enum):
    PENDIENTE_APROBACION = "PENDIENTE_APROBACION"
    APROBADO = "APROBADO"
    RECHAZADO = "RECHAZADO"
    SIN_DIFERENCIAS = "SIN_DIFERENCIAS"


class ConteoInventario(models.Model):
    id = fields.IntField(pk=True)
    creado_por = fields.ForeignKeyField(
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
        table = "conteos_inventario"


class DetalleConteoInventario(models.Model):
    id = fields.IntField(pk=True)
    conteo = fields.ForeignKeyField(
        "models.ConteoInventario",
        related_name="detalles",
        on_delete=fields.RESTRICT,
    )
    articulo = fields.ForeignKeyField(
        "models.Articulos",
        related_name="detalles_conteo",
        on_delete=fields.RESTRICT,
    )
    stock_sistema = fields.IntField()
    cantidad_contada = fields.IntField()
    diferencia = fields.IntField()

    class Meta:
        table = "detalle_conteo_inventario"
        unique_together = (("conteo", "articulo"),)
