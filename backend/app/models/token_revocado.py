from tortoise import fields
from tortoise.models import Model


class TokenRevocado(Model):
    """Token invalidado antes de su vencimiento.

    Relaciones: muchos tokens revocados pueden pertenecer a un usuario; se
    eliminan junto con este. No sustituye la tabla de usuarios.
    Justificación: el PDF Alpha A, p. 6, exige autenticación y seguridad de
    sesiones; esta tabla permite mantener la revocación en el backend.
    """

    jti = fields.CharField(max_length=255, primary_key=True)
    usuario = fields.ForeignKeyField(
        "models.User",
        related_name="tokens_revocados",
        on_delete=fields.CASCADE,
    )
    expira_en = fields.DatetimeField()
    revocado_en = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "tokens_revocados"
        indexes = (("expira_en",),)

    def __str__(self):
        return f"Token revocado del usuario #{self.usuario_id}"
