from enum import Enum

from tortoise import fields, models


class EstadoOrdenCompra(str, Enum):
    ABIERTA = "ABIERTA"
    PARCIAL = "PARCIAL"
    COMPLETA = "COMPLETA"


class EstadoRecepcion(str, Enum):
    PENDIENTE_APROBACION = "PENDIENTE_APROBACION"
    APROBADA = "APROBADA"


class OrdenCompra(models.Model):
    id = fields.IntField(pk=True)
    numero_orden = fields.CharField(max_length=80, unique=True)
    proveedor = fields.ForeignKeyField(
        "models.Proveedores",
        related_name="ordenes_compra",
        on_delete=fields.RESTRICT,
    )
    creado_por = fields.ForeignKeyField(
        "models.User",
        related_name="ordenes_compra_creadas",
        on_delete=fields.RESTRICT,
    )
    estado = fields.CharEnumField(
        EstadoOrdenCompra,
        default=EstadoOrdenCompra.ABIERTA,
    )
    fecha_creacion = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "ordenes_compra"


class DetalleOrdenCompra(models.Model):
    id = fields.IntField(pk=True)
    orden_compra = fields.ForeignKeyField(
        "models.OrdenCompra",
        related_name="detalles",
        on_delete=fields.RESTRICT,
    )
    articulo = fields.ForeignKeyField(
        "models.Articulos",
        related_name="detalles_orden_compra",
        on_delete=fields.RESTRICT,
    )
    cantidad_solicitada = fields.IntField()
    cantidad_recibida = fields.IntField(default=0)
    precio_unitario = fields.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        table = "detalle_orden_compra"


class RecepcionCompra(models.Model):
    id = fields.IntField(pk=True)
    orden_compra = fields.ForeignKeyField(
        "models.OrdenCompra",
        related_name="recepciones",
        on_delete=fields.RESTRICT,
    )
    numero_guia = fields.CharField(max_length=80)
    usuario = fields.ForeignKeyField(
        "models.User",
        related_name="recepciones_compra_registradas",
        on_delete=fields.RESTRICT,
    )
    bultos_guia = fields.IntField()
    bultos_recibidos = fields.IntField()
    estado = fields.CharEnumField(
        EstadoRecepcion,
        default=EstadoRecepcion.PENDIENTE_APROBACION,
    )
    observaciones = fields.TextField(null=True)
    detalle_discrepancia = fields.TextField(null=True)
    aprobado_por = fields.ForeignKeyField(
        "models.User",
        related_name="recepciones_compra_aprobadas",
        null=True,
        on_delete=fields.RESTRICT,
    )
    fecha = fields.DatetimeField(auto_now_add=True)
    fecha_aprobacion = fields.DatetimeField(null=True)

    class Meta:
        table = "recepciones_compra"


class DetalleRecepcionCompra(models.Model):
    id = fields.IntField(pk=True)
    recepcion = fields.ForeignKeyField(
        "models.RecepcionCompra",
        related_name="detalles",
        on_delete=fields.RESTRICT,
    )
    detalle_orden = fields.ForeignKeyField(
        "models.DetalleOrdenCompra",
        related_name="recepciones",
        on_delete=fields.RESTRICT,
    )
    cantidad_guia = fields.IntField()
    cantidad_recibida = fields.IntField()

    class Meta:
        table = "detalle_recepcion_compra"


class FacturaOrdenCompra(models.Model):
    id = fields.IntField(pk=True)
    factura = fields.OneToOneField(
        "models.DocumentosTributarios",
        related_name="orden_compra_vinculada",
        on_delete=fields.RESTRICT,
    )
    orden_compra = fields.ForeignKeyField(
        "models.OrdenCompra",
        related_name="facturas",
        on_delete=fields.RESTRICT,
    )

    class Meta:
        table = "facturas_ordenes_compra"
