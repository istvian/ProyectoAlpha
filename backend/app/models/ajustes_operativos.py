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
    fecha = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "uso_interno"
