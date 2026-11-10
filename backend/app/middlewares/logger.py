from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from db.nosql import get_db


class Logger(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = None
        try:
            response = await call_next(request)
        except Exception as exc:
            response = Response(status_code=500)
            raise exc
        finally:
            if response is not None:
                db = get_db()
                db.GuardarLog(request, response)

        return response