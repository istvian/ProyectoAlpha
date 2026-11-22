# Backend Proyecto Alpha

Utilice FastAPI en vez de Flask ya que se apegaba mejor a lo que necesitabamos. 

A continuación la estructura de carpetas

```
.
├── controllers => Aquí van los controladores por ruta
│   └── user_controller.py => Aquí se establecen las funcione de user.
├── main.py => Archivo principal
├── db => Aquí se implementara la logica de la base de datos
├── middlewares => Funciones que se ejecutan antes de los controllers, como por ejemplo: Verificar si esta logueado 
├── public => Carpeta de archivos publicos, html, css, js, imagenes, etc
│   └── index.html
└── routes => Carpeta donde se guardan las rutas
    ├── api.py => Aquí se agrupan y declaran las rutas
    └── user_routes.py => Aquí se declaran las rutas de user
```

## Datos de demostración

Al iniciar el backend, se cargan automáticamente los datos demo en SQLite cuando
`APP_ENV` está definido como `development`. Si no se define, el entorno local se
considera `development`. La carga es idempotente: reiniciar el backend no duplica
los registros.

Antes de iniciar el backend en producción, defina `APP_ENV=production`; así se
omite la carga de datos demo.

## Situación actual del proyecto

Proyecto Alpha es un MVP web para controlar compras, inventario y movimientos de
bodega vinculados a obras. El backend está construido con FastAPI y Tortoise ORM;
el frontend usa React, TypeScript y Vite. La base configurada actualmente es
SQLite local. La API está bajo `/api/v1` y su documentación interactiva se puede
consultar en `/docs` cuando el backend está en ejecución.

## Backend de Proyecto Alpha

El backend es la parte de Proyecto Alpha que recibe las solicitudes de la
aplicación, aplica las reglas del negocio y guarda la información. Por ejemplo,
cuando se registra una compra o se envían materiales a una obra, aquí se valida
la operación y se actualizan las existencias.

El proyecto usa FastAPI y guarda los datos localmente en SQLite. La aplicación
web está hecha con React, TypeScript y Vite. La API (el punto de comunicación
entre la aplicación y el backend) está disponible bajo `/api/v1`. Con el
backend en ejecución, se puede consultar y probar en `/docs`.

## Cómo se organiza

- `main.py`: inicia el backend y conecta sus partes.
- `routes/`: recibe las solicitudes para iniciar sesión, administrar compras,
  consultar inventario y realizar otras tareas.
- `models/`: describe la información que se guarda, como usuarios, artículos,
  proveedores y obras.
- `db/`: configura la conexión y las operaciones con la base de datos.
- `middlewares/`: apoya tareas comunes, como revisar el acceso de cada usuario.
- `schemas/`: define qué datos se necesitan y cuáles se aceptan en algunas
  operaciones.
- `services/`: reúne tareas de apoyo, como preparar resúmenes y reportes.
- `scripts/`: contiene tareas de apoyo, como cargar los datos de demostración.
- `public/`: contiene los archivos públicos de la aplicación web.

## Funciones disponibles

Las funciones se presentan en el orden habitual del trabajo: preparar una
compra, recibirla, controlar los materiales y revisar lo ocurrido.

### 1. Ingreso y permisos

Cada persona inicia sesión con su cuenta. Puede cerrar la sesión y mantenerla
activa al continuar usando la aplicación. Lo que puede consultar o hacer depende
de su cargo:

- **Administrador:** revisa indicadores generales, administra las cuentas y
  consulta los registros de actividad.
- **Finanzas:** registra facturas y administra proveedores, obras y órdenes de
  compra.
- **Bodega:** registra la llegada de compras, entrega materiales a las obras y
  anota los conteos físicos.
- **Supervisor:** revisa diferencias en las recepciones y los conteos, consulta
  los movimientos y puede descargar reportes.
- **Técnico:** puede figurar como responsable de una obra o como la persona que
  recibe materiales.

### 2. Preparar compras y mantener los datos al día

Finanzas puede registrar y consultar proveedores y obras, y asignar a cada obra
un técnico responsable. Finanzas y Supervisión pueden crear órdenes de compra;
Bodega, Finanzas y Supervisión pueden consultar las que ya existen. Una orden
deja anotado qué artículos se esperan y en qué cantidades.

### 3. Registrar facturas

