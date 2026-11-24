import { test, expect } from "@playwright/test";

const API = "http://127.0.0.1:8027";

test("Bodega y Técnico consultan las decisiones de Finanzas sin movimientos ni órdenes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${API}/__test__/login/2`);
  const inventarioAntes = await (await page.request.get(`${API}/api/v1/egresos/catalogos`)).json();
  const cardexAntes = await (await page.request.get(`${API}/api/v1/cardex`)).json();
  const ordenesAntes = await (await page.request.get(`${API}/api/v1/facturas/ordenes-compra`)).json();
  expect(ordenesAntes.error).toBe(false);

  await page.goto("/bodega/solicitudes");
  await page.getByRole("combobox", { name: "Artículo", exact: true }).selectOption({ label: "E2E-BAJO · Artículo bajo E2E" });
  await page.getByLabel("Cantidad", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Agregar artículo" }).click();
  const compraExtra = page.getByRole("group", { name: "Artículo 2" });
  await compraExtra.getByLabel("Tipo de artículo").selectOption("nuevo");
  await compraExtra.getByLabel("Nombre del artículo").fill("Casco financiero");
  await compraExtra.getByLabel("Descripción").fill("Casco azul");
  await compraExtra.getByLabel("Cantidad").fill("4");
  await page.getByLabel("Motivo", { exact: true }).fill("Compra para revisar");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).toContainText("Compra para revisar");

  await page.goto(`${API}/__test__/login/5`);
  await page.goto("/tecnico/solicitudes");
  await page.getByLabel("Obra asignada").selectOption({ label: "E2E-OBRA · Obra E2E" });
  await page.getByLabel("Tipo de material").selectOption("nuevo");
  await page.getByLabel("Descripción del material").fill("Material especial para revisar");
  await page.getByLabel("Cantidad").fill("1");
  await page.getByRole("button", { name: "Agregar material" }).click();
  const materialExtra = page.getByRole("group", { name: "Material 2" });
  await materialExtra.getByRole("combobox", { name: "Material", exact: true }).selectOption({ label: "E2E-MERMAS · Artículo E2E" });
  await materialExtra.getByLabel("Cantidad").fill("3");
  await page.getByLabel("Prioridad").selectOption("ALTA");
  await page.getByLabel("Justificación").fill("Necesario en terreno");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).toContainText("Necesario en terreno");
  await expect(page.getByRole("region", { name: "Mis solicitudes" })).not.toContainText("Compra para revisar");

  await page.goto(`${API}/__test__/login/3`);
  await page.goto("/finanzas");
  await page.getByRole("button", { name: "Solicitudes de material" }).click();
  await expect(page).toHaveURL(/\/finanzas\/solicitudes$/);
  const compra = page.getByRole("article").filter({ hasText: "Compra para revisar" });
  const material = page.getByRole("article").filter({ hasText: "Necesario en terreno" });
  await expect(compra).toContainText("Solicitó: Bodega");
  await expect(compra).toContainText("Catálogo: Artículo bajo E2E");
  await expect(compra).toContainText("No catalogado: Casco financiero");
  await expect(compra).toContainText("Casco azul");
  await expect(compra).toContainText("Cantidad: 4");
  await expect(material).toContainText("Solicitó: Tecnico");
  await expect(material).toContainText("Material especial para revisar");
  await expect(material).toContainText("Catálogo: Artículo E2E");
  await expect(material).toContainText("Cantidad: 3");
  await expect(material).toContainText("Obra: Obra E2E");
  await expect(material).toContainText("Prioridad: ALTA");
  await page.getByRole("combobox", { name: "Tipo", exact: true }).selectOption("MATERIAL_TECNICO");
  await expect(compra).toHaveCount(0);
  await expect(material).toBeVisible();
  await material.getByRole("button", { name: "Rechazar" }).click();
  await expect(page.getByRole("alert")).toContainText("Indique el motivo");
  await material.getByLabel("Comentario de resolución (obligatorio para rechazar)").fill("Sin presupuesto");
  await material.getByRole("button", { name: "Rechazar" }).click();
  await expect(page.getByRole("status")).toContainText("rechazada");
  await expect(material).toHaveCount(0);
  await page.getByRole("combobox", { name: "Tipo", exact: true }).selectOption("COMPRA_BODEGA");
  await expect(compra).toBeVisible();
  await compra.getByLabel("Comentario de resolución (obligatorio para rechazar)").fill("Gestionar compra");
  await compra.getByRole("button", { name: "Aprobar" }).click();
  await expect(page.getByRole("status")).toContainText("aprobada");
  await expect(compra).toHaveCount(0);
  await page.getByRole("combobox", { name: "Estado", exact: true }).selectOption("APROBADA");
  await expect(compra).toContainText("Revisó: Finanzas");
  await expect(compra).toContainText("Gestionar compra");
  await expect(compra).toContainText("Casco financiero");
  await expect(compra.getByRole("button", { name: "Aprobar" })).toHaveCount(0);

  await page.goto(`${API}/__test__/login/2`);
  await page.goto("/bodega/solicitudes");
  const historialBodega = page.getByRole("region", { name: "Mis solicitudes" });
  await expect(historialBodega).toContainText("APROBADA");
  await expect(historialBodega).toContainText("Revisó: Finanzas");
  await expect(historialBodega).toContainText("Gestionar compra");
  await expect(historialBodega).toContainText("Casco financiero");
  await expect(historialBodega).toContainText("Cantidad: 4");
  await expect(historialBodega).not.toContainText("Necesario en terreno");
  const inventarioDespues = await (await page.request.get(`${API}/api/v1/egresos/catalogos`)).json();
  const cardexDespues = await (await page.request.get(`${API}/api/v1/cardex`)).json();
  const ordenesDespues = await (await page.request.get(`${API}/api/v1/facturas/ordenes-compra`)).json();
  expect(inventarioDespues.data.articulos).toEqual(inventarioAntes.data.articulos);
  expect(cardexDespues.paginacion.total).toBe(cardexAntes.paginacion.total);
  expect(ordenesDespues.data).toEqual(ordenesAntes.data);

  await page.goto(`${API}/__test__/login/5`);
  await page.goto("/tecnico/solicitudes");
  const historialTecnico = page.getByRole("region", { name: "Mis solicitudes" });
  await expect(historialTecnico).toContainText("RECHAZADA");
  await expect(historialTecnico).toContainText("Revisó: Finanzas");
  await expect(historialTecnico).toContainText("Sin presupuesto");
  await expect(historialTecnico).toContainText("Material especial para revisar");
  await expect(historialTecnico).toContainText("Artículo E2E");
});

