import { test, expect } from '@playwright/test';

const PASSWORD = 'Qwerty1234!';

async function loginComoBodega(page) {
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByRole('textbox', { name: 'correo@frioyagroindustria.cl' }).fill('bodega@mail.cl');
  await page.getByRole('textbox', { name: 'Mínimo 8 carácteres, 1' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
  await page.goto('http://127.0.0.1:5173/bodega/mermas');
  await expect(page.getByRole('heading', { name: 'Mermas y consumo interno' })).toBeVisible();
}

async function completarMerma(page, motivo) {
  await page.getByRole('button', { name: 'Registrar una merma' }).click();

  const articulo = page.getByRole('combobox', { name: 'Artículo' });
  await expect.poll(async () => {
    const opciones = await articulo.locator('option:not([disabled])').allTextContents();
    return opciones.filter((texto) => /stock: \d+/.test(texto)).length;
  }).toBeGreaterThan(0);
  const opciones = await articulo.locator('option:not([disabled])').allTextContents();
  const elegido = opciones.filter((texto) => /stock: \d+/.test(texto)).at(-1) ?? opciones[opciones.length - 1];
  await articulo.selectOption({ label: elegido });
  const sku = elegido.match(/\(([^)]+)\)/)?.[1] ?? '';

  await page.getByRole('spinbutton', { name: /Cantidad/ }).fill('1');
  if (motivo) {
    await page.getByRole('textbox', { name: /Motivo \/ Justificación/ }).fill(motivo);
  }
  return sku;
}

test('exige el motivo de merma para finalizar la operación', async ({ page }) => {
  await loginComoBodega(page);
  await completarMerma(page, '');

  await page.getByRole('button', { name: 'Guardar merma' }).click();

  await expect(page.getByRole('alert')).toContainText('El motivo o justificación es obligatorio.');
  await expect(page.getByText('Escriba el motivo o justificación para continuar.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Motivo \/ Justificación/ })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('registra la merma en el Cardex categorizada como Merma', async ({ page }) => {
  await loginComoBodega(page);
  const motivo = `Merma funcional ${Date.now()}`;
  const sku = await completarMerma(page, motivo);

  await page.getByRole('button', { name: 'Guardar merma' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Merma registrada' })).toContainText('Merma registrada; existencias y Cardex actualizados.');

  await page.goto('http://127.0.0.1:5173/bodega');
  await expect(page.getByRole('heading', { name: 'Historial de movimientos' })).toBeVisible();
  const movimiento = page.getByRole('row').filter({ hasText: 'Merma' }).filter({ hasText: motivo }).first();
  await expect(movimiento).toBeVisible();
  await expect(movimiento).toContainText('Merma');
  await expect(movimiento).toContainText(sku);
  await expect(movimiento.getByRole('cell').first()).toContainText('-26');
});
