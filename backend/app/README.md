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

