import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    // la base de dades SQLite és un singleton per procés: cada fitxer en el seu propi procés
    pool: "forks",
    fileParallelism: false,
    testTimeout: 20000,
  },
});
