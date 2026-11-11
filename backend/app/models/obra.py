from tortoise import fields
from tortoise.models import Model


class Obra(Model):
    """Proyecto al que se asignan materiales despachados.

    Relaciones: una obra puede tener cero o un cliente y muchos egresos,
    solicitudes y movimientos de Cardex; cada uno de estos registros apunta a
    una obra cuando corresponde.
    Justificación: el PDF Alpha A, pp. 3 y 5, requiere asociar los egresos y
    sus costos a la obra específica; p. 4 contempla clientes mandantes.
    """

    id = fields.IntField(primary_key=True)
    codigo_obra = fields.CharField(max_length=50, unique=True)
    nombre = fields.CharField(max_length=150)
    cliente = fields.CharField(max_length=150, null=True)
    cliente_normalizado = fields.ForeignKeyField(
        "models.Cliente",
        source_field="cliente_id",
        related_name="obras",
        null=True,
        on_delete=fields.RESTRICT,
    )
    numero_presupuesto = fields.CharField(max_length=50, null=True)
    estado = fields.CharField(max_length=20, default="EN_PROCESO")
    creado_en = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "obras"

    def __str__(self):
        return f"{self.codigo_obra} - {self.nombre}"
