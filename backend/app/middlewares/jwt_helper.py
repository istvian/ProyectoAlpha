from datetime import datetime, timedelta, timezone
from enum import Enum

from fastapi import HTTPException, Request, Response, status

from models.user import User
from schemas.roles import Roles

import jwt

SECRET = "abcd1234"
ALGORITHM = "HS256"


def generate_jwt(correo, rol, minutos_exp: int = 120):
    # Nos aseguramos de que si minutos_exp viene nulo o extraño, tome 120 minutos por defecto
    if not minutos_exp or not isinstance(minutos_exp, (int, float)):
        minutos_exp = 120
        
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=float(minutos_exp))

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


def validar_rol(token, rol: Roles):
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        print(payload)
        jwt_rol = payload.get("rol", -1)
        if (
            jwt_rol == rol.value
            or jwt_rol == Roles.admin.value
            or rol.value == Roles.cualquiera.value
        ):
            return True
        else:
            return False
    except jwt.ExpiredSignatureError:
        print("Error: El token ha expirado.")
    except jwt.InvalidTokenError as e:
        print(f"Error: Token inválido ({e}).")
    except Exception as e:
        print(f"Token inválido")
        return False
