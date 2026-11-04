from tortoise.models import Model
from tortoise import fields


class Articulos(Model):
    id = fields.IntField(pk=True)
    codigo_sku = fields.CharField(max_length=50, unique=True)
    descripcion = fields.CharField(max_length=255)
    stock_actual = fields.IntField(default=0)
    stock_minimo = fields.IntField(default=0)
    especificaciones_tecnicas = fields.JSONField(null=True)

    class Meta:
        table = "articulos"

    def __str__(self):
        return f"{self.codigo_sku} - {self.descripcion}"


class Proveedores(Model):
    id = fields.IntField(pk=True)
    rut = fields.CharField(max_length=20, unique=True)
    razon_social = fields.CharField(max_length=150)
    deleted = fields.BooleanField()

    class Meta:
        table = "proveedores"

    def __str__(self):
        return self.razon_social


class FacturasProveedor(Model):
    id = fields.IntField(pk=True)
    proveedor = fields.ForeignKeyField(
        "models.Proveedores", related_name="facturas", on_delete=fields.CASCADE
    )
    numero_factura = fields.CharField(max_length=50)
    datos_dte = fields.JSONField(null=True)

    class Meta:
        table = "facturas_proveedor"

    def __str__(self):
        return f"Factura {self.numero_factura}"


class DetalleFactura(Model):
    id = fields.IntField(pk=True)
    factura = fields.ForeignKeyField(
        "models.FacturasProveedor", related_name="detalles", on_delete=fields.CASCADE
    )
    articulo = fields.ForeignKeyField(
        "models.Articulos", related_name="detalles_factura", on_delete=fields.RESTRICT
    )
    cantidad = fields.IntField()

    class Meta:
        table = "detalle_factura"

    def __str__(self):
        return f"Detalle {self.id} - Cantidad: {self.cantidad}"
