from tortoise.models import Model
from tortoise import fields


class Articulos(Model):
    id = fields.IntField(pk=True)
    codigo_sku = fields.CharField(
        max_length=50, unique=True, null=True
    )  # Opcional si se crea al vuelo
    nombre = fields.CharField(max_length=150)  # Añadido para coincidir con el frontend
    descripcion = fields.CharField(max_length=255, null=True)
    stock_actual = fields.IntField(default=0)
    stock_minimo = fields.IntField(default=0)
    precio_lista = fields.DecimalField(max_digits=12, decimal_places=2, null=True)

    class Meta:
        table = "articulos"

    def __str__(self):
        return f"{self.nombre} (Stock: {self.stock_actual})"


class Proveedores(Model):
    id = fields.IntField(pk=True)
    rut = fields.CharField(max_length=20, unique=True)
    razon_social = fields.CharField(max_length=150)
    deleted = fields.BooleanField(default=False)

    class Meta:
        table = "proveedores"

    def __str__(self):
        return self.razon_social


class DocumentosTributarios(Model):  # Renombrado / Ampliado desde FacturasProveedor
    id = fields.IntField(pk=True)
    tipo = fields.CharField(
        max_length=50
    )  # "Factura electrónica" o "Boleta electrónica"
    proveedor = fields.ForeignKeyField(
        "models.Proveedores", related_name="documentos", on_delete=fields.CASCADE
    )
    folio = fields.CharField(max_length=50)
    emision = fields.DateField()
    vencimiento = fields.DateField()
    observaciones = fields.TextField(null=True)

    # Campos financieros y descuentos sucesivos
    descuento1 = fields.DecimalField(max_digits=5, decimal_places=2, default=0)
    descuento2 = fields.DecimalField(max_digits=5, decimal_places=2, default=0)
    descuento3 = fields.DecimalField(max_digits=5, decimal_places=2, default=0)

    importe_base = fields.DecimalField(max_digits=12, decimal_places=2, default=0)
    descuento_total = fields.DecimalField(max_digits=12, decimal_places=2, default=0)
    subtotal = fields.DecimalField(max_digits=12, decimal_places=2, default=0)
    iva = fields.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = fields.DecimalField(max_digits=12, decimal_places=2, default=0)
    cantidad_productos = fields.IntField(default=0)

    class Meta:
        table = "documentos_tributarios"

    def __str__(self):
        return f"{self.tipo} - Folio: {self.folio}"


class DetalleDocumento(Model):  # Renombrado desde DetalleFactura
    id = fields.IntField(pk=True)
    documento = fields.ForeignKeyField(
        "models.DocumentosTributarios",
        related_name="detalles",
        on_delete=fields.CASCADE,
    )
    articulo = fields.ForeignKeyField(
        "models.Articulos", related_name="detalles_documento", on_delete=fields.RESTRICT
    )
    cantidad = fields.IntField()
    precio_neto = fields.DecimalField(max_digits=12, decimal_places=2)
    importe_base = fields.DecimalField(max_digits=12, decimal_places=2)
    costo_neto_unitario = fields.DecimalField(max_digits=12, decimal_places=2)
    neto_final = fields.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        table = "detalle_documento"

    def __str__(self):
        return f"Detalle {self.id} - Cantidad: {self.cantidad}"
