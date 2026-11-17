import { test, expect } from '@playwright/test';

test('agregar factura con descuentos', async ({ page }) => {
    const proveedor = 'Proveedor de Ejemplo';
    const obra = 'Obra Test';
    const folio = String(Math.floor(100000000 + Math.random() * 900000000));

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

    // Crear proveedor solo si no existe en la tabla.
    const proveedorEnTabla = await page.getByRole('cell', { name: proveedor }).first();
    if ((await proveedorEnTabla.count()) === 0) {
        await page.getByRole('button', { name: 'Agregar proveedor' }).click();
        await page.getByRole('textbox', { name: 'Ingrese la razón social' }).fill(proveedor);
        await page.getByRole('textbox', { name: '-5' }).fill('12.345.678-5');
        await page.getByRole('button', { name: 'Crear proveedor' }).click();
        await expect(page.getByRole('cell', { name: proveedor }).first()).toBeVisible();
    }

    // Crear obra solo si no existe en la tabla.
    const obraEnTabla = await page.getByRole('cell', { name: obra }).first();
    if ((await obraEnTabla.count()) === 0) {
        await page.getByRole('button', { name: 'Agregar obra' }).click();
        await page.getByRole('textbox', { name: 'Ingrese el nombre de la obra' }).fill(obra);
        await page.getByRole('textbox', { name: 'Ingrese el tipo de servicio' }).fill('Test Funcional');
        await page.getByRole('button', { name: /Crear (obra|proveedor)/ }).click();
        await expect(page.getByRole('cell', { name: obra }).first()).toBeVisible();
    }

    // Nueva factura con folio aleatorio.
    await page.getByRole('button', { name: 'Nueva factura' }).click();
    await page.getByRole('combobox').first().selectOption(proveedor);
    await page.getByRole('textbox', { name: 'Ingrese folio' }).fill(folio);

    // Producto de la factura.
    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    await page.getByRole('textbox', { name: 'Ingrese el nombre' }).fill('Producto Test');
    await page.getByRole('textbox', { name: 'Ingrese la descripción' }).fill('Producto Test Descripción');
    await page.getByRole('textbox', { name: 'Existente: suma stock; nuevo' }).fill(String(Date.now()));
    await page.getByRole('spinbutton', { name: 'Ingrese la cantidad', exact: true }).fill('50');
    await page.getByRole('spinbutton', { name: 'Ingrese la cantidad mínima' }).fill('10');
    await page.getByRole('spinbutton', { name: 'Ingrese precio neto' }).fill('1000');
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();

    await page.getByRole('textbox', { name: 'Ingresa observaciones' }).fill('Observacion Test');

    const descuentos = page.getByRole('spinbutton', { name: '%' });
    await descuentos.nth(0).fill('5');
    await descuentos.nth(1).fill('10');
    await descuentos.nth(2).fill('15');

    await page.getByRole('button', { name: 'Registrar factura y' }).click();

    await expect(page.getByRole('cell', { name: folio }).first()).toBeVisible();
});