from db.nosql import _sanitizar


def test_sanitizar_oculta_campos_sensibles():
    dato = {
        "password": "secreto",
        "token": "abc",
        "usuario": "admin",
        "nested": [{"contraseña": "123", "ok": "valor"}],
    }
    resultado = _sanitizar(dato)
    assert resultado["password"] == "***"
    assert resultado["token"] == "***"
    assert resultado["usuario"] == "admin"
    assert resultado["nested"][0]["contraseña"] == "***"
    assert resultado["nested"][0]["ok"] == "valor"
