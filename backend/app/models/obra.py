from tortoise import fields, models


class Obra(models.Model):
    id = fields.IntField(pk=True)
    codigo_obra = fields.CharField(max_length=50, unique=True)
    nombre_obra = fields.CharField(max_length=150)
    tipo_servicio = fields.CharField(max_length=100)
    tecnico_responsable = fields.ForeignKeyField(
        "models.User",
        related_name="obras_responsable",
        on_delete=fields.RESTRICT,
    )
    enabled = fields.BooleanField(default=True)
    fecha_creacion = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "obras"

    def __str__(self):
        return f"{self.codigo_obra} - {self.nombre_obra}"
