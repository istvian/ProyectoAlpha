import hashlib
import json
from collections.abc import Awaitable, Callable
from uuid import UUID

from fastapi import HTTPException, status
from tortoise.exceptions import IntegrityError
from tortoise.transactions import in_transaction

from models.ajustes_operativos import OperacionIdempotente
from models.user import User


async def ejecutar_idempotente(
    clave: UUID,
    tipo: str,
    datos: dict,
    usuario: User,
    registrar: Callable[[], Awaitable[dict]],
) -> dict:
    contenido = json.dumps(
        {"tipo": tipo, "datos": datos}, sort_keys=True, ensure_ascii=False
    )
    huella = hashlib.sha256(contenido.encode("utf-8")).hexdigest()
    clave_texto = str(clave)
    try:
        async with in_transaction():
            operacion = await OperacionIdempotente.create(
                clave=clave_texto, usuario=usuario, huella=huella
            )
            respuesta = await registrar()
            operacion.respuesta = respuesta
            await operacion.save(update_fields=["respuesta"])
            return respuesta
    except IntegrityError:
        anterior = await OperacionIdempotente.get_or_none(clave=clave_texto)
        if anterior is None:
            raise
        if anterior.usuario_id != usuario.id or anterior.huella != huella:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La clave de idempotencia ya se utilizó para otra operación.",
            )
        if anterior.respuesta is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="La operación aún no tiene respuesta. Reintente con la misma clave.",
            )
        return anterior.respuesta
