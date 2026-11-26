from fastapi import Request, Response
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, PyMongoError
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import logging
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
TZ_CHILE = ZoneInfo("America/Santiago")


# Campos que nunca deben guardarse en claro
CAMPOS_SENSIBLES = {"password", "contraseña", "token"}


def _sanitizar(dato):
    """Elimina recursivamente claves sensibles de dicts/listas."""
    if isinstance(dato, dict):
        return {
            k: ("***" if k.lower() in CAMPOS_SENSIBLES else _sanitizar(v))
            for k, v in dato.items()
        }
    if isinstance(dato, list):
        return [_sanitizar(x) for x in dato]
    return dato


class NoSQLDatabase:
    def __init__(self, uri: str = MONGODB_URI, db_name: str = "ProyectoAlpha"):
        try:
            self.client = MongoClient(uri, serverSelectionTimeoutMS=30000)
            self.client.admin.command("ping")
        except ServerSelectionTimeoutError as e:
            raise ConnectionError(f"No se pudo conectar a MongoDB: {e}")

        self.db = self.client[db_name]
        self.coleccion = self.db["logs"]

        # Índices: crear una sola vez al arrancar (idempotente)
        self.coleccion.create_index([("fecha", -1)])
        self.coleccion.create_index([("usuario", 1), ("fecha", -1)])
        self.coleccion.create_index([("evento", 1), ("fecha", -1)])

        # Índice TTL opcional: borra logs a los 90 días
        # self.coleccion.create_index("fecha", expireAfterSeconds=90 * 24 * 60 * 60)

        print("Base NoSQL inicializada")

    #  ESCRITURA                                                          #
    def GuardarLog(
        self,
        request: Request,
        response: Response,
        evento: str = "request",
        usuario: str = "",
    ):
        ahora_chile = datetime.now(TZ_CHILE)
        ahora_utc = ahora_chile.astimezone(timezone.utc)
        usuario_final = usuario or getattr(request.state, "usuario", "Desconocido")
        ip_origen = request.client.host if request.client else None
        consulta = {
            "method": request.method,
            "path": request.url.path,
            "query": str(request.url.query),
        }
        resultado_status = (
            str(response.status_code) if response.status_code is not None else "200"
        )
        documento = {
            "fecha": ahora_utc,
            "fecha_local": ahora_chile.isoformat(),
            "usuario": usuario_final,
            "evento": evento,
            "resultado": resultado_status,
            "ipOrigen": ip_origen,
            "consulta": _sanitizar(consulta),
        }
        try:
            res = self.coleccion.insert_one(documento)
            print(f"Log guardado: {res.inserted_id}")
            return str(res.inserted_id)
        except PyMongoError as e:
            print(f"Error guardando log: {e}")
            return None

    #  LECTURA
    def ObtenerUltimosLogs(
        self,
        cantidad: int = 20,
        pagina: int = 1,
        usuario: str | None = None,
    ):
        """
        Devuelve los últimos logs ordenados por fecha descendente,
        con la fecha convertida a hora de Chile.
        """
        cantidad = max(1, min(int(cantidad), 100))
        pagina = max(1, int(pagina))
        skip = (pagina - 1) * cantidad

        filtro = {}
        if usuario:
            filtro["usuario"] = usuario

        try:
            cursor = (
                self.coleccion.find(filtro).sort("fecha", -1).skip(skip).limit(cantidad)
            )
            logs = []
            for doc in cursor:
                doc["_id"] = str(doc["_id"])
                if isinstance(doc.get("fecha"), datetime):
                    doc["fecha"] = doc["fecha"].astimezone(TZ_CHILE)
                logs.append(doc)
            return logs
        except PyMongoError as e:
            print("Error obteniendo logs: %s", e)
            return []

    def ContarLogs(self, usuario: str | None = None, evento: str | None = None) -> int:
        """Cantidad total de logs (para paginación)."""
        filtro = {}
        if usuario:
            filtro["usuario"] = usuario
        if evento:
            filtro["evento"] = evento
        return self.coleccion.count_documents(filtro)

    #  CIERRE                                                             #
    def cerrar(self):
        self.client.close()
        print("Conexión MongoDB cerrada")


#  Instancia perezosa (lazy) para no romper el import si Mongo está caído
_db_instance: NoSQLDatabase | None = None


def get_db() -> NoSQLDatabase:
    global _db_instance
    if _db_instance is None:
        _db_instance = NoSQLDatabase()
    return _db_instance
