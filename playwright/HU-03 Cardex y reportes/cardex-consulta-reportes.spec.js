import { test, expect } from '@playwright/test';

const PASSWORD = 'Qwerty1234!';

async function loginComoAdmin(page) {
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByRole('textbox', { name: 'correo@frioyagroindustria.cl' }).fill('admin@mail.cl');
  await page.getByRole('textbox', { name: 'Mínimo 8 carácteres, 1' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
  await irA(page, 'http://127.0.0.1:5173/cardex', 'Consultas y Cardex');
}

// El guard de rol puede redirigir a /403 mientras valida la sesión; se reintenta.
async function irA(page, url, titulo) {
  for (let intento = 0; intento < 3; intento++) {
    await page.goto(url);
    try {
      await expect(page.getByRole('heading', { name: titulo })).toBeVisible({ timeout: 5000 });
      return;
    } catch {
      if (intento === 2) throw new Error(`No se pudo abrir ${url}: ${page.url()}`);
      await page.waitForTimeout(500);
    }
  }
}

// Las opciones de producto llegan desde /cardex/filtros; el select empieza deshabilitado.
async function seleccionarPrimerProducto(page) {
  const producto = page.getByRole('combobox').nth(0);
  await expect(producto).toBeEnabled();
  let opciones = [];
  await expect.poll(async () => {
    opciones = (await producto.locator('option').allTextContents()).filter((texto) => /\([^)]+\)/.test(texto));
    return opciones;
  }).not.toEqual([]);
  const opcionProducto = opciones[0];
  const sku = opcionProducto.match(/\(([^)]+)\)/)?.[1] ?? '';
  await producto.scrollIntoViewIfNeeded();
  await producto.selectOption({ label: opcionProducto });
  await expect.poll(async () => producto.inputValue()).not.toBe('');
  return sku;
}

test('filtra el Cardex por producto y por rango de fechas', async ({ page }) => {
  await loginComoAdmin(page);
  const tabla = page.getByRole('region', { name: 'Tabla de movimientos del Cardex' });

  const sku = await seleccionarPrimerProducto(page);

  const anio = new Date().getFullYear();
  const fechas = page.locator('input[type="date"]');
  await fechas.nth(0).fill(`${anio}-01-01`);
  await fechas.nth(1).fill(`${anio}-12-31`);
  await page.getByRole('button', { name: 'Consultar' }).click();

  // La tabla es de scroll horizontal: esperamos la celda y la traemos a la vista.
  const celdaSku = tabla.getByRole('cell', { name: sku, exact: true }).first();
  await expect(celdaSku).toBeVisible();
  await celdaSku.scrollIntoViewIfNeeded();

  const skus = await tabla.getByRole('row').evaluateAll((filas) =>
    filas.slice(1).map((fila) => fila.cells[2]?.textContent?.trim() ?? ''),
  );
  expect(skus.length).toBeGreaterThan(0);
  expect(new Set(skus).size).toBe(1);
  expect(skus[0]).toBe(sku);

  // Un rango sin movimientos no debe mostrar registros.
  await fechas.nth(0).fill(`${anio + 1}-01-01`);
  await fechas.nth(1).fill(`${anio + 1}-12-31`);
  await page.getByRole('button', { name: 'Consultar' }).click();
  await expect(page.getByText('No hay movimientos que coincidan con los filtros.')).toBeVisible();
});

test('exporta el reporte del Cardex a PDF y Excel', async ({ page }) => {
  await loginComoAdmin(page);
  await seleccionarPrimerProducto(page);
  await page.getByRole('button', { name: 'Consultar' }).click();

  const descargaPdf = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar PDF' }).click();
  const pdf = await descargaPdf;
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);

  const descargaExcel = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar Excel' }).click();
  const excel = await descargaExcel;
  expect(excel.suggestedFilename()).toMatch(/\.xlsx$/);
});
