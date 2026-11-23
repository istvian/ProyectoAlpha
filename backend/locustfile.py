import uuid
from datetime import date, timedelta

from locust import HttpUser, between, task


class UsuarioProyectoAlpha(HttpUser):
    """Usuario simulado que recorre los endpoints principales de la API.

    Nota: varias operaciones de escritura modifican estado (stock, documentos,
    conteos, etc.). Las tareas intentan usar datos existentes/dinámicos y usan
    identificadores únicos para minimizar colisiones en pruebas de carga.
    """

    wait_time = between(1, 3)

    def on_start(self):
        self.ids = {
            "articulo_id": None,
            "articulo_sku": None,
            "obra_id": None,
            "tecnico_id": None,
            "proveedor_id": None,
            "proveedor_rut": None,
            "orden_compra_id": None,
            "detalle_orden_id": None,
            "recepcion_pendiente_id": None,
            "conteo_pendiente_id": None,
            "usuario_correo": None,
        }
        self._login()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _unique(self, prefix: str) -> str:
        return f"{prefix}-{uuid.uuid4().hex[:8]}"

    def _get_json(self, path: str, name: str, params=None):
        with self.client.get(path, params=params, name=name, catch_response=True) as response:
            if response.status_code >= 400:
                response.failure(f"{response.status_code}: {response.text[:200]}")
                return None
            try:
                data = response.json()
            except Exception:
                response.failure("Respuesta no es JSON")
                return None
            if isinstance(data, dict) and data.get("error"):
                response.failure(str(data.get("mensaje", "error=true")))
            return data

    def _login(self):
        payload = {
            "correo": "admin@mail.cl",
            "password": "Qwerty1234!",
        }
        with self.client.post(
            "/api/v1/users/login",
            json=payload,
            catch_response=True,
            name="Users: Login",
        ) as response:
            if response.status_code != 200:
                response.failure(f"Fallo en login ({response.status_code}): {response.text[:200]}")
                return
            data = response.json()
            if data.get("error"):
                response.failure(data.get("mensaje", "Credenciales incorrectas"))

    

    # ------------------------------------------------------------------
    # Sistema / Auth / Users
    # ------------------------------------------------------------------
    @task(1)
    def consultar_docs_api(self):
        self.client.get("/openapi.json", name="Sistema: Esquema API")

    @task(2)
    def users_check(self):
        self._get_json("/api/v1/users/check", name="Users: Check")

    @task(2)
    def users_userdata(self):
        self._get_json("/api/v1/users/userdata", name="Users: Userdata")

    @task(1)
    def users_renew(self):
        self._get_json("/api/v1/users/renew", name="Users: Renew")

  
    # ------------------------------------------------------------------
    # Admin
    # ------------------------------------------------------------------
    @task(1)
    def admin_dashboard(self):
        self._get_json("/api/v1/admin/dashboard", name="Admin: Dashboard")

    @task(2)
    def admin_users(self):
        self._get_json("/api/v1/admin/users", name="Admin: Listar usuarios")

    @task(1)
    def admin_logs(self):
        self._get_json("/api/v1/admin/logs", name="Admin: Logs", params={"cantidad": 20, "pagina": 1})

   
    # ------------------------------------------------------------------
    # Inventario
    # ------------------------------------------------------------------
    @task(3)
    def consultar_inventario(self):
        self._get_json("/api/v1/inventario", name="Inventario: Listado")

    @task(1)
    def inventario_filtros(self):
        self._get_json("/api/v1/inventario/filtros", name="Inventario: Filtros")

    @task(1)
    def inventario_exportar_excel(self):
        self.client.get(
            "/api/v1/inventario/exportar",
            params={"formato": "excel"},
            name="Inventario: Exportar Excel",
        )

    @task(1)
    def inventario_exportar_pdf(self):
        self.client.get(
            "/api/v1/inventario/exportar",
            params={"formato": "pdf"},
            name="Inventario: Exportar PDF",
        )

    # ------------------------------------------------------------------
    # Cardex
    # ------------------------------------------------------------------
    @task(2)
    def consultar_cardex(self):
        self._get_json("/api/v1/cardex", name="Cardex: Movimientos")

    @task(1)
    def consultar_resumen_cardex(self):
        self._get_json("/api/v1/cardex/resumen", name="Cardex: Resumen")

    @task(1)
    def cardex_filtros(self):
        self._get_json("/api/v1/cardex/filtros", name="Cardex: Filtros")

    @task(1)
    def cardex_exportar_excel(self):
        self.client.get(
            "/api/v1/cardex/exportar",
            params={"formato": "excel"},
            name="Cardex: Exportar Excel",
        )

    @task(1)
    def cardex_exportar_pdf(self):
        self.client.get(
            "/api/v1/cardex/exportar",
            params={"formato": "pdf"},
            name="Cardex: Exportar PDF",
        )

    # ------------------------------------------------------------------
    # Alertas
    # ------------------------------------------------------------------
    @task(3)
    def consultar_alertas_stock(self):
        self._get_json("/api/v1/alertas/stock-minimo", name="Alertas: Stock mínimo")

    # ------------------------------------------------------------------
    # Proveedores
    # ------------------------------------------------------------------
    @task(2)
    def proveedor_listar(self):
        data = self._get_json("/api/v1/proveedor", name="Proveedor: Listar")
        if isinstance(data, dict):
            items = data.get("data") or []
            if items:
                self.ids["proveedor_id"] = items[0].get("id")
                self.ids["proveedor_rut"] = items[0].get("rut")

   

    # ------------------------------------------------------------------
    # Obras
    # ------------------------------------------------------------------
    @task(2)
    def obras_listar(self):
        data = self._get_json("/api/v1/obras", name="Obras: Listar")
        if isinstance(data, dict):
            items = data.get("data") or []
            if items:
                self.ids["obra_id"] = items[0].get("id")

  

    # ------------------------------------------------------------------
    # Egresos
    # ------------------------------------------------------------------
    @task(2)
    def egresos_catalogos(self):
        data = self._get_json("/api/v1/egresos/catalogos", name="Egresos: Catálogos")
        if isinstance(data, dict):
            d = data.get("data") or {}
            articulos = d.get("articulos") or []
            obras = d.get("obras") or []
            tecnicos = d.get("tecnicos") or []
            if articulos:
                self.ids["articulo_id"] = articulos[0].get("id")
            if obras:
                self.ids["obra_id"] = obras[0].get("id")
            if tecnicos:
                self.ids["tecnico_id"] = tecnicos[0].get("id")

   

    # ------------------------------------------------------------------
    # Finanzas
    # ------------------------------------------------------------------
    @task(2)
    def finanzas_listar_facturas(self):
        self._get_json("/api/v1/finanzas/factura", name="Finanzas: Listar facturas")

    @task(1)
    def finanzas_tecnicos(self):
        self._get_json("/api/v1/finanzas/tecnicos", name="Finanzas: Técnicos")

 
    # ------------------------------------------------------------------
    # Facturas / Órdenes de compra / Recepciones
    # ------------------------------------------------------------------
    @task(2)
    def ordenes_compra_listar(self):
        data = self._get_json("/api/v1/facturas/ordenes-compra", name="Facturas: Listar OC")
        if isinstance(data, dict):
            items = data.get("data") or []
            if items:
                self.ids["orden_compra_id"] = items[0].get("id")

    @task(1)
    def ordenes_compra_obtener(self):
        oc_id = self.ids.get("orden_compra_id")
        if not oc_id:
            return
        self._get_json(f"/api/v1/facturas/ordenes-compra/{oc_id}", name="Facturas: Obtener OC")

    

    @task(1)
    def recepciones_pendientes(self):
        data = self._get_json(
            "/api/v1/facturas/recepciones/pendientes",
            name="Facturas: Recepciones pendientes",
        )
        if isinstance(data, dict):
            items = data.get("data") or []
            if items:
                self.ids["recepcion_pendiente_id"] = items[0].get("id")


    @task(2)
    def conteos_catalogos(self):
        self._get_json("/api/v1/inventario/conteos/catalogos", name="Conteos: Catálogos")

    @task(2)
    def conteos_listar(self):
        data = self._get_json("/api/v1/inventario/conteos", name="Conteos: Listar")
        if isinstance(data, dict):
            items = data.get("data") or []
            for c in items:
                if c.get("estado") == "PENDIENTE_APROBACION":
                    self.ids["conteo_pendiente_id"] = c.get("id")
                    break

