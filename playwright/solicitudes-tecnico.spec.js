import { test, expect } from "@playwright/test";

const API = "http://127.0.0.1:8027";

test("técnico inicia sesión y solicita materiales desde terreno", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${API}/__test__/login/2`);
  const inventarioAntes = await (await page.request.get(`${API}/api/v1/egresos/catalogos`)).json();
  const cardexAntes = await (await page.request.get(`${API}/api/v1/cardex`)).json();

  await page.goto("/login");
  await page.getByPlaceholder("correo@frioyagroindustria.cl").fill("e2e-5@example.com");
  await page.getByPlaceholder("Mínimo 8 carácteres, 1 mayuscula, 1 minuscula y 1 número").fill("PruebaTecnico1!");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/tecnico\/solicitudes$/);
  await expect(page.getByRole("link", { name: "Solicitar material" })).toBeVisible();
  const obras = page.getByLabel("Obra asignada");
  await expect(obras.locator("option")).toHaveCount(2);
  await obras.selectOption({ label: "E2E-OBRA · Obra E2E" });
  await page.getByRole("combobox", { name: "Material", exact: true }).selectOption({ label: "E2E-BAJO · Artículo bajo E2E" });
  await page.getByLabel("Cantidad").fill("3");
  await page.getByLabel("Prioridad").selectOption("ALTA");
  await page.getByLabel("Justificación").fill("Trabajo urgente en obra");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByRole("status")).toContainText("El inventario no fue modificado");
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).toContainText("Prioridad: ALTA");

  await page.getByLabel("Tipo de material").selectOption("nuevo");
  await page.getByLabel("Descripción del material").fill("Cable especial de prueba");
  await page.getByLabel("Cantidad").fill("2");
  await page.getByLabel("Prioridad").selectOption("BAJA");
  await page.getByLabel("Justificación").fill("Instalación");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).toContainText("Cable especial de prueba");
  await page.reload();
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).toContainText("Trabajo urgente en obra");
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).toContainText("PENDIENTE");

  await page.goto(`${API}/__test__/login/2`);
  const inventarioDespues = await (await page.request.get(`${API}/api/v1/egresos/catalogos`)).json();
  const cardexDespues = await (await page.request.get(`${API}/api/v1/cardex`)).json();
  expect(inventarioDespues.data.articulos).toEqual(inventarioAntes.data.articulos);
  expect(cardexDespues.paginacion.total).toBe(cardexAntes.paginacion.total);
});

test("técnico sin obras activas recibe aviso y no puede enviar", async ({ page }) => {
  await page.goto(`${API}/__test__/login/5`);
  await page.route("**/api/v1/solicitudes-material/tecnico/contexto", async (route) => {
    await route.fulfill({ json: { error: false, mensaje: "Sin obras", data: { obras: [], articulos: [] } } });
  });
  await page.goto("/tecnico/solicitudes");
  await expect(page.getByText("No tienes obras activas asignadas.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar solicitud" })).toBeDisabled();
});

test("Bodega no tiene acceso a la vista de Técnico", async ({ page }) => {
  await page.goto(`${API}/__test__/login/2`);
  await page.goto("/tecnico/solicitudes");
  await expect(page).toHaveURL(/\/403$/);
});
