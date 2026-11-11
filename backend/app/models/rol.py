from tortoise.models import Model
from tortoise import fields


class Rol(Model):
    """Perfil de acceso asignable a varias cuentas.

    Relaciones: un rol tiene muchos usuarios y se vincula con muchos permisos
    mediante la tabla intermedia roles_permisos.
    Justificación: el PDF Alpha A, pp. 3-4, requiere perfiles diferenciados
    para administración, finanzas, bodega y supervisión.
    """

    id = fields.IntField(primary_key=True)
    nombre = fields.CharField(max_length=50, unique=True)
    descripcion = fields.TextField(null=True)
    creado_en = fields.DatetimeField(auto_now_add=True)
    permisos = fields.ManyToManyField(
        "models.Permiso",
        through="roles_permisos",
        forward_key="permiso_id",
        backward_key="rol_id",
        related_name="roles",
    )

    class Meta:
        table = "roles"

    def __str__(self):
        return self.nombre


class Permiso(Model):
    """Acción autorizable dentro del sistema.

    Relaciones: muchos permisos pueden asignarse a muchos roles mediante
    roles_permisos.
    Justificación: el PDF Alpha A, pp. 3-4, establece módulos y capacidades
    distintas por perfil; esta entidad permite representar esas asignaciones.
    """

    id = fields.IntField(primary_key=True)
    codigo = fields.CharField(max_length=100, unique=True)
    descripcion = fields.TextField(null=True)
    creado_en = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "permisos"

    def __str__(self):
        return self.codigo
