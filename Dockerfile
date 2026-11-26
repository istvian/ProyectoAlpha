# Etapa 1: Construcción del frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Etapa 2: Servidor final con FastAPI
FROM python:3.11-slim
WORKDIR /backend/app

# Instalar dependencias de Python
COPY backend/app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del backend
COPY backend/app .

# Traer la carpeta compilada del frontend desde la Etapa 1
# (Como Vite la guardó en ../backend/app/public, la ruta dentro del contenedor Python será /backend/app/public)
COPY --from=frontend-builder /backend/app/public ./public

EXPOSE 8000
CMD ["fastapi", "run", "--host", "0.0.0.0", "--port", "8000"]