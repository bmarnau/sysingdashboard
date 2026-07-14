import { defineConfig, devices } from "@playwright/test";

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
  timeout: 30_000,
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
    baseURL: "http://localhost:8080",
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ...(process.env.RUN_FIREFOX ? [{ name: "firefox", use: { ...devices["Desktop Firefox"] } }] : []),
    ...(process.env.RUN_WEBKIT ? [{ name: "webkit", use: { ...devices["Desktop Safari"] } }] : []),
    ...(process.env.RUN_MOBILE ? [{ name: "mobile-chrome", use: { ...devices["Pixel 7"] } }] : []),
  ],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
