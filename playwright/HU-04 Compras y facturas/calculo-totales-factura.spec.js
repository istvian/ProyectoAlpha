import { test, expect } from '@playwright/test';

test('calcula importe base, descuentos sucesivos, IVA y total antes de guardar', async ({ page }) => {
  const folio = `CALC-${String(Math.floor(100000 + Math.random() * 900000))}`;

  // Los guardados muestran un alert() de confirmación; se acepta automáticamente.
  page.on('dialog', async (dialog) => {
    console.log(`Dialog: ${dialog.message()}`);
    await dialog.accept();
  });

  await page.goto('http://127.0.0.1:5173/login');
  await page.getByRole('textbox', { name: 'correo@frioyagroindustria.cl' }).fill('admin@mail.cl');
  await page.getByRole('textbox', { name: 'Mínimo 8 carácteres, 1' }).fill('Qwerty1234!');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await page.getByRole('link', { name: 'Compras y facturación' }).click();
  await page.getByRole('button', { name: 'Nueva factura' }).click();
  await page.getByRole('textbox', { name: 'Ingrese folio' }).fill(folio);

  await page.getByRole('button', { name: 'Nuevo producto' }).click();
  await page.getByRole('textbox', { name: 'Ingrese el nombre' }).fill('Producto Cálculo');
  await page.getByRole('textbox', { name: 'Ingrese la descripción' }).fill('Producto para validar totales');
  await page.getByRole('textbox', { name: 'Existente: suma stock; nuevo' }).fill(`CALC-${Date.now()}`);
  await page.getByRole('spinbutton', { name: 'Ingrese la cantidad', exact: true }).fill('10');
  await page.getByRole('spinbutton', { name: 'Ingrese la cantidad mínima' }).fill('1');
  await page.getByRole('spinbutton', { name: 'Ingrese precio neto' }).fill('1000');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();

  const descuentos = page.getByRole('spinbutton', { name: '%' });
  await descuentos.nth(0).fill('10');
  await descuentos.nth(1).fill('5');

  // 10 x $1.000 = $10.000; -10% = $9.000; -5% = $8.550; IVA 19% = $1.624,5.
  const totales = page.getByRole('heading', { name: 'Descuentos y totales de la factura' }).locator('..');
  async function expectTotal(etiqueta, valor) {
    const etiquetaLocator = totales.getByText(etiqueta, { exact: true });
    const valorEnFila = etiquetaLocator.locator('..').getByText(valor, { exact: true });
    if (await valorEnFila.count() === 0) {
      await expect(etiquetaLocator.locator('../..').getByText(valor, { exact: true })).toBeVisible();
    } else {
      await expect(valorEnFila).toBeVisible();
    }
  }
  await expectTotal('Importe base neto', '$10.000');
  await expectTotal('Descuento total', '-$1.450');
  await expectTotal('Subtotal neto', '$8.550');
  await expectTotal('IVA (19%)', '$1.624,5');
  await expectTotal('Total a Pagar', '$10.174,5');
});
