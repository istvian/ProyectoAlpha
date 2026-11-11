from tortoise import fields
from tortoise.models import Model


class Proveedor(Model):
    """Entidad que suministra los productos registrados en compras.

    Relaciones: un proveedor puede tener muchas facturas, contactos y cuentas
    bancarias; cada registro asociado pertenece a un proveedor.
    Justificación: el PDF Alpha A, p. 2, «Gestión de Entidades», y p. 4,
    «Gestión de Proveedores y Clientes», requieren mantener sus datos
    tributarios y comerciales para vincularlos a las compras.
    """

    id = fields.IntField(primary_key=True)
    rut = fields.CharField(max_length=12, unique=True)
    razon_social = fields.CharField(max_length=150)
    activo = fields.BooleanField(default=True)
    giro = fields.CharField(max_length=150, null=True)
    creado_en = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "proveedores"

    def __str__(self):
        return self.razon_social
