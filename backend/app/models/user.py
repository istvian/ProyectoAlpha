from tortoise.models import Model
from tortoise import fields


class User(Model):
    id = fields.IntField(primary_key=True)
    nombre = fields.CharField(max_length=100)
    correo = fields.CharField(max_length=100, unique=True)
    password = fields.CharField(max_length=100)
    enabled = fields.BooleanField(default=True)
    created = fields.DatetimeField(auto_now_add=True)
    rol = fields.ForeignKeyField(
        "models.Rol", related_name="users"
    )  # Relación uno a muchos
