from datetime import datetime, timedelta, timezone
from enum import Enum

from fastapi import Cookie, HTTPException, Header, Request, Response, status

from models.user import User
from schemas.roles import Roles

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


def decode_jwt(token) -> dict:
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        print("Error: El token ha expirado.")
    except jwt.InvalidTokenError as e:
        print(f"Error: Token inválido ({e}).")

    return {}


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


def check_user(rol: Roles):
    def dependency(request: Request):
        token = request.cookies.get("token")
        if not token:
            raise HTTPException(
                status_code=401,
                detail={"error": True, "mensaje": "Token no válido"},
            )
        try:
            payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
            request.state.usuario = payload.get("correo")
            jwt_rol = payload.get("rol", -1)
            if not (
                jwt_rol == rol.value
                or jwt_rol == Roles.admin.value
                or rol.value == Roles.cualquiera.value
            ):
                raise HTTPException(
                    403, detail={"error": True, "mensaje": "Sin permisos"}
                )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                401, detail={"error": True, "mensaje": "Token expirado"}
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                401, detail={"error": True, "mensaje": "Token invalido"}
            )

    return dependency


def check_user_any(roles: tuple[Roles, ...]):
    allowed_roles = {role.value for role in roles}

    def dependency(request: Request):
        token = request.cookies.get("token")
        if not token:
            raise HTTPException(
                status_code=401,
                detail={"error": True, "mensaje": "Token no válido"},
            )
        try:
            payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
            request.state.usuario = payload.get("correo")
            jwt_rol = payload.get("rol", -1)
            if jwt_rol not in allowed_roles and jwt_rol != Roles.admin.value:
                raise HTTPException(
                    403, detail={"error": True, "mensaje": "Sin permisos"}
                )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                401, detail={"error": True, "mensaje": "Token expirado"}
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                401, detail={"error": True, "mensaje": "Token invalido"}
            )

    return dependency
