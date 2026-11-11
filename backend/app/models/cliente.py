from tortoise import fields, models


class Cliente(models.Model):
    id = fields.IntField(pk=True)
    rut = fields.CharField(max_length=20, unique=True)
    razon_social = fields.CharField(max_length=150)
    giro_comercial = fields.CharField(max_length=150)
    direccion = fields.CharField(max_length=255)
    region = fields.CharField(max_length=100)
    comuna = fields.CharField(max_length=100)
    ciudad = fields.CharField(max_length=100)
    representante_legal = fields.CharField(max_length=150)
    rut_representante = fields.CharField(max_length=20)
    # SQLite stores this JSON document as TEXT; use PostgreSQL JSONB if migrating databases.
    contactos_jsonb = fields.TextField(null=True)

    class Meta:
        table = "clientes"

    def __str__(self):
        return f"{self.razon_social} ({self.rut})"
