# Manual de Usuario — Proyecto Alpha

**Documento:** Manual de Usuario
**Sistema:** Proyecto Alpha
**Versión del documento:** 1.0
**Fecha:** 17 de noviembre de 2026
**Institución:** [Completar]
**Autor/a:** [Completar]
**Versión del sistema:** [Indicar versión o commit de entrega]

> Antes de entregar este documento como parte del informe de título, complete los campos entre corchetes y agregue capturas de pantalla de la versión efectivamente evaluada.

## 1. Propósito y alcance

Este manual describe el uso de Proyecto Alpha, una aplicación web para apoyar la gestión de compras, proveedores, obras, inventario y movimientos de bodega. Está dirigido a las personas que operan el sistema según los permisos asignados a su cuenta.

El sistema registra entradas, salidas, ajustes y otros movimientos de materiales, y permite consultar el historial denominado **Cardex**. Las opciones disponibles dependen del rol del usuario.

## 2. Requisitos de uso

- Acceso a la dirección web definida para la instalación.
- Navegador web actualizado.
- Cuenta habilitada por el administrador del sistema.
- Conexión con los servicios de la aplicación.

La URL y las credenciales se entregan por el canal definido por la organización. Este manual no publica contraseñas ni datos reales de acceso.

## 3. Roles y permisos

| Rol | Funciones principales |
|---|---|
| Administrador | Consulta el panel general; administra cuentas y consulta registros de actividad. El backend también concede al rol administrador los permisos de acceso generales. |
| Finanzas | Administra proveedores y obras; crea y consulta facturas; participa en la gestión y revisión de órdenes y recepciones según los permisos habilitados. |
| Bodega | Consulta inventario y órdenes; registra recepciones, entregas a obras, conteos físicos, mermas y consumos internos. |
| Supervisor | Consulta inventario y Cardex; revisa diferencias y aprueba o rechaza recepciones y conteos cuando corresponda; puede exportar reportes de Cardex. |
| Técnico | Puede ser asignado a una obra, figurar como receptor de materiales y solicitar material para sus obras activas. |

Los permisos efectivos se aplican en el backend. Si una opción no aparece o se muestra un aviso de acceso denegado, solicite al administrador verificar el rol de la cuenta.
La vista y la creación de solicitudes de Técnico requieren una cuenta de Técnico habilitada y no permiten actuar en nombre de otra persona.

## 4. Ingreso y cierre de sesión

### 4.1 Iniciar sesión

1. Abra la dirección web de Proyecto Alpha.
2. Escriba el correo asociado a su cuenta.
3. Ingrese su contraseña.
4. Seleccione **Iniciar sesión**.
5. Si los datos son válidos, el sistema abrirá el área de trabajo correspondiente al rol.

Si no logra ingresar, compruebe que el correo no tenga espacios, que la contraseña sea correcta y que la cuenta esté habilitada. Si el problema continúa, comuníquese con el administrador.

### 4.2 Mantener o cerrar la sesión

La aplicación mantiene la sesión mediante una cookie de autenticación. Cuando se aproxima su vencimiento, puede preguntar si desea continuar. Si responde que no, la sesión se cierra; también puede usar el botón de salida de la barra de navegación y confirmar la operación.

En equipos compartidos, cierre siempre la sesión antes de abandonar el equipo.

## 5. Navegación general

Después de ingresar, la barra superior muestra el correo, nombre y rol de la cuenta, además de las secciones autorizadas. Las rutas principales implementadas son:

- **Dashboard:** indicadores generales para administración.
- **Inventario y artículos:** consulta de existencias y artículos.
- **Operaciones de bodega:** operaciones de recepción, conteo, salida, merma y consumo interno.
- **Compras y facturación:** documentos tributarios y operaciones financieras.
- **Consultas y Cardex:** consulta de movimientos y reportes.
- **Admin TI:** administración de cuentas y registros de actividad.

Los nombres y opciones concretos que aparecen pueden depender del rol asignado y de los datos disponibles.

## 6. Procedimientos de operación

