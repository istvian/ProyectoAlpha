from tortoise import fields
from tortoise.models import Model


class AuditoriaUsuario(Model):
    """Historial de cambios relacionados con cuentas de usuario.

    Relaciones: la columna usuario_id identifica lógicamente al usuario, pero
    no es una FK; así el historial puede conservarse aunque la cuenta cambie
    o deje de existir. Un usuario puede tener múltiples eventos.
    Justificación: el PDF Alpha A, p. 6, exige registrar quién hizo cada acción,
    cuándo ocurrió y qué datos cambiaron.
    """

    id = fields.IntField(primary_key=True)
    usuario_id = fields.IntField()
    accion = fields.CharField(max_length=20)
    datos_anteriores = fields.JSONField(null=True)
    datos_nuevos = fields.JSONField(null=True)
    ejecutado_por = fields.CharField(max_length=150)
    fecha = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "auditoria_usuarios"
        indexes = (("usuario_id",), ("fecha",))

    def __str__(self):
        return f"Auditoría de usuario #{self.usuario_id} - {self.accion}"
