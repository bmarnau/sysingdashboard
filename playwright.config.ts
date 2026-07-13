import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright-Konfiguration für die zentrale Testinstanz.
 *
 * - Läuft gegen den lokalen Dev-Server (Port 8080), nicht gegen die
 *   produktive Preview-URL.
 * - Chromium headless reicht für Smoke/Regression; weitere Browser
 *   werden erst bei nachgewiesener Renderdifferenz aktiviert.
 * - `reuseExistingServer` erlaubt lokale iterative Läufe, ohne den
 *   Dev-Server neu zu starten.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["junit", { outputFile: "test-report/playwright-junit.xml" }],
      ]
    : "list",
  use: {
    baseURL: "http://localhost:8080",
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
