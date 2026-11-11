from tortoise import fields
from tortoise.models import Model


class AuditoriaOperacion(Model):
    """Evento genérico de auditoría producido por operaciones del esquema.

    Relaciones: tabla y registro_id forman una referencia lógica al registro
    afectado; no hay FK porque el historial cubre distintas tablas. Un registro
    operativo puede acumular múltiples eventos.
    Justificación: el PDF Alpha A, p. 6, pide una huella de creación,
    modificación o eliminación con actor, fecha y datos del cambio.
    """

    id = fields.BigIntField(primary_key=True)
    tabla = fields.CharField(max_length=100)
    registro_id = fields.TextField()
    accion = fields.CharField(max_length=10)
    datos_anteriores = fields.JSONField(null=True)
    datos_nuevos = fields.JSONField(null=True)
    ejecutado_por = fields.CharField(max_length=150)
    fecha = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "auditoria_operaciones"
        indexes = (("tabla", "registro_id"), ("fecha",))

    def __str__(self):
        return f"Auditoría #{self.id} - {self.tabla}.{self.registro_id} ({self.accion})"