Finanzas registra las facturas de los proveedores y puede consultarlas después.
El sistema calcula los descuentos (hasta tres, uno después del otro), el
subtotal, el IVA (19 %) y el total, para evitar hacer esas cuentas a mano.

La factura también permite dejar constancia de los artículos comprados. Si no
está asociada a una orden de compra, las cantidades ingresan al inventario en
ese momento. Si está asociada a una orden, debe corresponder a artículos y
cantidades que ya fueron recibidos y aprobados; así se evita contar dos veces
los mismos materiales.

### 4. Recibir materiales en bodega

Bodega registra lo que llegó y compara las cantidades con las indicadas en la
orden y en la guía del proveedor. Si todo coincide, las existencias se actualizan
automáticamente. Si hay una diferencia —por ejemplo, llegó menos material del
que decía la guía—, se guarda una observación y Finanzas o un Supervisor debe
revisarla antes de actualizar las existencias.

Cada recepción queda con un comprobante que muestra los artículos, las
cantidades recibidas y cualquier diferencia registrada.

### 5. Entregar materiales a una obra

Bodega elige la obra, los artículos y las cantidades que va a entregar, e indica
qué técnico los recibe. Antes de registrar la salida, el sistema comprueba que
haya suficiente cantidad disponible. Luego descuenta esos materiales del
inventario y deja anotada la entrega.

### 6. Comparar el inventario con lo que hay en bodega

Bodega puede anotar cuántas unidades encontró al contar los artículos. El
sistema compara ese número con el que aparece registrado:

- Si coinciden, el conteo queda registrado sin cambios en las existencias.
- Si no coinciden, un Supervisor debe aprobarlo o rechazarlo. Al aprobarlo, se
  actualiza la cantidad disponible; al rechazarlo, se deja el motivo.

Antes de aplicar un ajuste, el sistema comprueba que las existencias no hayan
cambiado desde que se hizo el conteo. Esto ayuda a evitar correcciones con
información antigua. El historial compara el stock teórico con el físico y
muestra los tres costos de compra más recientes de cada artículo para apoyar la
conciliación.

### 7. Consultar movimientos y descargar reportes

Las entradas, entregas y ajustes quedan en el historial del inventario (también
llamado **Cardex**). Administración, Finanzas y Supervisión pueden consultar
el Cardex y aplicar filtros. Bodega mantiene el historial en su propia vista.

Administración y Supervisión pueden descargar el reporte en PDF o Excel;
Finanzas y Bodega no tienen permiso de exportación.

### Mermas y uso interno

Bodega y Administración pueden registrar una merma o consumo interno con una
obra activa opcional. Las cantidades son enteras. Cada operación nueva se vincula
con su movimiento en Cardex y devuelve ambos identificadores y el saldo resultante.

Los endpoints `POST /api/v1/mermas` y `POST /api/v1/usos-internos` requieren
el encabezado `Idempotency-Key` con un UUID. Repetir la solicitud con la misma
clave, usuario y datos devuelve la respuesta original; reutilizarla con otros
datos o usuario devuelve `409`. El frontend conserva temporalmente la solicitud
pendiente en la pestaña para permitir su reintento tras perder la respuesta.
Si se cierra la pestaña, no está garantizada su recuperación.

Al iniciar con una base SQLite existente, el esquema de mermas y uso interno
se adapta conservando los registros. Los movimientos antiguos no se enlazan
automáticamente con Cardex porque no existe una relación histórica inequívoca.
Respalde la base antes de actualizar. Esta adaptación y los triggers existentes
son específicos de SQLite; PostgreSQL/Supabase requiere una migración y pruebas
propias antes de utilizarlo.

### 8. Revisar indicadores y administrar usuarios

El Administrador puede consultar un resumen con la cantidad de artículos, el
valor estimado del inventario, los artículos con pocas existencias, los
movimientos del día, las cuentas y proveedores activos, y las pérdidas de
materiales registradas. Los paneles de Administración, Bodega e Inventario
muestran cuáles artículos están en o bajo su mínimo y actualizan esa lista
automáticamente cada 30 segundos. También puede crear y modificar cuentas,
cambiar el cargo o deshabilitarlas, y revisar los registros de actividad del
sistema.

## Datos de demostración

Al iniciar el backend en el entorno de desarrollo, se cargan ejemplos para
probar las funciones: artículos, proveedores, obras, facturas, movimientos,
órdenes de compra, recepciones y un conteo pendiente de revisión. Reiniciar el
backend no duplica esos ejemplos.
