/**
 * Zentrale Testinstanz-Fixture für Playwright (ergänzt Vitest-Seite aus v1.28.0).
 *
 * - `seededPage` setzt einen deterministischen `test:`-Marker in localStorage.
 * - `autoResetStorage` löscht nach jedem Test die App-Storage-Keys, damit
 *   Tests nicht über localStorage kommunizieren.
 * - `role`-Parameter (via `test.use({ role: "..." })`) seedet einen Benutzer.
 */
import { test as base, expect, type Page } from "@playwright/test";
import { seedRole, type SeedRole } from "./roles";

type Fixtures = {
  role: SeedRole | null;
  seededPage: void;
};

export const test = base.extend<Fixtures>({
  role: [null, { option: true }],
  seededPage: [
    async ({ page, role }: { page: Page; role: SeedRole | null }, use: (v: void) => Promise<void>) => {
      if (role) await seedRole(page, role);
      await page.addInitScript(() => {
        try {
          localStorage.setItem("test:e2e-marker", "1");
        } catch {
          /* ignore */
        }
      });
      await use();
      // Best-effort Cleanup – Storage-State pro Test isolieren.
      try {
        await page.evaluate(() => {
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch {
            /* ignore */
          }
        });
      } catch {
        /* Seite ggf. schon geschlossen */
      }
    },
    { auto: true },
  ],
});

export { expect };
