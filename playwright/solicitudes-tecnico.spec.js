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
  const id = await page.getByRole("combobox", { name: "Material", exact: true }).inputValue();
  await page.getByRole("button", { name: "Agregar material" }).click();
  const segundo = page.getByRole("group", { name: "Material 2" });
  await expect(segundo.getByRole("combobox", { name: "Material", exact: true }).locator(`option[value="${id}"]`)).toBeDisabled();
  await segundo.getByLabel("Tipo de material").selectOption("nuevo");
  await segundo.getByLabel("Descripción del material").fill("Cable especial de prueba");
  await segundo.getByLabel("Cantidad").fill("2");
  await page.getByRole("button", { name: "Agregar material" }).click();
  await page.getByRole("group", { name: "Material 3" }).getByRole("button", { name: "Quitar material" }).click();
  await page.getByLabel("Prioridad").selectOption("ALTA");
  await page.getByLabel("Justificación").fill("Trabajo urgente en obra");
  const enviada = page.waitForRequest((request) => request.method() === "POST" && request.url().endsWith("/solicitudes-material/tecnico"));
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  expect((await enviada).postDataJSON().items).toEqual([
    { articulo_id: Number(id), cantidad: 3 },
    { descripcion_articulo: "Cable especial de prueba", cantidad: 2 },
  ]);
  await expect(page.getByRole("status")).toContainText("El inventario no fue modificado");
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).toContainText("Prioridad: ALTA");
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).toContainText("Cable especial de prueba");

  await page.getByLabel("Tipo de material").selectOption("nuevo");
  await page.getByLabel("Descripción del material").fill("Otro material de prueba");
  await page.getByLabel("Cantidad").fill("2");
  await page.getByLabel("Prioridad").selectOption("BAJA");
  await page.getByLabel("Justificación").fill("Instalación");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).toContainText("Otro material de prueba");
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

test("un error conserva las filas y quitar la primera no altera las demás", async ({ page }) => {
  await page.goto(`${API}/__test__/login/5`);
  await page.goto("/tecnico/solicitudes");
  await page.getByLabel("Obra asignada").selectOption({ label: "E2E-OBRA · Obra E2E" });
  const primero = page.getByRole("group", { name: "Material 1" });
  await primero.getByRole("combobox", { name: "Material", exact: true }).selectOption({ label: "E2E-BAJO · Artículo bajo E2E" });
  await primero.getByLabel("Cantidad").fill("1");
  await page.getByRole("button", { name: "Agregar material" }).click();
  const segundo = page.getByRole("group", { name: "Material 2" });
  await segundo.getByLabel("Tipo de material").selectOption("nuevo");
  await segundo.getByLabel("Descripción del material").fill("Material conservado");
  await segundo.getByLabel("Cantidad").fill("7");
  await page.getByLabel("Justificación").fill("Trabajo en terreno");
  await page.route("**/api/v1/solicitudes-material/tecnico", async (route) => {
    await route.fulfill({ status: 404, json: { detail: "La obra ya no está asignada." } });
  }, { times: 1 });
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByRole("alert")).toContainText("La obra ya no está asignada");
  await expect(segundo.getByLabel("Descripción del material")).toHaveValue("Material conservado");
  await expect(segundo.getByLabel("Cantidad")).toHaveValue("7");
  await primero.getByRole("button", { name: "Quitar material" }).click();
  await expect(page.getByRole("group", { name: "Material 1" }).getByLabel("Descripción del material")).toHaveValue("Material conservado");
  const enviada = page.waitForRequest((request) => request.method() === "POST" && request.url().endsWith("/solicitudes-material/tecnico"));
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  expect((await enviada).postDataJSON().items).toEqual([{ descripcion_articulo: "Material conservado", cantidad: 7 }]);
  await expect(page.getByRole("status")).toContainText("registrada");
});

test("Bodega no tiene acceso a la vista de Técnico", async ({ page }) => {
  await page.goto(`${API}/__test__/login/2`);
  await page.goto("/tecnico/solicitudes");
  await expect(page).toHaveURL(/\/403$/);
});
