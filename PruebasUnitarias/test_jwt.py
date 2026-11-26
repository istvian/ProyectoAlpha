from datetime import timedelta

import jwt

from middlewares.jwt_helper import (
    ALGORITHM,
    SECRET,
    decode_jwt,
    generate_jwt,
    validar_rol,
)
from schemas.roles import Roles


def test_generate_decode_jwt():
    token = generate_jwt("usuario@test.cl", Roles.bodega.value, 5)
    payload = decode_jwt(token)
    assert payload["correo"] == "usuario@test.cl"
    assert payload["rol"] == Roles.bodega.value


def test_decode_jwt_invalido_retorna_dict_vacio():
    assert decode_jwt("token-invalido") == {}


def test_validar_rol_admin_y_permisos():
    token = generate_jwt("admin@test.cl", Roles.admin.value, 5)
    assert validar_rol(token, Roles.bodega) is True
    assert validar_rol(token, Roles.finanzas) is True

    token_bodega = generate_jwt("bodega@test.cl", Roles.bodega.value, 5)
    assert validar_rol(token_bodega, Roles.bodega) is True
    assert validar_rol(token_bodega, Roles.finanzas) is False

    token_cualquiera = generate_jwt("x@test.cl", Roles.cualquiera.value, 5)
    # cualquiera only matches when requested role is cualquiera? implementation: rol.value == Roles.cualquiera.value
    assert validar_rol(token_cualquiera, Roles.cualquiera) is True


def test_validar_rol_token_invalido_retorna_false():
    assert not validar_rol("no-es-jwt", Roles.bodega)
