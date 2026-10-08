import { expect } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

export type DemoAccount = "director" | "coordinator" | "coach" | "clubB" | "player" | "guardian";

/** Entrada amb un compte de demo des de la pantalla /entrar (com ho faria un usuari). */
export async function loginAs(page: Page, account: DemoAccount) {
  await page.goto("/entrar");
  const labels: Record<DemoAccount, RegExp> = {
    director: /Directora deportiva/, coordinator: /Club · Coordinación/, coach: /Entrenador · Juvenil A/, clubB: /Club B/, player: /Jugador · Pol/, guardian: /Tutora legal/,
  };
  await page.getByRole("button", { name: labels[account] }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
}

/** Sessió d'API per a proves de seguretat directes (sense interfície). */
export async function apiLogin(request: APIRequestContext, account: DemoAccount, baseURL: string) {
  const r = await request.post("/api/auth/demo", { data: { role: account }, headers: { Origin: baseURL } });
  expect(r.ok()).toBeTruthy();
}
