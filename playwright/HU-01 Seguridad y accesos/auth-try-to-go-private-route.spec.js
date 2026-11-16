import { test, expect } from '@playwright/test';

const protectedRoutes = [
  '/',
  '/inventario',
  '/finanzas',
  '/cardex',
  '/admin',
  '/bodega',
  '/bodega/recepcion',
  '/bodega/conteo',
  '/bodega/salida',
  '/bodega/mermas',
  '/ruta-inexistente',
];

for (const route of protectedRoutes) {
  test(`redirige a login al intentar acceder a ${route} sin autenticación`, async ({ page }) => {
    await page.goto(`http://127.0.0.1:5173${route}`);
    await expect(page).toHaveURL(/\/login/);
  });
}

