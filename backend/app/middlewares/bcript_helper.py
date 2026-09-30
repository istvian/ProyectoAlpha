import bcrypt


def encriptar_contraseña(contraseña):
    passwd_bytes = contraseña.encode("utf-8")
    hashed_bytes = bcrypt.hashpw(passwd_bytes, bcrypt.gensalt())
    return hashed_bytes.decode("utf-8")


def validar_contraseña(contraseña, hashed):
    password_bytes = contraseña.encode("utf-8")
    hashed_bytes = hashed.encode("utf-8")
    if bcrypt.checkpw(password_bytes, hashed_bytes):
        return True
    else:
        return False
