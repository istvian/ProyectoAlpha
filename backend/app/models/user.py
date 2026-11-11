from tortoise.models import Model
from tortoise import fields


class User(Model):
    """Cuenta del sistema.

    Relaciones: muchos usuarios pertenecen a un rol; un usuario puede crear
    compras, egresos, movimientos de inventario, solicitudes y acuses.
    Justificación: el PDF Alpha A, p. 4, «Actores Principales y Matriz de
    Acceso», define perfiles diferenciados; p. 6 exige autenticación basada
    en roles.
    """

    id = fields.IntField(primary_key=True)
    rut = fields.CharField(max_length=12, null=True, unique=True)
    nombre = fields.CharField(max_length=100)
    correo = fields.CharField(max_length=150, unique=True)
    password = fields.CharField(max_length=255, source_field="password_hash")
    rol = fields.ForeignKeyField(
        "models.Rol",
        related_name="usuarios",
        on_delete=fields.RESTRICT,
    )
    activo = fields.BooleanField(default=True)
    intentos_fallidos = fields.IntField(default=0)
    bloqueado_hasta = fields.DatetimeField(null=True)
    ultimo_ingreso = fields.DatetimeField(null=True)
    password_modificado_en = fields.DatetimeField(auto_now_add=True)
    creado_en = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "usuarios"
        indexes = (("rol",),)

    def __str__(self):
        return f"{self.nombre} (usuario #{self.id})"
