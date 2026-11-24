import { test, expect } from "@playwright/test";

const API = "http://127.0.0.1:8027";

test("solicita un artículo desde inventario y desde la alerta", async ({ page }) => {
  await page.goto(`${API}/__test__/login/2`);
  const catalogo = await (await page.request.get(`${API}/api/v1/egresos/catalogos`)).json();
  const articulo = catalogo.data.articulos.find((item) => item.codigo_sku === "E2E-BAJO");
  const cardexAntes = await (await page.request.get(`${API}/api/v1/cardex`)).json();

  await page.goto("/inventario");
  const fila = page.getByRole("row").filter({ hasText: "E2E-BAJO" });
  await fila.getByRole("link", { name: "Solicitar compra" }).click();
  await expect(page.getByRole("combobox", { name: "Artículo", exact: true })).toHaveValue(String(articulo.id));
  await expect(page.getByLabel("Cantidad", { exact: true })).toHaveValue("3");
  await page.getByLabel("Motivo", { exact: true }).fill("Reponer material");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByRole("status")).toContainText("El inventario no fue modificado");
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).toContainText("PENDIENTE");
  await page.reload();
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).toContainText("Reponer material");

  await page.goto("/bodega");
  await page.locator("details").filter({ hasText: "La lista se actualiza" }).locator("summary").click();
  await page.getByRole("link", { name: "Solicitar compra" }).click();
  await expect(page.getByRole("combobox", { name: "Artículo", exact: true })).toHaveValue(String(articulo.id));
  await expect(page.getByLabel("Cantidad", { exact: true })).toHaveValue("3");

  const despues = await (await page.request.get(`${API}/api/v1/egresos/catalogos`)).json();
  expect(despues.data.articulos.find((item) => item.id === articulo.id).stock_actual).toBe(articulo.stock_actual);
  const cardexDespues = await (await page.request.get(`${API}/api/v1/cardex`)).json();
  expect(cardexDespues.paginacion.total).toBe(cardexAntes.paginacion.total);
});

test("solicita artículo nuevo con obra sin agregarlo al catálogo", async ({ page }) => {
  await page.goto(`${API}/__test__/login/2`);
  await page.goto("/bodega/solicitudes");
  await page.getByLabel("Tipo de artículo").selectOption("nuevo");
  await page.getByLabel("Nombre del artículo").fill("Material nuevo E2E");
  await page.getByLabel("Descripción").fill("Descripción de prueba");
  await page.getByLabel("Cantidad").fill("4");
  await page.getByLabel("Obra (opcional)").selectOption({ label: "E2E-OBRA · Obra E2E" });
  await page.getByLabel("Motivo").fill("Necesario en obra");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).toContainText("Material nuevo E2E");
  const catalogo = await (await page.request.get(`${API}/api/v1/egresos/catalogos`)).json();
  expect(catalogo.data.articulos.some((item) => item.nombre === "Material nuevo E2E")).toBe(false);
});

test("supervisor no puede solicitar desde inventario ni acceder a la vista", async ({ page }) => {
  await page.goto(`${API}/__test__/login/4`);
  await page.goto("/inventario");
  await expect(page.getByRole("row").filter({ hasText: "E2E-BAJO" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Solicitar compra" })).toHaveCount(0);
  await page.goto("/bodega/solicitudes");
  await expect(page).toHaveURL(/\/403$/);
});