test("solo Finanzas y Administrador acceden a la bandeja", async ({ page }) => {
  for (const rol of [2, 4, 5]) {
    await page.goto(`${API}/__test__/login/${rol}`);
    await page.goto("/finanzas/solicitudes");
    await expect(page).toHaveURL(/\/403$/);
  }
  await page.goto(`${API}/__test__/login/1`);
  await page.goto("/finanzas/solicitudes");
  await expect(page.getByRole("heading", { name: "Solicitudes de material" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Bandeja de solicitudes" })).toBeVisible();
});

test("Administrador puede decidir y se informa un conflicto de revisión", async ({ page }) => {
  await page.goto(`${API}/__test__/login/2`);
  const creada = await page.request.post(`${API}/api/v1/solicitudes-material`, {
    data: { items: [{ nombre_articulo: "Material para conflicto", cantidad: 1 }], motivo: "Prueba de revisión" },
  });
  expect(creada.status()).toBe(201);
  const id = (await creada.json()).data.id;
  const creadaAdmin = await page.request.post(`${API}/api/v1/solicitudes-material`, {
    data: { items: [{ nombre_articulo: "Material para administrador", cantidad: 1 }], motivo: "Decisión de administrador" },
  });
  expect(creadaAdmin.status()).toBe(201);
  const idAdmin = (await creadaAdmin.json()).data.id;
  await page.goto(`${API}/__test__/login/1`);
  await page.goto("/finanzas/solicitudes");
  const solicitud = page.getByRole("article", { name: `Solicitud ${id}` });
  await expect(solicitud).toBeVisible();
  const aprobada = await page.request.post(`${API}/api/v1/solicitudes-material/${id}/aprobar`, { data: {} });
  expect(aprobada.status()).toBe(200);
  expect((await aprobada.json()).data.revisado_por_nombre).toBe("Admin");
  await solicitud.getByRole("button", { name: "Aprobar" }).click();
  await expect(page.getByRole("alert")).toContainText("ya fue resuelta");
  await page.getByRole("button", { name: "Actualizar" }).click();
  await expect(solicitud).toHaveCount(0);
  const solicitudAdmin = page.getByRole("article", { name: `Solicitud ${idAdmin}` });
  await solicitudAdmin.getByRole("button", { name: "Aprobar" }).click();
  await expect(page.getByRole("status")).toContainText("aprobada");

  const otra = await page.request.get(`${API}/api/v1/solicitudes-material/finanzas`, {
    params: { estado: "APROBADA" },
  });
  expect((await otra.json()).data.find((item) => item.id === idAdmin).revisado_por_nombre).toBe("Admin");
});
