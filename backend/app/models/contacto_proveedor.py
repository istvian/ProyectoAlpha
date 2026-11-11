from tortoise import fields
from tortoise.models import Model


class ContactoProveedor(Model):
    """Persona de contacto asociada a un proveedor.

    Relaciones: muchos contactos pueden pertenecer a un proveedor; cada
    contacto tiene un único proveedor.
    Justificación: el PDF Alpha A, p. 2, «Gestión de Entidades», incluye
    contactos en la ficha de proveedor.
    """

    id = fields.IntField(primary_key=True)
    proveedor = fields.ForeignKeyField(
        "models.Proveedor",
        related_name="contactos",
        on_delete=fields.RESTRICT,
    )
    nombre = fields.CharField(max_length=150)
    cargo = fields.CharField(max_length=100, null=True)
    correo = fields.CharField(max_length=254, null=True)
    telefono = fields.CharField(max_length=30, null=True)
    es_principal = fields.BooleanField(default=False)
    activo = fields.BooleanField(default=True)
    creado_en = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "contactos_proveedor"
        indexes = (("proveedor", "activo"),)

    def __str__(self):
        return f"{self.nombre} - Proveedor #{self.proveedor_id}"
