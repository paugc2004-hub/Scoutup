/** Un club nuevo llega al primer valor: registro → equipos → necesidad → oportunidad → jugadores compatibles. */
import { expect, test } from "@playwright/test";

test("registro de club y onboarding en 3 pasos", async ({ page }) => {
  const email = `club${Date.now()}@ejemplo.example`;
  await page.goto("/registre?type=club");
  await page.getByRole("button", { name: "Soy un club" }).click();
  await page.getByLabel("Nombre del club").fill("CF Prueba E2E");
  await page.getByLabel("Persona responsable").fill("Responsable E2E");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill("una-contraseña-segura");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear la cuenta del club" }).click();
  await page.waitForURL(/\/club\/bienvenida/);

  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Crear oportunidad y buscar" }).click();
  await expect(page.getByRole("heading", { name: "Tus primeros jugadores compatibles" })).toBeVisible();
  await page.getByRole("link", { name: "Ir al panel" }).click();
  await expect(page).toHaveURL(/\/club$/);
  await expect(page.getByText("Configura tu club en 3 pasos")).toHaveCount(0);
});
