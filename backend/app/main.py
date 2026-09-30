from contextlib import asynccontextmanager
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from tortoise import run_async
from routes.api import api_router
from db.db import CloseDB, SetupDB
from tortoise.contrib.fastapi import register_tortoise

run_async(SetupDB())

app = FastAPI(title="API Proyecto Alpha")

register_tortoise(
    app,
    db_url="postgresql://postgres:xSK4B8q8BboKy95X@db.ckwvsfebfuskjsaxycaw.supabase.co:5432/postgres",
    modules={"models": ["models.user", "models.rol"]},
    generate_schemas=True,
    add_exception_handlers=True,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

PUBLIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "public"))

app.mount("/public", StaticFiles(directory=PUBLIC_DIR), name="public")


@app.get("/{full_path:path}")
async def servePublic(full_path: str):
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="Endpoint de API no encontrado")

    file_path = os.path.join(PUBLIC_DIR, full_path)
    if full_path != "" and os.path.exists(file_path):
        return FileResponse(file_path)

    index_file = os.path.join(PUBLIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)

    raise HTTPException(status_code=404, detail="index.html no encontrado")
