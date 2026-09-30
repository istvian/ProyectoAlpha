from datetime import datetime, timedelta, timezone

import jwt

SECRET = "abcd1234"
ALGORITHM = "HS256"


def generate_jwt(correo, rol, minutos_exp):
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=minutos_exp)

    payload = {"correo": correo, "rol": rol, "exp": expiracion}
    encoded_jwt = jwt.encode(
        payload,
        SECRET,
        algorithm=ALGORITHM,
    )
    return encoded_jwt


def decode_jwt(token):
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        print("Error: El token ha expirado.")
    except jwt.InvalidTokenError as e:
        print(f"Error: Token inválido ({e}).")

    return None
