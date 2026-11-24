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
  await expect(page.getByRole("button", { name: "Quitar artículo" })).toBeDisabled();
  await page.getByRole("button", { name: "Agregar artículo" }).click();
  const segunda = page.getByRole("group", { name: "Artículo 2" });
  const selector = segunda.getByRole("combobox", { name: "Artículo", exact: true });
  await expect(selector.locator(`option[value="${articulo.id}"]`)).toBeDisabled();
  await segunda.getByLabel("Tipo de artículo").selectOption("nuevo");
  await segunda.getByLabel("Nombre del artículo").fill("Casco de reposición");
  await segunda.getByLabel("Descripción").fill("Color azul");
  await segunda.getByLabel("Cantidad").fill("2");
  await page.getByRole("button", { name: "Agregar artículo" }).click();
  await page.getByRole("group", { name: "Artículo 3" }).getByRole("button", { name: "Quitar artículo" }).click();
  await expect(page.getByRole("group", { name: "Artículo 3" })).toHaveCount(0);
  await page.getByLabel("Motivo", { exact: true }).fill("Reponer material");
  const enviada = page.waitForRequest((request) => request.method() === "POST" && request.url().endsWith("/solicitudes-material"));
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  expect((await enviada).postDataJSON().items).toEqual([
    { articulo_id: articulo.id, cantidad: 3 },
    { nombre_articulo: "Casco de reposición", descripcion_articulo: "Color azul", cantidad: 2 },
  ]);
  await expect(page.getByRole("status")).toContainText("El inventario no fue modificado");
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).toContainText("PENDIENTE");
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).toContainText("Casco de reposición");
  await expect(page.getByRole("group", { name: "Artículo 1" }).getByLabel("Cantidad")).toHaveValue("");
  await expect(page.getByRole("group", { name: "Artículo 2" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).toContainText("Reponer material");
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).toContainText("Color azul");

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

test("valida cantidades y no permite enviar artículos duplicados", async ({ page }) => {
  await page.goto(`${API}/__test__/login/2`);
  await page.goto("/bodega/solicitudes");
  const primera = page.getByRole("group", { name: "Artículo 1" });
  await primera.getByRole("combobox", { name: "Artículo", exact: true }).selectOption({ label: "E2E-BAJO · Artículo bajo E2E" });
  const cantidad = primera.getByLabel("Cantidad");
  for (const valor of ["0", "1.5", "2147483648"]) {
    await cantidad.fill(valor);
    expect(await cantidad.evaluate((input) => input.checkValidity())).toBe(false);
  }
  await cantidad.fill("1");
  await page.getByRole("button", { name: "Agregar artículo" }).click();
  const segunda = page.getByRole("group", { name: "Artículo 2" });
  const selector = segunda.getByRole("combobox", { name: "Artículo", exact: true });
  const id = await primera.getByRole("combobox", { name: "Artículo", exact: true }).inputValue();
  await expect(selector.locator(`option[value="${id}"]`)).toBeDisabled();
  await selector.locator(`option[value="${id}"]`).evaluate((option) => { option.disabled = false; });
  await selector.selectOption(id);
  await segunda.getByLabel("Cantidad").fill("1");
  await page.getByLabel("Motivo").fill("Reposición");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByRole("alert")).toContainText("No se puede repetir");
  await segunda.getByRole("button", { name: "Quitar artículo" }).click();
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByRole("status")).toContainText("registrada");
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
