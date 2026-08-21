import { defineConfig, devices } from "@playwright/test";
import { E2E_SUPABASE_URL, E2E_SUPABASE_PUBLISHABLE_KEY } from "./e2e/fixtures/supabase-e2e";

/** Eigener Port, damit ein lokal laufender Dev-Server nicht mit produktiver
 *  Supabase-Konfiguration wiederverwendet wird. */
const E2E_PORT = Number(process.env.E2E_PORT ?? 8181);
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

/**
 * Playwright-Konfiguration für die zentrale Testinstanz (v1.31.0).
 *
 * Struktur:
 * - UI-/Funktions-Specs: `e2e/specs/`
 * - Reine API-Round-Trips: `e2e/api-smoke.spec.ts` (Wurzel)
 *
 * Trade-offs siehe ADR-0012:
 * - Läuft gegen den Vite-Dev-Server (Port 8080), nicht gegen einen Worker-Preview.
 * - Chromium-only in CI.
 * - Traces/Screenshots/Videos nur bei Fehlern (CI-Kosten).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  // Der Vite-Dev-Server kompiliert Route-Chunks beim ersten Zugriff on demand;
  // der erste Test einer Datei lief deshalb regelmäßig in das 5-s-Default.
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["json", { outputFile: "playwright-report/results.json" }],
        ["junit", { outputFile: "test-report/playwright-junit.xml" }],
      ]
    : [
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["json", { outputFile: "playwright-report/results.json" }],
      ],
  use: {
    baseURL: E2E_BASE_URL,
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Optionaler lokaler Override (z. B. Sandbox ohne mitgelieferte
        // Playwright-Browser). In CI leer → Playwright-Standardbrowser.
        ...(process.env.E2E_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.E2E_CHROMIUM_PATH } }
          : {}),
      },
    },
    ...(process.env.RUN_FIREFOX
      ? [{ name: "firefox", use: { ...devices["Desktop Firefox"] } }]
      : []),
    ...(process.env.RUN_WEBKIT ? [{ name: "webkit", use: { ...devices["Desktop Safari"] } }] : []),
    ...(process.env.RUN_MOBILE ? [{ name: "mobile-chrome", use: { ...devices["Pixel 7"] } }] : []),
  ],
  webServer: {
    command: `bun run dev --port ${E2E_PORT} --strictPort`,
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Ausschließlich synthetische, nicht geheime Testwerte. Keine reale
    // Supabase-URL, kein echter Key, kein Service-Role-Key. Alle Requests an
    // diese Origin fängt Playwright ab (siehe e2e/fixtures/supabase-e2e.ts).
    env: {
      VITE_SUPABASE_URL: E2E_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: E2E_SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_URL: E2E_SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY: E2E_SUPABASE_PUBLISHABLE_KEY,
    },
  },
});
