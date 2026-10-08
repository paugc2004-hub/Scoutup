/** «Break my app»: proves de seguretat controlades contra la pròpia aplicació (mai contra tercers). */
import { expect, test } from "@playwright/test";
import { apiLogin, loginAs } from "./fixtures";

test.describe("sense sessió", () => {
  test("les rutes privades redirigeixen a /entrar", async ({ page }) => {
    for (const path of ["/club", "/club/pipeline", "/club/configuracio", "/club/jugadors/p_biel"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/entrar$/);
    }
  });

  test("l'API respon 401 i no es pot restaurar la demo", async ({ request, baseURL }) => {
    expect((await request.get("/api/notifications")).status()).toBe(401);
    expect((await request.post("/api/demo/reset", { headers: { Origin: baseURL! } })).status()).toBe(401);
    expect((await request.post("/api/pipeline", { data: { playerId: "p_biel" }, headers: { Origin: baseURL! } })).status()).toBe(401);
  });

  test("una cookie de sessió manipulada no dona accés", async ({ request }) => {
    const r = await request.get("/api/notifications", { headers: { Cookie: "su_session=" + "a".repeat(64) } });
    expect(r.status()).toBe(401);
  });
});

test.describe("CSRF i format", () => {
  test("rebutja escriptures d'un altre origen o que no són JSON", async ({ request, baseURL }) => {
    await apiLogin(request, "director", baseURL!);
    const evil = await request.post("/api/notes", { data: { playerId: "p_biel", body: "csrf" }, headers: { Origin: "https://evil.example" } });
    expect(evil.status()).toBe(403);
    const plain = await request.post("/api/notes", { data: '{"playerId":"p_biel","body":"x"}', headers: { Origin: baseURL!, "Content-Type": "text/plain" } });
    expect(plain.status()).toBe(415);
  });
});

test.describe("autorització per rol", () => {
  test("l'entrenador no pot crear oportunitats, editar el club ni gestionar usuaris", async ({ request, baseURL }) => {
    await apiLogin(request, "coach", baseURL!);
    const h = { Origin: baseURL! };
    expect((await request.post("/api/offers", { headers: h, data: { team_id: "t_vn_juva", title: "Hack", position: "DC", level_min: 3, zone_city: "Sabadell", max_km: 30, foot: "indiferent" } })).status()).toBe(403);
    expect((await request.patch("/api/club", { headers: h, data: { description: "pwned" } })).status()).toBe(403);
    expect((await request.patch("/api/club/users/u_coach", { headers: h, data: { role: "director" } })).status()).toBe(403);
    expect((await request.post("/api/demo/reset", { headers: h })).status()).toBe(403);
  });

  test("la coordinació pot crear oportunitats però no gestionar usuaris", async ({ request, baseURL }) => {
    await apiLogin(request, "coordinator", baseURL!);
    const h = { Origin: baseURL! };
    const ok = await request.post("/api/offers", { headers: h, data: { team_id: "t_vn_juvb", title: "Extrem per al Juvenil B", position: "ED", level_min: 3, zone_city: "Sabadell", max_km: 30, foot: "indiferent" } });
    expect(ok.status()).toBe(200);
    expect((await request.patch("/api/club/users/u_coach", { headers: h, data: { status: "disabled" } })).status()).toBe(403);
  });

  test("la interfície de l'entrenador no mostra accions d'administració", async ({ page }) => {
    await loginAs(page, "coach");
    await page.goto("/club/configuracio");
    await expect(page.getByRole("heading", { level: 1, name: "Permisos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Convidar usuari" })).toHaveCount(0);
  });
});

test.describe("aïllament entre clubs (IDOR)", () => {
  test("el Club B no pot tocar res del Club A canviant identificadors", async ({ request, baseURL }) => {
    await apiLogin(request, "clubB", baseURL!);
    const h = { Origin: baseURL! };
    expect((await request.patch("/api/club/users/u_coach", { headers: h, data: { status: "disabled" } })).status()).toBe(404);
    expect((await request.patch("/api/offers/o_vn_central", { headers: h, data: { status: "tancada" } })).status()).toBe(404);
    expect((await request.post("/api/conversations/cv_1/messages", { headers: h, data: { body: "hola" } })).status()).toBe(403);
  });

  test("les notes privades del Club A no apareixen al perfil vist pel Club B", async ({ page }) => {
    await loginAs(page, "clubB");
    await page.goto("/club/jugadors/p_arnau");
    await expect(page.getByText("Li hem demanat que vingui a la prova")).toHaveCount(0);
  });
});

test.describe("entrada maliciosa", () => {
  test("rebutja IDs, dates i mides no vàlides", async ({ request, baseURL }) => {
    await apiLogin(request, "director", baseURL!);
    const h = { Origin: baseURL! };
    expect((await request.post("/api/favorites", { headers: h, data: { type: "player", id: "../../etc/passwd" } })).status()).toBe(400);
    expect((await request.post("/api/events", { headers: h, data: { kind: "reunio", title: "x".repeat(500), starts_at: "2026-11-01T10:00:00Z" } })).status()).toBe(400);
    expect((await request.post("/api/events", { headers: h, data: { kind: "reunio", title: "Reunió", starts_at: "no-és-una-data" } })).status()).toBe(400);
    expect((await request.post("/api/events", { headers: h, data: { kind: "reunio", title: "A".repeat(100_000), starts_at: "2026-11-01T10:00:00Z" } })).status()).toBe(413);
    expect((await request.post("/api/pipeline", { headers: h, data: { playerId: "p_biel", stage: "hacked" } })).status()).toBe(400);
  });

  test("l'HTML i el JavaScript es mostren com a text (sense XSS emmagatzemat)", async ({ page, request, baseURL }) => {
    await loginAs(page, "director");
    const payload = `<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>`;
    const r = await page.request.post("/api/notes", { data: { playerId: "p_biel", body: payload }, headers: { Origin: baseURL! } });
    expect(r.status()).toBe(200);
    await page.goto("/club/jugadors/p_biel?tab=notes");
    await expect(page.getByText(payload)).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    void request;
  });

  test("la cerca tolera payloads de tipus SQL", async ({ page }) => {
    await loginAs(page, "director");
    const r = await page.goto("/club/cercar?q=%27%20OR%201%3D1--&pos=DC%27%3B%20DROP%20TABLE%20players--");
    expect(r?.status()).toBe(200);
    await page.goto("/club/cercar");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test("capçaleres de seguretat presents", async ({ request }) => {
  const r = await request.get("/entrar");
  const h = r.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-powered-by"]).toBeUndefined();
});
