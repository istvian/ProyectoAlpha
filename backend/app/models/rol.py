from tortoise.models import Model
from tortoise import fields


class Rol(Model):
    id = fields.IntField(primary_key=True)
    nombre = fields.CharField(max_length=80)
