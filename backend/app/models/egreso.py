from tortoise import fields
from tortoise.models import Model


class Egreso(Model):
    """Cabecera de un despacho de materiales a una obra.

    Relaciones: cada egreso pertenece a una obra y lo registra un usuario;
    contiene muchas líneas de detalle. Puede estar asociado a una solicitud
    aprobada y tener un acuse de recepción.
    Justificación: el PDF Alpha A, pp. 3 y 5, pide registrar egresos a obras,
    controlar stock y documentar la recepción del material.
    """

    id = fields.IntField(primary_key=True)
    obra = fields.ForeignKeyField(
        "models.Obra",
        related_name="egresos",
        on_delete=fields.RESTRICT,
    )
    fecha_salida = fields.DatetimeField(auto_now_add=True)
    responsable_obra = fields.CharField(max_length=100)
    tecnico_receptor_id = fields.CharField(max_length=50)
    motivo = fields.TextField()
    estado = fields.CharField(max_length=12, default="BORRADOR")
    usuario = fields.ForeignKeyField(
        "models.User",
        related_name="egresos_creados",
        on_delete=fields.RESTRICT,
    )
    evidencia_adjunta = fields.JSONField(default=dict)
    creado_en = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "egresos_obra"

    def __str__(self):
        return f"Egreso #{self.id} - Obra #{self.obra_id}"


class DetalleEgreso(Model):
    """Artículo y cantidad incluidos en un despacho.

    Relaciones: muchas líneas pertenecen a un egreso; cada línea identifica
    un artículo y puede ser referenciada por movimientos de Cardex.
    Justificación: el PDF Alpha A, pp. 3 y 5, requiere asociar materiales
    despachados con la obra y mantener la trazabilidad de cada movimiento.
    """

    id = fields.IntField(primary_key=True)
    egreso = fields.ForeignKeyField(
        "models.Egreso",
        related_name="detalles",
        on_delete=fields.CASCADE,
    )
    articulo = fields.ForeignKeyField(
        "models.Articulo",
        related_name="detalles_egreso",
        on_delete=fields.RESTRICT,
    )
    cantidad_solicitada = fields.DecimalField(max_digits=12, decimal_places=3)

    class Meta:
        table = "detalle_egreso"

    def __str__(self):
        return f"Detalle #{self.id} - Artículo #{self.articulo_id}"
