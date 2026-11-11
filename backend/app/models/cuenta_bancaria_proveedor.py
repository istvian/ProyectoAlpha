from tortoise import fields
from tortoise.models import Model


class CuentaBancariaProveedor(Model):
    """Cuenta bancaria registrada para un proveedor.

    Relaciones: un proveedor puede tener varias cuentas; cada cuenta pertenece
    a un proveedor. auditoria_cuentas_bancarias conserva referencias lógicas
    a cuenta y proveedor, sin FKs para no acoplar el historial a su vigencia.
    Justificación: el PDF Alpha A, pp. 2 y 4, incluye datos bancarios en la
    ficha de proveedores.
    """

    id = fields.IntField(primary_key=True)
    proveedor = fields.ForeignKeyField(
        "models.Proveedor",
        related_name="cuentas_bancarias",
        on_delete=fields.RESTRICT,
    )
    titular = fields.CharField(max_length=150)
    rut_titular = fields.CharField(max_length=12, null=True)
    banco = fields.CharField(max_length=100)
    tipo_cuenta = fields.CharField(max_length=40)
    numero_cuenta = fields.CharField(max_length=80)
    es_principal = fields.BooleanField(default=False)
    activo = fields.BooleanField(default=True)
    creado_en = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "cuentas_bancarias_proveedor"
        indexes = (("proveedor", "activo"),)

    def __str__(self):
        return f"Cuenta #{self.id} - Proveedor #{self.proveedor_id}"
