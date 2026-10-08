import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3200);
const DB = "data/e2e.db";

/**
 * E2E contra la versió de producció (next build + next start) amb una base de dades pròpia,
 * creada de zero a cada execució. Requereix haver executat `npm run build` abans.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } } : {}),
  },
  projects: [
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `rm -f ${DB} ${DB}-wal ${DB}-shm && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/demo`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { SCOUTUP_DB: DB, SCOUTUP_INSECURE_COOKIES: "1", SCOUTUP_LOG: "silent" },
  },
});