### 6.1 Preparar una compra

1. Ingrese con un rol autorizado para las operaciones de compras.
2. Registre o confirme que existan el proveedor, la obra y los artículos requeridos.
3. Cree la orden de compra indicando su número, proveedor y detalle de artículos, cantidades y precios.
4. Verifique la orden antes de guardarla.
5. Consulte posteriormente su estado y las cantidades solicitadas, recibidas y pendientes.

Una orden puede figurar como abierta, parcial o completa. La recepción física se registra en una etapa distinta.

### 6.2 Registrar la recepción de materiales

1. Ingrese a las operaciones de bodega y abra la opción de recepción.
2. Seleccione la orden de compra correspondiente.
3. Registre el número de guía, los bultos indicados y los recibidos.
4. Para cada detalle, informe las cantidades que aparecen en la guía y las que efectivamente llegaron.
5. Añada observaciones cuando exista una diferencia y guarde la recepción.
6. Revise el comprobante generado.

Cuando la recepción presenta diferencias, queda pendiente de revisión y no debe asumirse que las existencias ya se actualizaron. Finanzas o Supervisión revisa la discrepancia y resuelve la recepción de acuerdo con el flujo habilitado. Una recepción aprobada actualiza el inventario.

### 6.3 Registrar una factura

1. Ingrese a **Compras y facturación** con una cuenta autorizada.
2. Seleccione el proveedor y complete los datos del documento, folio, fechas y artículos.
3. Si corresponde, vincule la factura a la orden de compra pertinente.
4. Revise descuentos, subtotal, IVA y total calculados por el sistema.
5. Guarde y compruebe que el documento aparezca en la consulta de facturas.

El cálculo implementado contempla hasta tres descuentos sucesivos y un IVA de 19 %. Para documentos asociados a una orden, el sistema valida la relación con las cantidades recibidas y aprobadas para evitar duplicar ingresos al inventario. Si la factura no está asociada a una orden, las cantidades ingresan al inventario conforme a las reglas del sistema.

### 6.4 Registrar una salida hacia una obra

1. Abra **Operaciones de bodega** y seleccione la opción de salida.
2. Seleccione la obra y el técnico responsable o receptor.
3. Agregue artículos y cantidades.
4. Revise el detalle y confirme la operación.
5. Compruebe el resultado y, si es necesario, consulte el movimiento en Cardex.

El sistema valida la disponibilidad antes de confirmar la salida. No registre una cantidad distinta de la entregada físicamente.

### 6.5 Registrar un conteo físico

1. Abra la opción de conteo de inventario.
2. Seleccione los artículos incluidos en el conteo.
3. Registre la cantidad física observada y, si corresponde, una observación.
4. Guarde el conteo y revise el estado asignado.
5. Si existen diferencias, espere la revisión del Supervisor.

Un conteo sin diferencias queda registrado como tal. Uno con diferencias queda pendiente de aprobación o rechazo. Al aprobarse, se ajustan las existencias; al rechazarse, se conserva el motivo informado. El sistema también verifica que las existencias no hayan cambiado desde el conteo antes de aplicar el ajuste.

### 6.6 Registrar mermas o consumos internos

- **Merma:** registre el artículo, la cantidad, la obra asociada y el motivo.
- **Uso interno:** registre el artículo, la cantidad, el destino del material y la persona responsable de la solicitud.

Confirme que los datos describen el movimiento real antes de guardar. Estas operaciones disminuyen existencias y quedan disponibles para su consulta en el historial.

### 6.7 Consultar inventario y alertas

1. Abra **Inventario y artículos**.
2. Utilice los filtros disponibles, como texto/código, categoría o estado.
3. Revise el stock actual, el mínimo y la información de valorización que presente la pantalla.
4. Atienda los artículos bajo el mínimo conforme al procedimiento interno de abastecimiento.

Las alertas aparecen cuando hay artículos con un mínimo configurado mayor que cero y su stock está en o por debajo de ese mínimo. No sustituyen la verificación física de bodega.

