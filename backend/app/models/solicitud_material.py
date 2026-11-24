from enum import Enum

from tortoise import fields, models


class TipoSolicitud(str, Enum):
    COMPRA_BODEGA = "COMPRA_BODEGA"
    MATERIAL_TECNICO = "MATERIAL_TECNICO"


class PrioridadSolicitud(str, Enum):
    BAJA = "BAJA"
    NORMAL = "NORMAL"
    ALTA = "ALTA"


class EstadoSolicitud(str, Enum):
    PENDIENTE = "PENDIENTE"
    APROBADA = "APROBADA"
    RECHAZADA = "RECHAZADA"


class SolicitudMaterial(models.Model):
    id = fields.IntField(pk=True)
    tipo_solicitud = fields.CharEnumField(TipoSolicitud)
    prioridad = fields.CharEnumField(PrioridadSolicitud, default=PrioridadSolicitud.NORMAL)
    estado = fields.CharEnumField(EstadoSolicitud, default=EstadoSolicitud.PENDIENTE)
    solicitante = fields.ForeignKeyField(
        "models.User", related_name="solicitudes_material", on_delete=fields.RESTRICT
    )
    articulo = fields.ForeignKeyField(
        "models.Articulos", related_name="solicitudes_material",
        null=True, on_delete=fields.RESTRICT,
    )
    nombre_articulo = fields.CharField(max_length=150)
    descripcion_articulo = fields.CharField(max_length=255, null=True)
    cantidad = fields.IntField()
    obra = fields.ForeignKeyField(
        "models.Obra", related_name="solicitudes_material",
        null=True, on_delete=fields.RESTRICT,
    )
    motivo = fields.TextField()
    fecha_creacion = fields.DatetimeField(auto_now_add=True)
    revisado_por = fields.ForeignKeyField(
        "models.User", related_name="solicitudes_material_revisadas",
        null=True, on_delete=fields.RESTRICT,
    )
    fecha_revision = fields.DatetimeField(null=True)
    comentario_revision = fields.TextField(null=True)

    class Meta:
        table = "solicitudes_material"
