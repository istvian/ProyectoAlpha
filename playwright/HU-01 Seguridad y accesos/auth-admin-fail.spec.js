import { test, expect } from '@playwright/test';

test('intenta loguearse con datos incorrectos', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/login');
    await page.getByRole('textbox', { name: 'correo@frioyagroindustria.cl' }).click();
    await page.getByRole('textbox', { name: 'correo@frioyagroindustria.cl' }).fill('admin@mail.cl');
    await page.getByRole('textbox', { name: 'correo@frioyagroindustria.cl' }).press('Tab');
    await page.getByRole('textbox', { name: 'Mínimo 8 carácteres, 1' }).fill('Qwerty1234');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    const mensaje = await page.getByText('Correo o contraseña')
    await expect(mensaje).toBeAttached()
});