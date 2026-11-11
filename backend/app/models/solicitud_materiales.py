from tortoise import fields
from tortoise.models import Model


class SolicitudMateriales(Model):
    """Solicitud de materiales de un supervisor para una obra.

    Relaciones: cada solicitud pertenece a una obra y a un solicitante; puede
    tener un revisor y asociarse como máximo a un egreso. Una solicitud incluye
    muchas líneas de detalle.
    Justificación: el PDF Alpha A, p. 4, asigna al supervisor el registro de
    requerimientos técnicos; p. 5 describe la solicitud previa al despacho.
    """

    id = fields.IntField(primary_key=True)
    obra = fields.ForeignKeyField(
        "models.Obra",
        related_name="solicitudes_materiales",
        on_delete=fields.RESTRICT,
    )
    solicitante = fields.ForeignKeyField(
        "models.User",
        related_name="solicitudes_creadas",
        on_delete=fields.RESTRICT,
    )
    motivo = fields.TextField()
    estado = fields.CharField(max_length=12, default="PENDIENTE")
    creada_en = fields.DatetimeField(auto_now_add=True)
    revisada_por = fields.ForeignKeyField(
        "models.User",
        source_field="revisada_por",
        related_name="solicitudes_revisadas",
        null=True,
        on_delete=fields.RESTRICT,
    )
    revisada_en = fields.DatetimeField(null=True)
    comentario_revision = fields.TextField(null=True)
    egreso = fields.ForeignKeyField(
        "models.Egreso",
        related_name="solicitudes_asociadas",
        null=True,
        unique=True,
        on_delete=fields.RESTRICT,
    )
    despachada_en = fields.DatetimeField(null=True)

    class Meta:
        table = "solicitudes_materiales"
        indexes = (("estado", "creada_en"), ("solicitante", "creada_en"), ("obra", "creada_en"))

    def __str__(self):
        return f"Solicitud #{self.id} - {self.estado}"


class DetalleSolicitudMateriales(Model):
    """Artículo, cantidad y especificación técnica de una solicitud.

    Relaciones: muchas líneas pertenecen a una solicitud; cada línea identifica
    un artículo. El esquema evita repetir el mismo artículo dentro de una
    solicitud.
    Justificación: el PDF Alpha A, pp. 4-5, pide que los supervisores registren
    requerimientos técnicos de materiales para obras.
    """

    id = fields.IntField(primary_key=True)
    solicitud = fields.ForeignKeyField(
        "models.SolicitudMateriales",
        related_name="detalles",
        on_delete=fields.CASCADE,
    )
    articulo = fields.ForeignKeyField(
        "models.Articulo",
        related_name="detalles_solicitud",
        on_delete=fields.RESTRICT,
    )
    cantidad_solicitada = fields.DecimalField(max_digits=12, decimal_places=3)
    detalle_tecnico = fields.TextField(null=True)

    class Meta:
        table = "detalle_solicitud_materiales"
        unique_together = (("solicitud", "articulo"),)

    def __str__(self):
        return f"Detalle de solicitud #{self.solicitud_id} - Artículo #{self.articulo_id}"


class AcuseRecepcionEgreso(Model):
    """Constancia de recepción asociada a un despacho.

    Relaciones: cada acuse corresponde a un único egreso y lo registra un
    usuario; un egreso puede tener como máximo un acuse. El archivo se guarda
    fuera de la base y aquí se conservan su ubicación y metadatos.
    Justificación: el PDF Alpha A, p. 5, incluye comprobante de entrega y
    captura de firma en el proceso de despacho.
    """

    id = fields.IntField(primary_key=True)
    egreso = fields.ForeignKeyField(
        "models.Egreso",
        related_name="acuse_recepcion",
        unique=True,
        on_delete=fields.RESTRICT,
    )
    receptor_nombre = fields.CharField(max_length=150)
    receptor_identificador = fields.CharField(max_length=50, null=True)
    recibido_en = fields.DatetimeField(auto_now_add=True)
    storage_bucket = fields.CharField(max_length=100)
    storage_path = fields.TextField()
    sha256_archivo = fields.CharField(max_length=64, null=True)
    registrado_por = fields.ForeignKeyField(
        "models.User",
        source_field="registrado_por",
        related_name="acuses_registrados",
        on_delete=fields.RESTRICT,
    )
    creado_en = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "acuses_recepcion_egreso"

    def __str__(self):
        return f"Acuse del egreso #{self.egreso_id}"
