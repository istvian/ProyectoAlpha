import { test, expect } from '@playwright/test';

const PASSWORD = 'Qwerty1234!';

async function loginComoBodega(page) {
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByRole('textbox', { name: 'correo@frioyagroindustria.cl' }).fill('bodega@mail.cl');
  await page.getByRole('textbox', { name: 'Mínimo 8 carácteres, 1' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
}


test('registra un conteo físico y muestra diferencias con el historial de costos', async ({ page }) => {
  await loginComoBodega(page);
  await page.goto('http://127.0.0.1:5173/bodega/conteo');
  await expect(page.getByRole('heading', { name: 'Conteo físico de inventario' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Registrar conteo' })).toBeVisible();

  const articulo = page.getByRole('combobox', { name: 'Artículo' });
  const opcion = (await articulo.locator('option').allTextContents())[1];
  const stockSistema = Number(opcion.match(/sistema: (\d+)/)?.[1] ?? 0);
  await articulo.selectOption({ label: opcion });
  await page.getByRole('spinbutton', { name: 'Cantidad contada' }).fill(String(Math.max(0, stockSistema - 1)));
  await page.getByRole('button', { name: 'Agregar artículo' }).click();

  const tablaBorrador = page.getByRole('table').filter({
    has: page.getByRole('columnheader', { name: 'Stock en sistema' }),
  });
  await expect(tablaBorrador.getByRole('cell', { name: '-1', exact: true })).toBeVisible();

  const observaciones = `Conteo funcional ${Date.now()}`;
  await page.getByRole('textbox', { name: 'Observaciones (opcional)' }).fill(observaciones);
  await page.getByRole('button', { name: 'Registrar conteo' }).click();
  await expect(page.getByRole('status')).toBeVisible();

  // Informe de diferencias: stock del sistema vs. conteo físico y últimos costos.
  const conteo = page.getByRole('article').filter({ hasText: observaciones }).first();
  await expect(conteo).toBeVisible();
  await expect(conteo.getByRole('columnheader', { name: 'Stock sistema' })).toBeVisible();
  await expect(conteo.getByRole('columnheader', { name: 'Conteo físico' })).toBeVisible();
  await expect(conteo.getByRole('columnheader', { name: 'Diferencia' })).toBeVisible();
  await expect(conteo.getByText('Últimos costos de compra')).toBeVisible();
  await expect(conteo.getByRole('cell', { name: /-1$/ })).toBeVisible();
});
