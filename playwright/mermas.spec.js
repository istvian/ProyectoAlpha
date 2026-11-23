import { test, expect } from "@playwright/test";

const API = "http://127.0.0.1:8027";

async function entrar(page, rol) {
  await page.goto(`${API}/__test__/login/${rol}`);
}

test("reintenta una merma tras perder la respuesta sin descontar dos veces", async ({ page }) => {
  await entrar(page, 2);
  const catalogo = await (await page.request.get(`${API}/api/v1/egresos/catalogos`)).json();
  const articulo = catalogo.data.articulos.find((item) => item.codigo_sku === "E2E-MERMAS");
  expect(articulo).toBeTruthy();

  const claves = [];
  let primeraRespuesta;
  await page.route("**/api/v1/mermas", async (route) => {
    claves.push(route.request().headers()["idempotency-key"]);
    if (claves.length === 1) {
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      primeraRespuesta = await response.json();
      await route.abort("failed");
    } else {
      await route.continue();
    }
  });

  await page.goto("/bodega/mermas");
  await page.locator("#articulo").selectOption(String(articulo.id));
  await page.locator("#cantidad").fill("3");
  await page.locator("#motivo").fill("Rotura de prueba");
  await page.getByRole("button", { name: "Guardar merma" }).click();
  await expect(page.getByText("Hay una operación pendiente.", { exact: false })).toBeVisible();
  await page.reload();
  const repeticion = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/mermas") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Reintentar operación" }).click();
  const repetida = await repeticion;
  expect(repetida.status()).toBe(201);
  expect(await repetida.json()).toEqual(primeraRespuesta);
  expect(claves).toHaveLength(2);
  expect(claves[1]).toBe(claves[0]);
  const data = primeraRespuesta.data;
  await expect(page.getByText(`registro #${data.id}, movimiento Cardex #${data.cardex_id}, stock resultante: ${articulo.stock_actual - 3}`, { exact: false })).toBeVisible();
  const actualizado = await (await page.request.get(`${API}/api/v1/egresos/catalogos`)).json();
  expect(actualizado.data.articulos.find((item) => item.id === articulo.id).stock_actual).toBe(articulo.stock_actual - 3);
  const cardex = await (await page.request.get(`${API}/api/v1/cardex`, { params: { producto_id: articulo.id, tipo_movimiento: "MERMA" } })).json();
  expect(cardex.data.filter((movimiento) => movimiento.id === data.cardex_id)).toHaveLength(1);
});

test("registra uso interno con obra y comprueba su movimiento", async ({ page }) => {
  await entrar(page, 2);
  const catalogo = await (await page.request.get(`${API}/api/v1/egresos/catalogos`)).json();
  const articulo = catalogo.data.articulos.find((item) => item.codigo_sku === "E2E-MERMAS");
  const obra = catalogo.data.obras.find((item) => item.codigo_obra === "E2E-OBRA");
  expect(articulo).toBeTruthy();
  expect(obra).toBeTruthy();

  await page.goto("/bodega/mermas");
  await page.getByRole("button", { name: "Registrar uso interno" }).click();
  await page.locator("#articulo").selectOption(String(articulo.id));
  await page.locator("#cantidad").fill("2");
  await page.locator("#destino").fill("Reparación");
  await page.locator("#responsable").fill("Encargado");
  await page.getByRole("checkbox", { name: "Asociar a una obra" }).check();
  await page.getByRole("button", { name: "Guardar consumo interno" }).click();
  await expect(page.getByText("Seleccione la obra relacionada.")).toBeVisible();
  await page.locator("#obra").selectOption(String(obra.id));
  const enviado = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/usos-internos") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Guardar consumo interno" }).click();
  const response = await enviado;
  expect(response.status()).toBe(201);
  const data = (await response.json()).data;
  expect(data.obra_id).toBe(obra.id);
  expect(data.stock_resultante).toBe(articulo.stock_actual - 2);
  await expect(page.getByText(`registro #${data.id}, movimiento Cardex #${data.cardex_id}, stock resultante: ${data.stock_resultante}`, { exact: false })).toBeVisible();
  const cardex = await (await page.request.get(`${API}/api/v1/cardex`, { params: { producto_id: articulo.id, tipo_movimiento: "USO_INTERNO" } })).json();
  const movimiento = cardex.data.find((item) => item.id === data.cardex_id);
  expect(movimiento.obra.id).toBe(obra.id);
  expect(movimiento.cantidad).toBe(2);
});

test("Cardex muestra exportación solo a roles autorizados", async ({ page }) => {
  for (const [rol, exporta] of [[1, true], [3, false], [4, true]]) {
    await entrar(page, rol);
    await page.goto("/cardex");
    await expect(page.getByRole("heading", { name: "Consultas y Cardex" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Consultas y Cardex" })).toBeVisible();
    await expect(page.getByText("No se pudo consultar el Cardex:", { exact: false })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Descargar PDF" })).toHaveCount(exporta ? 1 : 0);
    await expect(page.getByRole("button", { name: "Descargar Excel" })).toHaveCount(exporta ? 1 : 0);
  }
});
