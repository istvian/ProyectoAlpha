from decimal import Decimal

from tortoise import fields
from tortoise.models import Model


class FacturaProveedor(Model):
    """Encabezado de factura, guía u otro documento de compra.

    Relaciones: cada documento corresponde a un proveedor y a un usuario; tiene
    muchas líneas. Una factura puede originar documentos posteriores y tener
    como origen otro documento de compra.
    Justificación: el PDF Alpha A, pp. 2-3 y 5, requiere registrar compras
    vinculadas a proveedores, documentos tributarios, costos, IVA, descuentos
    y notas de crédito.
    """

    id = fields.IntField(primary_key=True)
    proveedor = fields.ForeignKeyField(
        "models.Proveedor",
        related_name="facturas",
        on_delete=fields.RESTRICT,
    )
    proveedor_rut_documento = fields.CharField(max_length=12)
    proveedor_razon_social_documento = fields.CharField(max_length=150)
    usuario = fields.ForeignKeyField(
        "models.User",
        related_name="facturas_creadas",
        on_delete=fields.RESTRICT,
    )
    tipo_documento = fields.CharField(max_length=20, default="FACTURA")
    documento_origen = fields.ForeignKeyField(
        "models.FacturaProveedor",
        related_name="documentos_derivados",
        null=True,
        on_delete=fields.RESTRICT,
    )
    numero_factura = fields.CharField(max_length=50)
    fecha_emision = fields.DateField()
    monto_bruto = fields.DecimalField(max_digits=12, decimal_places=2)
    descuento_cascada = fields.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0")
    )
    monto_neto = fields.DecimalField(max_digits=12, decimal_places=2)
    tasa_iva_pct = fields.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("19")
    )
    iva = fields.DecimalField(max_digits=12, decimal_places=2)
    monto_total = fields.DecimalField(max_digits=12, decimal_places=2)
    estado = fields.CharField(max_length=12, default="BORRADOR")
    datos_dte = fields.JSONField(default=dict)
    creado_en = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "facturas_proveedor"
        unique_together = (("proveedor", "tipo_documento", "numero_factura"),)

    def __str__(self):
        return f"{self.tipo_documento} {self.numero_factura}"


class DetalleFactura(Model):
    """Línea de producto y valores de un documento de compra.

    Relaciones: muchas líneas pertenecen a una factura y cada línea identifica
    un artículo. Las referencias opcionales a otras líneas vinculan una guía
    o documento de origen; las líneas pueden respaldar movimientos de Cardex.
    Justificación: el PDF Alpha A, pp. 3 y 5, pide registrar cantidades y
    costos por producto, aplicar hasta tres descuentos y controlar notas de
    crédito.
    """

    id = fields.IntField(primary_key=True)
    factura = fields.ForeignKeyField(
        "models.FacturaProveedor",
        related_name="detalles",
        on_delete=fields.CASCADE,
    )
    detalle_guia = fields.ForeignKeyField(
        "models.DetalleFactura",
        related_name="facturas_vinculadas_guia",
        null=True,
        on_delete=fields.RESTRICT,
    )
    detalle_documento_origen = fields.ForeignKeyField(
        "models.DetalleFactura",
        related_name="notas_credito_vinculadas",
        null=True,
        on_delete=fields.RESTRICT,
    )
    articulo = fields.ForeignKeyField(
        "models.Articulo",
        related_name="detalles_factura",
        on_delete=fields.RESTRICT,
    )
    cantidad = fields.DecimalField(max_digits=12, decimal_places=3)
    precio_unitario = fields.DecimalField(max_digits=12, decimal_places=2)
    precio_unitario_neto = fields.DecimalField(max_digits=12, decimal_places=2)
    subtotal = fields.DecimalField(max_digits=12, decimal_places=2)
    subtotal_neto = fields.DecimalField(max_digits=12, decimal_places=2)
    descuento_1_pct = fields.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0")
    )
    descuento_2_pct = fields.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0")
    )
    descuento_3_pct = fields.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0")
    )

    class Meta:
        table = "detalle_factura"

    def __str__(self):
        return f"Detalle de factura #{self.factura_id} (línea #{self.id})"
