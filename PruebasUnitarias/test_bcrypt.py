from middlewares.bcript_helper import encriptar_contraseña, validar_contraseña


def test_encriptar_y_validar_contraseña():
    hashed = encriptar_contraseña("ClaveSegura123")
    assert hashed != "ClaveSegura123"
    assert validar_contraseña("ClaveSegura123", hashed) is True
    assert validar_contraseña("otra-clave", hashed) is False
