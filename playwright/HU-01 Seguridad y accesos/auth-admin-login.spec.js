import { test, expect } from '@playwright/test';

test('loguea como admin exitosamente', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/');
    await page.goto('http://127.0.0.1:5173/login');
    await page.getByRole('textbox', { name: 'correo@frioyagroindustria.cl' }).click();
    await page.getByRole('textbox', { name: 'correo@frioyagroindustria.cl' }).fill('admin@mail.cl');
    await page.getByRole('textbox', { name: 'correo@frioyagroindustria.cl' }).press('Tab');
    await page.getByRole('textbox', { name: 'Mínimo 8 carácteres, 1' }).fill('Qwerty1234!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    page.once('dialog', dialog => {
        console.log(`Dialog message: ${dialog.message()}`);
        dialog.dismiss().catch(() => { });
    });
    await page.getByRole('button').filter({ hasText: /^$/ }).click();
});
