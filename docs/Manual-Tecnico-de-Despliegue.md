# Manual Técnico de Despliegue — Proyecto Alpha

**Documento:** Manual Técnico de Despliegue
**Sistema:** Proyecto Alpha
**Versión del documento:** 1.0
**Fecha:** 17 de noviembre de 2026
**Institución:** [Completar]
**Autor/a:** [Completar]
**Versión del sistema:** [Indicar versión o commit de entrega]

> Este procedimiento describe el despliegue local de desarrollo/demostración que está respaldado por la configuración actual del repositorio. No constituye una receta de producción: al final se detallan los cambios y decisiones pendientes para autorizar una puesta en producción.

## 1. Propósito y alcance

El documento permite preparar y ejecutar Proyecto Alpha desde el código fuente en una estación de trabajo. Incluye la arquitectura, prerequisitos, configuración local, arranque, validación, detención y resguardo de la base de datos.

El sistema se compone de:

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| Frontend | React, TypeScript, Vite | Interfaz web y comunicación HTTP con la API. |
| Backend | Python, FastAPI, Tortoise ORM | API REST, validación de permisos y reglas de negocio. |
| Persistencia actual | SQLite | Almacenamiento local de datos de la aplicación. |

El frontend consume la API bajo `/api/v1`. La documentación interactiva de FastAPI está disponible en `/docs` cuando el backend está en ejecución.

## 2. Requisitos previos

- Acceso al repositorio y a una copia limpia del código fuente.
- Python instalado. El entorno de desarrollo presente en el proyecto utiliza Python 3.11; el repositorio no fija una versión mínima/máxima formal.
- Node.js LTS y npm compatibles con la versión de Vite declarada en `frontend/package.json`.
- PowerShell en Windows o una terminal compatible en Linux/macOS.
- Puertos locales libres para Vite (habitualmente `5173`) y FastAPI (habitualmente `8000`).

La instalación de dependencias requiere acceso al índice de paquetes Python y al registro npm, salvo que se disponga de cachés/repositorios internos.

## 3. Preparación del código

Obtenga el repositorio desde el mecanismo institucional aprobado. Abra una terminal en la raíz, donde están las carpetas `backend` y `frontend`.

No copie archivos de entorno con secretos desde otra instalación. El archivo `frontend/.env.development.local` debe ser local y no incorporarse al control de versiones.

## 4. Despliegue local en Windows

### 4.1 Preparar e iniciar el backend

En una primera terminal de PowerShell, desde la raíz del repositorio:

```powershell
py --version
py -m venv .venv
.\.venv\Scripts\Activate.ps1
Set-Location backend\app
python -m pip install --upgrade pip
pip install -r requirements.txt
$env:APP_ENV = "development"
fastapi dev
```

Si PowerShell impide activar el entorno virtual, abra `cmd.exe` desde la raíz del repositorio, ejecute `.venv\Scripts\activate.bat` y continúe los pasos en esa misma terminal. No cambie políticas globales de ejecución sin autorización. Mantenga esta terminal abierta mientras use la aplicación.

El backend utiliza FastAPI CLI y, por defecto, sirve localmente en `http://127.0.0.1:8000`. Con la API activa, abra `http://127.0.0.1:8000/docs` para comprobar la documentación.

### 4.2 Configurar e iniciar el frontend

En una segunda terminal, desde la raíz del repositorio:

1. Cree o edite `frontend/.env.development.local` con la URL base del backend:

   ```dotenv
   VITE_BASE_URL=http://127.0.0.1:8000
   ```

2. Ejecute:

   ```powershell
   Set-Location frontend
   npm ci
   npm run dev
   ```

Abra en el navegador la URL que informa Vite, habitualmente `http://localhost:5173`. Si se modifica el archivo de entorno, reinicie Vite para que cargue el cambio.

El frontend y el backend deben ejecutarse simultáneamente. La configuración CORS del backend permite los orígenes locales `http://localhost:5173` y `http://127.0.0.1:5173`.

### 4.3 Alternativa Linux/macOS

Desde la raíz del repositorio, en una terminal:

```bash
python3 --version
python3 -m venv .venv
source .venv/bin/activate
cd backend/app
python -m pip install --upgrade pip
pip install -r requirements.txt
export APP_ENV=development
fastapi dev
```

En otra terminal, configure `frontend/.env.development.local` con `VITE_BASE_URL=http://127.0.0.1:8000` y ejecute:

```bash
cd frontend
npm ci
npm run dev
```

Abra la dirección local indicada por Vite.

## 5. Inicialización de datos y persistencia

- El backend conecta actualmente con SQLite mediante `sqlite://db.sqlite3`; iniciado desde `backend/app`, el archivo utilizado es `backend/app/db.sqlite3`.
- Al iniciar, el backend prepara el esquema y los roles/cuentas de la aplicación.
- Si `APP_ENV` no está definido, el backend lo interpreta como `development`. En ese modo, y si la base es SQLite, carga datos de demostración de forma idempotente.
- Definir `APP_ENV=production` omite la carga de datos demo, pero **no** convierte la configuración actual en un despliegue seguro ni apto para producción.
- Los archivos de base SQLite y sus archivos temporales están excluidos de Git. No se debe asumir que los datos locales viajan junto al código.

