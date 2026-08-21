/**
 * Zentrale Testinstanz-Fixture für Playwright.
 *
 * - `role` (via `test.use({ role: "..." })`) erzeugt eine deterministische
 *   synthetische Supabase-Session und mockt die Supabase-HTTP-Grenze.
 * - Ohne `role` wird die Grenze ebenfalls gemockt, aber OHNE Session —
 *   die App verhält sich dann wie für anonyme Besucher.
 * - `autoResetStorage` löscht nach jedem Test den Browser-Storage.
 */
import { test as base, expect, type Page } from "@playwright/test";
import { installSupabaseMock, seedSession, syntheticIdentity, type SeedRole } from "./supabase-e2e";

type Fixtures = {
  role: SeedRole | null;
  seededPage: void;
};

export const test = base.extend<Fixtures>({
  role: [null, { option: true }],
  seededPage: [
    async (
      { page, role }: { page: Page; role: SeedRole | null },
      use: (v: void) => Promise<void>,
    ) => {
      const identity = role ? syntheticIdentity(role) : null;
      await installSupabaseMock(page, identity);
      if (identity) await seedSession(page, identity);
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
