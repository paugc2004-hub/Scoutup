/**
 * Recorregut estrella (no es pot trencar):
 * login club → tauler → oportunitat → compatibles → perfil 87% → guardar → comparar → pipeline →
 * avaluació → contacte → tornar al tauler i veure l'activitat.
 */
import { expect, test } from "@playwright/test";
import { loginAs } from "./fixtures";

test("recorregut estrella del director esportiu", async ({ page }) => {
  await loginAs(page, "director");
  await expect(page).toHaveURL(/\/club$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Marta");

  // necessitat → oportunitat
  await page.getByRole("link", { name: "Oportunitats" }).first().click();
  await expect(page).toHaveURL(/\/club\/oportunitats/);
  await page.goto("/club/oportunitats/o_vn_central");
  await expect(page.getByText(/central/i).first()).toBeVisible();

  // perfil amb compatibilitat explicada
  await page.goto("/club/jugadors/p_biel?offer=o_vn_central");
  await expect(page.getByRole("heading", { name: /Biel/ })).toBeVisible();
  await expect(page.getByText("87% de compatibilitat")).toBeVisible();
  await expect(page.getByText("Compatibilitat amb l'oportunitat")).toBeVisible();

  // guardar
  await page.getByRole("button", { name: "Guardar" }).first().click();
  await expect(page.getByRole("button", { name: "Treure de guardats" }).first()).toBeVisible();

  // comparar
  await page.goto("/club/comparar?ids=p_biel,p_arnau,p_pol&offer=o_vn_central");
  await expect(page.getByText(/Biel/).first()).toBeVisible();

  // pipeline
  await page.goto("/club/jugadors/p_biel?offer=o_vn_central");
  await page.getByRole("button", { name: "Afegir al pipeline" }).click();
  await expect(page.getByText("Afegit al pipeline").first()).toBeVisible();

  // avaluació
  await page.goto("/club/jugadors/p_biel?offer=o_vn_central&tab=avaluacio");
  await page.getByPlaceholder(/Partit de lliga vs/).fill("Partit de lliga vs UE Serralada");
  await page.getByPlaceholder("Només visible per al club").fill("Dominant per alt. Cal veure'l sota pressió.");
  await page.getByRole("button", { name: "Guardar avaluació" }).click();
  await expect(page.getByText("Avaluació guardada").first()).toBeVisible();

  // contacte segur
  await page.getByRole("button", { name: "Contactar" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("textarea").fill("Hola Biel, som el CF Vallès Nord. Ens agradaria conèixer-te i explicar-te el projecte del Juvenil A.");
  await dialog.getByRole("button", { name: "Enviar sol·licitud" }).click();
  await expect(page.getByText(/Sol·licitud (de contacte )?enviada/).first()).toBeVisible();

  // tornar al tauler: l'activitat reflecteix el recorregut
  await page.goto("/club");
  const activity = page.locator("text=Activitat recent").locator("xpath=ancestor::*[contains(@class,'rounded')][1]");
  await expect(activity.getByText(/Biel/).first()).toBeVisible();
});

test("crear una oportunitat genera candidats compatibles", async ({ page }) => {
  await loginAs(page, "director");
  await page.goto("/club/oportunitats/nova");
  await expect(page.getByRole("heading", { name: "Què necessita l'equip?" })).toBeVisible();
  await page.getByPlaceholder(/^Busquem /).fill("Lateral dret per al Cadet A (E2E)");
  await page.getByRole("button", { name: "Publicar oportunitat" }).click();
  await page.waitForURL(/\/club\/oportunitats\/o_[a-z0-9]+/);
  await expect(page.getByText("Lateral dret per al Cadet A (E2E)").first()).toBeVisible();
  // hi ha candidats ordenats per compatibilitat (enllaços a perfils de jugadors)
  await expect(page.locator('a[href*="/club/jugadors/"]').first()).toBeVisible();
});

test("el perfil d'un jugador inexistent mostra una pàgina 404 humana", async ({ page }) => {
  await loginAs(page, "director");
  // Amb streaming (loading.tsx) Next.js pot respondre 200 amb el contingut de not-found i <meta name="robots" content="noindex">.
  const r = await page.goto("/club/jugadors/p_no_existeix");
  expect([200, 404]).toContain(r?.status());
  await expect(page.getByText("No hem trobat aquesta pàgina")).toBeVisible();
});

test("la cerca filtra al servidor (posició, peu i text sense accents)", async ({ page }) => {
  await loginAs(page, "director");
  await page.goto("/club/cercar?pos=DC&foot=esquerre");
  const cards = page.locator('a[aria-label^="Veure el perfil de"]');
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  await expect(page.getByText(/^Defensa central · \d+ anys/).first()).toBeVisible();
  await page.goto("/club/cercar?q=biel%20riera");
  await expect(page.getByRole("link", { name: "Veure el perfil de Biel Riera Coll" })).toBeVisible();
});
