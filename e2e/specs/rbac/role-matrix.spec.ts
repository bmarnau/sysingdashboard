import { test, expect } from "../../fixtures/test-instance";
import { ALL_SEED_ROLES, type SeedRole } from "../../fixtures/roles";

/**
 * Datengetriebene Rollen-Matrix. Erzeugt pro Rolle einen Test, der die
 * Startseite lädt und prüft, ob rollen-typische Anker sichtbar/ausgeblendet
 * sind. Erwartung stammt aus der Permission-Matrix (`src/lib/rbac/permissions.ts`).
 *
 * Bewusst SICHTBARKEITS-Ebene – die serverseitige Verweigerung deckt
 * `backend-denial.spec.ts` ab (rein UI-Gating ist keine Sicherheitsgrenze).
 */
type RoleExpectation = {
  role: SeedRole;
  expectedPath: "/dashboard" | "/kiosk";
  /** Servicemenü-Button erwartet sichtbar? */
  serviceMenuVisible: boolean;
};

const EXPECTED: RoleExpectation[] = ALL_SEED_ROLES.map((role) => ({
  role,
  expectedPath: role === "kiosk" ? "/kiosk" : "/dashboard",
  // Der technische Kiosk ist absichtlich auf die Kiosk-Oberfläche beschränkt.
  // Alle regulären Rollen behalten den bisherigen Servicemenü-Regressionsanker.
  serviceMenuVisible: role !== "kiosk",
}));

for (const exp of EXPECTED) {
  test.describe(`Rolle: ${exp.role}`, () => {
    test.use({ role: exp.role });

    test("Startseite lädt und erwarteter Pfad ist aktiv", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page.locator("main").first()).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(exp.expectedPath);
    });

    test(`Servicemenü-Button ${exp.serviceMenuVisible ? "sichtbar" : "verborgen"}`, async ({
      page,
    }) => {
      await page.goto("/dashboard");
      expect(new URL(page.url()).pathname).toBe(exp.expectedPath);

      const btn = page.getByRole("button", { name: /Einstellungen und Services/i });
      if (exp.serviceMenuVisible) {
        await expect(btn).toBeVisible();
      } else {
        await expect(btn).toHaveCount(0);
      }
    });
  });
}
