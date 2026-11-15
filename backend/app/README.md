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

### Funciones disponibles

- **Acceso y roles:** inicio y cierre de sesión, renovación de sesión y permisos
  por rol. El sistema define Admin, Bodega, Finanzas, Supervisor y Técnico.
- **Administración:** el Admin consulta indicadores calculados desde inventario,
  usuarios y Cardex; puede crear, modificar y habilitar usuarios, además de
  consultar registros de auditoría.
- **Finanzas y compras:** Finanzas registra facturas de proveedor, consulta
  facturas y administra proveedores y obras con su técnico responsable. El
  cálculo de una factura aplica hasta tres descuentos sucesivos, calcula
  subtotal, IVA y total, y actualiza existencias y PMP cuando corresponde.
  También se pueden crear y consultar órdenes de compra.
- **Recepción de bodega:** Bodega registra la recepción asociada a una orden de
  compra, compara bultos y cantidades de la guía con el conteo físico, e ingresa
  observaciones ante recepciones parciales o discrepancias. Las discrepancias
  quedan pendientes de aprobación; al aprobarse se actualizan existencias y
  Cardex. La interfaz muestra el comprobante digital de recepción.
- **Salidas a obra:** Bodega selecciona artículos, obra y técnico receptor. El
  backend valida el stock y registra la salida, el egreso y el movimiento
  asociado en Cardex dentro de una transacción.
- **Conteo físico manual:** Bodega registra las cantidades contadas. Si hay
  diferencias, un Supervisor/Admin puede aprobar o rechazar el ajuste. Al
  aprobarlo, se actualizan las existencias y se registra el ajuste en Cardex;
  se rechaza el ajuste si el stock cambió desde el conteo.
- **Cardex y reportes:** consulta paginada de movimientos con filtros por fecha,
  artículo, obra y tipo; incluye resumen de movimientos y exportación de
  reportes a PDF y Excel para los roles autorizados.

Los datos demo de desarrollo incluyen artículos, proveedor, obra, facturas,
movimientos Cardex, órdenes de compra, recepciones y un conteo pendiente. Sirven
para recorrer los flujos sin tener que crear primero todos los registros.

### Alcance y partes pendientes

- El registro de documentos admite **Factura**. No hay integración bancaria ni
  flujo de pagos. El listado financiero todavía conserva opciones de filtro
  heredadas para Boleta y Nota de Crédito; eso no habilita su registro.
- La pantalla dedicada **Inventario y artículos** aún contiene cifras, filtros,
  tabla y acciones de ejemplo que no están conectados al backend. No debe usarse
  como fuente de existencias; el stock real se consulta y modifica mediante los
  flujos de facturas, recepciones, salidas, conteos y Cardex.
- Hay modelos/tablas para mermas, devoluciones a proveedor y uso interno, pero
  esos movimientos todavía no tienen un flujo completo de API e interfaz para
  registrarlos.
- El rol Técnico se utiliza como responsable o receptor en obras y egresos; no
  cuenta actualmente con un portal propio en el frontend.

