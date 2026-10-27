import { defineConfig } from "@playwright/test";

// API y web propias en otros puertos y con su propia base: no tocan las de desarrollo.
const API_PORT = 3100;
const WEB_PORT = 5190;
// E2E_BASE_URL: probar una instancia ya levantada (p. ej. la pila de producción con Caddy) en vez de levantar una.
const EXTERNAL = process.env.E2E_BASE_URL;
const ORIGIN = EXTERNAL ?? `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: ORIGIN,
    locale: "es-ES",
    // En local, el Edge instalado (sin descargar navegadores); en CI, el Chromium de Playwright.
    channel: process.env.CI ? undefined : "msedge",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: EXTERNAL ? undefined : [
    {
      command: "node e2e/reset-db.mjs && npm run start -w @dndonline/server",
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgres://dndonline:dndonline-dev@127.0.0.1:54329/dndonline_e2e",
        PORT: String(API_PORT),
        PUBLIC_ORIGIN: ORIGIN,
      },
    },
    {
      command: `npm run dev -w @dndonline/web -- --port ${WEB_PORT}`,
      url: ORIGIN,
      reuseExistingServer: false,
      env: { API_PORT: String(API_PORT) },
    },
  ],
});
