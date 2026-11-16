# Pruebas funcionales 

Para las pruebas funcionales se utiliza PlayWright, a continuación se explican los pasos a seguir para configurar, crear y ejecutar pruebas funcionales

## Configuración

```bash
# 1) Navega con una terminal a este directorio

# 2) Instala dependencias necesarias
npm install
npx playwright install

# 3) Ejecuta pruebas
npx playwright test

```

## Crear pruebas

Para crear pruebas tienes que usar este comando

```bash
# Este comando abre el navegador y puedes grabar los pasos para crear las pruebas. Cuando termines la acción solicitada, copias el código en un archivo con nombre descriptivo que finalice en .spec.js
npx playwright codegen 127.0.0.1:5173
```

## Ejecutar pruebas

```bash
# Para ejecutar las pruebas debes ejecutar este comando
npx playwright test
```