from tortoise import fields, models


class Merma(models.Model):
    id = fields.IntField(pk=True)
    articulo = fields.ForeignKeyField(
        "models.Articulos",
        related_name="mermas",
        on_delete=fields.RESTRICT,
    )
    cantidad = fields.IntField()
    motivo = fields.CharField(max_length=255)
    obra = fields.ForeignKeyField(
        "models.Obra",
        related_name="mermas",
        null=True,
        on_delete=fields.RESTRICT,
    )
    cardex = fields.OneToOneField(
        "models.CardexLog",
        related_name="merma_origen",
        null=True,
        on_delete=fields.RESTRICT,
    )
    usuario = fields.ForeignKeyField(
        "models.User",
        related_name="mermas_registradas",
        on_delete=fields.RESTRICT,
    )
    fecha = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "mermas"


class DevolucionProveedor(models.Model):
    id = fields.IntField(pk=True)
    proveedor = fields.ForeignKeyField(
        "models.Proveedores",
        related_name="devoluciones",
        on_delete=fields.RESTRICT,
    )
    articulo = fields.ForeignKeyField(
        "models.Articulos",
        related_name="devoluciones_proveedor",
        on_delete=fields.RESTRICT,
    )
    cantidad = fields.IntField()
    motivo = fields.CharField(max_length=255)
    fecha = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "devoluciones_proveedor"


class UsoInterno(models.Model):
    id = fields.IntField(pk=True)
    destino_material = fields.CharField(max_length=255)
    responsable_solicitud = fields.CharField(max_length=150)
    articulo = fields.ForeignKeyField(
        "models.Articulos",
        related_name="usos_internos",
        on_delete=fields.RESTRICT,
    )
    cantidad = fields.IntField()
    obra = fields.ForeignKeyField(
        "models.Obra",
        related_name="usos_internos",
        null=True,
        on_delete=fields.RESTRICT,
    )
    cardex = fields.OneToOneField(
        "models.CardexLog",
        related_name="uso_interno_origen",
        null=True,
        on_delete=fields.RESTRICT,
    )
    fecha = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "uso_interno"


class OperacionIdempotente(models.Model):
    clave = fields.CharField(pk=True, max_length=36)
    usuario = fields.ForeignKeyField(
        "models.User", related_name="operaciones_idempotentes", on_delete=fields.RESTRICT
    )
    huella = fields.CharField(max_length=64)
    respuesta = fields.JSONField(null=True)

    class Meta:
        table = "operaciones_idempotentes"
