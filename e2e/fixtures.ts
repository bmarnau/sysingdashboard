/**
 * Playwright-Fixtures. Setzt vor jedem Test einen deterministischen
 * localStorage-Zustand mit `test:`-Präfix — damit ist der Testlauf
 * garantiert von produktiven Daten getrennt.
 */
import { test as base, expect } from "@playwright/test";

export const test = base.extend<{ seededPage: void }>({
  seededPage: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        // Beispiel-Bootstrap; App-eigene Storage-Keys nutzen `test:`-Präfix
        // aus VITE_TEST_STORAGE_PREFIX (siehe dashboard-persistence).
        try {
          localStorage.setItem("test:e2e-marker", "1");
        } catch {
          /* ignore */
        }
      });
      await use();
    },
    { auto: true },
  ],
});

export { expect };
