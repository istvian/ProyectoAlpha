from locust import HttpUser, task, between

class UsuarioProyectoAlpha(HttpUser):
    # Simula un tiempo de espera humano de 1 a 3 segundos entre acciones
    wait_time = between(1, 3)

    def on_start(self):
        """
        Se ejecuta una vez por cada usuario simulado al entrar al sistema.
        Inicia sesión contra el backend FastAPI para obtener la cookie HttpOnly 'token'.
        El backend espera el campo 'correo' (no 'username').
        """
        payload = {
            "correo": "admin@mail.cl",  # Usuario por defecto con permisos completos (o bodega@mail.cl)
            "password": "Qwerty1234!"
        }
        with self.client.post("/api/v1/users/login", json=payload, catch_response=True, name="HU-01: Login") as response:
            if response.status_code == 200:
                data = response.json()
                if data.get("error"):
                    response.failure(data.get("mensaje", "Credenciales incorrectas"))
            else:
                response.failure(f"Fallo en login ({response.status_code}): {response.text}")

    @task(3)
    def consultar_cardex(self):
        """HU-03: Consulta frecuente del Cardex inalterable"""
        self.client.get("/api/v1/cardex", name="HU-03: Consultar Cardex")

    @task(2)
    def consultar_resumen_cardex(self):
        """HU-03: Consulta del resumen de movimientos del Cardex"""
        self.client.get("/api/v1/cardex/resumen", name="HU-03: Resumen Cardex")

    @task(2)
    def consultar_alertas_stock(self):
        """HU-06: Monitoreo continuo de stock mínimo en Dashboard"""
        self.client.get("/api/v1/alertas/stock-minimo", name="HU-06: Alertas Stock Mínimo")

    @task(2)
    def consultar_inventario(self):
        """Consulta general de inventario y existencias"""
        self.client.get("/api/v1/inventario", name="Inventario: Listado Artículos")

    @task(1)
    def consultar_docs_api(self):
        """Disponibilidad general del servidor FastAPI"""
        self.client.get("/openapi.json", name="Sistema: Esquema API")