### 6.7.1 Solicitar una compra desde Bodega

1. Con una cuenta de Bodega o Administrador, abra **Operaciones de bodega > Solicitar compra**. También puede usar **Solicitar compra** en una fila del inventario o en una alerta de stock.
2. Seleccione un artículo existente o ingrese el nombre y la descripción de uno nuevo. Si accedió desde inventario o una alerta, el artículo y una cantidad sugerida se precargan; puede modificar la cantidad.
3. Indique una cantidad entera positiva, una obra activa si corresponde y el motivo. Envíe la solicitud y consulte su estado en **Mis solicitudes**.

La solicitud queda pendiente. No crea el artículo nuevo, no modifica existencias y no registra movimientos en el Cardex. La revisión de solicitudes por Finanzas aún no está disponible.

### 6.7.2 Solicitar material desde terreno

1. Ingrese con una cuenta de Técnico y abra **Solicitar material**.
2. Seleccione una de sus obras activas y un material del catálogo. Si no está catalogado, seleccione **Material no catalogado** y describa lo necesario.
3. Indique una cantidad entera positiva, prioridad y justificación; envíe la solicitud.
4. Consulte el estado y la respuesta, cuando exista, en **Mis solicitudes**. Si no aparece ninguna obra, solicite a Finanzas que verifique su asignación.

La solicitud queda pendiente y no modifica el inventario ni el Cardex. La revisión por Finanzas todavía no está disponible.

### 6.8 Consultar y exportar el Cardex

1. Abra **Consultas y Cardex** con un rol autorizado.
2. Aplique los filtros disponibles: período, artículo, obra o tipo de movimiento.
3. Revise el detalle, el usuario, fecha, cantidad y saldo resultante.
4. Para generar un archivo, elija el formato disponible (PDF o Excel) y descargue el reporte.

El Cardex registra entradas de compra, salidas a obra, mermas, devoluciones, usos internos y ajustes de inventario. Utilice los filtros para delimitar el análisis antes de exportar.

### 6.9 Administrar cuentas (Administrador)

1. Abra **Admin TI**.
2. Consulte la lista de cuentas o los registros de actividad.
3. Para crear o modificar una cuenta, complete los datos solicitados y asigne el rol autorizado.
4. Deshabilite una cuenta solo con la autorización correspondiente.
5. Verifique el resultado de la operación en la lista.

Asigne el menor nivel de acceso necesario. No comparta cuentas entre personas.

## 7. Mensajes y resolución de problemas

| Situación | Acción recomendada |
|---|---|
| No puede iniciar sesión | Revise correo y contraseña; solicite verificar que la cuenta esté habilitada. |
| No aparece una sección | Compruebe que inició sesión con el rol esperado; consulte al administrador. |
| Acceso denegado | No intente eludir la restricción; solicite revisión de permisos. |
| No se carga información | Actualice una vez la página y compruebe que haya conexión; si persiste, informe hora, sección y operación al soporte. |
| Una operación no se confirma | Lea el mensaje de validación, corrija los datos indicados y vuelva a comprobar el estado antes de repetirla. |
| Una recepción o conteo queda pendiente | Solicite revisión al rol responsable; no vuelva a ingresar el mismo movimiento para intentar acelerar la aprobación. |

Al informar un incidente, describa los pasos realizados y el mensaje observado. No envíe contraseñas ni datos de sesión.

## 8. Buenas prácticas y límites

- Verifique cantidades, documentos, proveedor y obra antes de guardar.
- No registre dos veces una misma recepción, salida, merma o consumo.
- Use observaciones para explicar discrepancias y motivos de ajustes.
- Consulte el Cardex para confirmar el efecto de un movimiento.
- Los datos de demostración pertenecen al entorno de desarrollo y no deben confundirse con registros operacionales reales.
- La disponibilidad de las funciones está sujeta al rol y a la configuración del despliegue.

---

**Control del documento:** valide este manual contra la interfaz instalada y la matriz de permisos institucional antes de su aprobación formal.
