from tortoise import fields
from tortoise.models import Model


class AuditoriaCuentaBancaria(Model):
    """Historial de altas y cambios en cuentas bancarias de proveedores.

    Relaciones: usuario referencia al autor del evento; cuenta_id y proveedor_id
    son referencias lógicas sin FK, para conservar el registro aunque la cuenta
    cambie de estado o deje de existir. Un usuario puede generar muchos eventos.
    Justificación: el PDF Alpha A, pp. 4 y 6, contempla la gestión de cuentas
    bancarias y exige auditar quién realizó cada cambio y cuándo.
    """

    id = fields.BigIntField(primary_key=True)
    cuenta_id = fields.IntField()
    proveedor_id = fields.IntField()
    usuario = fields.ForeignKeyField(
        "models.User",
        related_name="cambios_cuentas_bancarias",
        on_delete=fields.RESTRICT,
    )
    accion = fields.CharField(max_length=10)
    creado_en = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "auditoria_cuentas_bancarias"

    def __str__(self):
        return f"Auditoría de cuenta #{self.cuenta_id} - {self.accion}"
