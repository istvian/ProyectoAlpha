from tortoise import fields
from tortoise.models import Model


class Cliente(Model):
    """Cliente mandante asociado a proyectos u obras.

    Relaciones: un cliente puede estar asociado a muchas obras; una obra puede
    tener cero o un cliente normalizado.
    Justificación: el PDF Alpha A, p. 2, «Gestión de Entidades», y p. 4,
    «Gestión de Proveedores y Clientes», contempla clientes mandantes con
    información tributaria y comercial.
    """

    id = fields.IntField(primary_key=True)
    rut = fields.CharField(max_length=12, null=True, unique=True)
    razon_social = fields.CharField(max_length=150)
    giro = fields.CharField(max_length=150, null=True)
    activo = fields.BooleanField(default=True)
    creado_en = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "clientes"

    def __str__(self):
        return self.razon_social
