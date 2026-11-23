import { test, expect } from '@playwright/test';

const PASSWORD = 'Qwerty1234!';

async function loginComoBodega(page) {
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByRole('textbox', { name: 'correo@frioyagroindustria.cl' }).fill('bodega@mail.cl');
  await page.getByRole('textbox', { name: 'Mínimo 8 carácteres, 1' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
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

// Los catálogos se cargan por API: esperamos a que el select tenga artículos reales.
async function esperarOpciones(combo, patron) {
  await expect(combo).toBeEnabled();
  await expect.poll(async () => {
    const opciones = await combo.locator('option').allTextContents();
    return opciones.some((texto) => patron.test(texto));
  }).toBe(true);
  return combo.locator('option').allTextContents();
}

// Toma el artículo con más stock para no agotar las existencias de la demo.
async function seleccionarProducto(page) {
  const producto = page.getByRole('combobox', { name: 'Producto / SKU' });
  const opciones = await esperarOpciones(producto, /stock \d+/);
  const disponibles = opciones
    .slice(1)
    .map((texto) => ({ texto, stock: Number(texto.match(/stock (\d+)/)?.[1] ?? 0) }))
    .filter((item) => item.stock > 0)
    .sort((a, b) => b.stock - a.stock);
  if (disponibles.length === 0) {
    throw new Error('No hay artículos con stock disponible para registrar la salida.');
  }
  const elegido = disponibles[0];
  await producto.scrollIntoViewIfNeeded();
  await producto.selectOption({ label: elegido.texto });
  await expect.poll(async () => producto.inputValue()).not.toBe('');
  return elegido;
}

test('no permite egresar más unidades que el stock disponible', async ({ page }) => {
  await loginComoBodega(page);
  await irA(page, 'http://127.0.0.1:5173/bodega/salida', 'Salida de Materiales');
  await expect(page.getByRole('button', { name: 'Guardar salida' })).toBeDisabled();

  const producto = await seleccionarProducto(page);
  const cantidad = page.getByRole('spinbutton', { name: 'Ingresa la cantidad' });
  await expect(cantidad).toBeEnabled();

  // La cantidad se limita al stock disponible.
  await cantidad.fill(String(producto.stock + 10));
  await expect(cantidad).toHaveValue(String(producto.stock));
  await page.getByRole('button', { name: 'Agregar artículo' }).click();

  // Agregar una unidad adicional del mismo artículo supera el stock.
  const selectorProducto = page.getByRole('combobox', { name: 'Producto / SKU' });
  await selectorProducto.scrollIntoViewIfNeeded();
  await selectorProducto.selectOption({ label: producto.texto });
  await cantidad.fill('1');
  await page.getByRole('button', { name: 'Agregar artículo' }).click();

  await expect(page.getByRole('alert')).toContainText('Stock insuficiente para');
  await expect(page.getByRole('alert')).toContainText(`Disponible: ${producto.stock}.`);
});
