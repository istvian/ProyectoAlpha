from tortoise import fields
from tortoise.models import Model


class CategoriaArticulo(Model):
    """Clasificación opcional para artículos de inventario.

    Relaciones: una categoría puede agrupar muchos artículos; cada artículo
    puede quedar sin categoría o pertenecer a una.
    Justificación: el PDF Alpha A, p. 2, «Catálogo de Artículos», pide
    categorizar los productos (por ejemplo, electricidad o refrigeración).
    """

    id = fields.IntField(primary_key=True)
    nombre = fields.CharField(max_length=80, unique=True)
    activo = fields.BooleanField(default=True)
    creado_en = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "categorias_articulo"

    def __str__(self):
        return self.nombre