Para resguardar una base local, detenga el backend y realice una copia controlada del archivo SQLite. Mantenga las copias fuera del repositorio, limite el acceso y compruebe periódicamente que puedan restaurarse. Defina retención y protección según la política institucional.

## 6. Verificación posterior al despliegue

1. Compruebe que las terminales de FastAPI y Vite no indiquen errores de inicio.
2. Abra la interfaz web y verifique que cargue la pantalla de acceso.
3. Confirme que `http://127.0.0.1:8000/docs` responde.
4. Inicie sesión con una cuenta de prueba provista por el responsable del entorno; no incluya contraseñas en este documento.
5. Compruebe que la navegación corresponde al rol de prueba.
6. Ejecute una consulta de solo lectura (por ejemplo, inventario o Cardex) y confirme que el frontend recibe respuesta de la API.
7. Para validar una operación que cambie datos, use únicamente datos de demostración o un entorno aislado y confirme el movimiento resultante.

## 7. Construcción del frontend

Para comprobar la compilación de producción del cliente, desde `frontend`:

```powershell
npm ci
npm run build
```

El resultado se genera en `frontend/dist`. Esta salida es un artefacto estático del frontend; por sí sola no incluye ni despliega la API, la base de datos, el servidor web o la configuración de seguridad necesaria para un entorno productivo.

## 8. Detención y soporte básico

En cada terminal de servicio, presione `Ctrl+C`. Detenga primero el frontend y luego el backend. No cierre abruptamente el proceso mientras se están registrando operaciones.

| Síntoma | Comprobación |
|---|---|
| `fastapi` no se reconoce | Confirme que el entorno virtual está activo y que `pip install -r requirements.txt` terminó correctamente. |
| Vite no inicia | Confirme la instalación con `npm ci` y que el puerto indicado esté disponible. |
| Error de conexión desde frontend | Verifique que FastAPI esté activo, el valor de `VITE_BASE_URL` y que se haya reiniciado Vite tras cambiar el archivo. |
| Error CORS | Compruebe que el origen del frontend sea uno de los dos orígenes locales permitidos actualmente. |
| Datos de demostración inesperados | Compruebe `APP_ENV`; en desarrollo es normal que se carguen datos demo. No elimine manualmente la base sin respaldo. |
| Base de datos bloqueada o inconsistente | Detenga los procesos, preserve una copia del archivo y escale al responsable técnico antes de intentar reparaciones. |

## 9. Consideraciones para producción

La configuración verificada corresponde a desarrollo local. Antes de exponer el sistema a usuarios o redes externas, deben resolverse y probarse, como mínimo, los siguientes puntos:

1. **Firma de tokens:** la clave JWT está escrita en el código. Debe retirarse del código y gestionarse mediante un mecanismo de secretos; establecerla, rotarla y validar su protección antes de cualquier exposición.
2. **Datos de demostración:** establecer explícitamente un modo no demo y verificar con pruebas que no se carguen datos ficticios en la base operacional.
3. **Base de datos y continuidad:** decidir el motor y topología de persistencia, diseñar migraciones versionadas, definir copias de seguridad, retención, restauración y monitoreo. La configuración actual usa SQLite y genera/ajusta esquema al iniciar; no hay una estrategia de migraciones de producción documentada aquí.
4. **CORS y transporte:** configurar los orígenes exactos del frontend publicado, evitar comodines innecesarios y publicar la aplicación bajo HTTPS. Validar los atributos y políticas de cookies para ese dominio y topología.
5. **Servidor de aplicación:** no usar `fastapi dev` como servidor de producción. Definir servidor ASGI, número de procesos, proxy inverso, límites, reinicio, logging y health checks conforme a la infraestructura aprobada.
6. **Dependencias y cadena de suministro:** fijar y revisar versiones de dependencias, reproducir la instalación en un entorno limpio y definir actualización/parcheo.
7. **Controles operacionales:** provisionar cuentas iniciales de forma segura, cambiar credenciales predeterminadas si existieran, limitar privilegios, proteger logs y monitorear errores y disponibilidad.
8. **Validación y aceptación:** ejecutar pruebas de autenticación, permisos, flujos de inventario, exportaciones, respaldo/restauración y carga acordes al riesgo y al volumen esperado.

Por lo tanto, este manual habilita el despliegue de demostración y sirve como base de planificación. La selección de proveedor, sistema operativo servidor, dominio, proxy, motor de datos y objetivos de disponibilidad no está especificada en el repositorio; deben acordarse antes de documentar un procedimiento productivo reproducible.

## 10. Referencias de configuración del proyecto

- Backend: `backend/app/main.py`, `backend/app/db/db.py` y `backend/app/requirements.txt`.
- Frontend: `frontend/package.json`, `frontend/package-lock.json` y `frontend/src/Helpers/APIConnector.ts`.
- Instrucciones de instalación existentes: `leeme.txt`.
- Descripción funcional: `backend/app/README.md`.

---

**Control del documento:** revisar comandos, versiones y configuración contra el commit que se entregue para evaluación. Completar infraestructura objetivo, responsables, procedimiento de respaldo y criterios institucionales antes de aprobar un despliegue productivo.
