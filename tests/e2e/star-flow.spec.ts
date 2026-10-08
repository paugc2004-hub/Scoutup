/**
 * Recorrido estrella (no se puede romper): «El Cadete A necesita un lateral derecho».
 * Login club → panel → oportunidad → 18 compatibles → perfil al 87 % → por qué encaja → guardar → comparar →
 * pipeline → evaluación → contacto (vía tutor) → volver al panel y ver la actividad.
 */
import { expect, test } from "@playwright/test";
import { loginAs } from "./fixtures";

const HUGO = "/club/jugadors/p_hugo?offer=o_vn_ld";

test("recorrido estrella de la directora deportiva", async ({ page }) => {
  await loginAs(page, "director");
  await expect(page).toHaveURL(/\/club$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Marta");

  // necesidad destacada en el panel
  const hero = page.getByRole("region", { name: "Necesidad prioritaria" });
  await expect(hero.getByRole("heading", { name: /Cadete A necesita un lateral derecho/ })).toBeVisible();
  await expect(hero.getByText("jugadores compatibles")).toBeVisible();

  // oportunidad → 18 compatibles
  await hero.getByRole("link", { name: /Ver los 18 compatibles/ }).click();
  await expect(page).toHaveURL(/\/club\/oportunitats\/o_vn_ld/);
  await expect(page.getByRole("heading", { level: 1, name: "Lateral derecho para el Cadete A" })).toBeVisible();
  await expect(page.getByText("jugadores compatibles", { exact: false }).first()).toBeVisible();

  // perfil al 87 % con el porqué
  await page.goto(HUGO);
  await expect(page.getByRole("heading", { level: 1, name: "Hugo Navarro Vila" })).toBeVisible();
  await expect(page.getByText("87% de compatibilidad").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "¿Por qué encaja?" })).toBeVisible();
  await expect(page.getByText("Compite en Preferente, un nivel por debajo del pedido.")).toBeVisible();

  // guardar
  await page.getByRole("button", { name: "Guardar" }).first().click();
  await expect(page.getByRole("button", { name: "Quitar de guardados" }).first()).toBeVisible();

  // comparar
  await page.goto("/club/comparar?ids=p_hugo,p_006,p_013&offer=o_vn_ld");
  await expect(page.getByText(/Hugo/).first()).toBeVisible();

  // pipeline
  await page.goto(HUGO);
  await page.getByRole("button", { name: "Añadir al pipeline" }).click();
  await expect(page.getByText("Añadido al pipeline").first()).toBeVisible();

  // evaluación privada
  await page.goto(`${HUGO}&tab=avaluacio`);
  await page.getByPlaceholder(/Partido de liga vs/).fill("Partido de liga vs CF Turó Alt");
  await page.getByPlaceholder("Solo visible para el club").fill("Mucho recorrido y buen centro. Verlo en defensa en el uno contra uno.");
  await page.getByRole("button", { name: "Guardar evaluación" }).click();
  await expect(page.getByText("Evaluación guardada").first()).toBeVisible();

  // contacto seguro: es menor → tutor
  await page.getByRole("button", { name: "Contactar" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/es menor de edad/)).toBeVisible();
  await dialog.locator("textarea").fill("Hola Hugo, somos el CF Vallès Nord. Nos gustaría conocerte y explicarte el proyecto del Cadete A.");
  await dialog.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByText("Solicitud enviada al tutor legal").first()).toBeVisible();

  // vuelta al panel: la actividad refleja el recorrido
  await page.goto("/club");
  const activity = page.locator("text=Actividad reciente").locator("xpath=ancestor::*[contains(@class,'rounded')][1]");
  await expect(activity.getByText(/Hugo Navarro/).first()).toBeVisible();
});

test("crear una oportunidad genera candidatos compatibles", async ({ page }) => {
  await loginAs(page, "director");
  await page.goto("/club/oportunitats/nova");
  await expect(page.getByRole("heading", { name: "¿Qué necesita el equipo?" })).toBeVisible();
  await page.getByPlaceholder(/^Buscamos /).fill("Pivote para el Juvenil B (E2E)");
  await page.getByRole("button", { name: "Publicar oportunidad" }).click();
  await page.waitForURL(/\/club\/oportunitats\/o_[a-z0-9]+/);
  await expect(page.getByText("Pivote para el Juvenil B (E2E)").first()).toBeVisible();
  await expect(page.locator('a[href*="/club/jugadors/"]').first()).toBeVisible();
});

test("la búsqueda filtra en el servidor (posición, pie y texto sin acentos)", async ({ page }) => {
  await loginAs(page, "director");
  await page.goto("/club/cercar?pos=DC&foot=esquerre");
  const cards = page.locator('a[aria-label^="Ver el perfil de"]');
  await expect(cards.first()).toBeVisible();
  await expect(page.getByText(/^Defensa central · \d+ años/).first()).toBeVisible();
  await page.goto("/club/cercar?q=biel%20riera");
  await expect(page.getByRole("link", { name: "Ver el perfil de Biel Riera Coll" })).toBeVisible();
});

test("el perfil de un jugador inexistente muestra una página 404 humana", async ({ page }) => {
  await loginAs(page, "director");
  // Con streaming (loading.tsx) Next.js puede responder 200 con el contenido de not-found y noindex.
  const r = await page.goto("/club/jugadors/p_no_existeix");
  expect([200, 404]).toContain(r?.status());
  await expect(page.getByText("No hemos encontrado esta página")).toBeVisible();
});
