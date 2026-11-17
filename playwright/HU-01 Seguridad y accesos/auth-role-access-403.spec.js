import { test, expect } from '@playwright/test';

const PASSWORD = 'Qwerty1234!';

const roles = ['admin', 'finanzas', 'supervisor', 'bodega', 'tecnico'];

const routes = [
  { path: '/', allowed: ['admin'] },
  { path: '/inventario', allowed: ['supervisor', 'admin', 'bodega'] },
  { path: '/finanzas', allowed: ['finanzas', 'admin'] },
  { path: '/cardex', allowed: ['bodega', 'finanzas', 'admin'] },
  { path: '/admin', allowed: ['admin'] },
  { path: '/bodega', allowed: ['bodega', 'admin'] },
  { path: '/bodega/recepcion', allowed: ['bodega', 'admin'] },
  { path: '/bodega/conteo', allowed: ['bodega', 'admin'] },
  { path: '/bodega/salida', allowed: ['bodega', 'admin'] },
  { path: '/bodega/mermas', allowed: ['bodega', 'admin'] },
];

async function loginAs(page, role) {
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByRole('textbox', { name: 'correo@frioyagroindustria.cl' }).fill(`${role}@mail.cl`);
  await page.getByRole('textbox', { name: 'Mínimo 8 carácteres, 1' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
}

for (const role of roles) {
  test.describe(`Acceso por rol: ${role}`, () => {
    for (const { path, allowed } of routes) {
      const isAllowed = allowed.includes(role);

      if (isAllowed) {
        test(`${role} puede acceder a ${path}`, async ({ page }) => {
          await loginAs(page, role);
          await page.goto(`http://127.0.0.1:5173${path}`);
          await expect(page).not.toHaveURL(/\/403/);
          await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
        });
      } else {
        test(`${role} es redirigido a /403 al acceder a ${path}`, async ({ page }) => {
          await loginAs(page, role);
          await page.goto(`http://127.0.0.1:5173${path}`);
          await expect(page).toHaveURL(/\/403/);
        });
      }
    }
  });
}
