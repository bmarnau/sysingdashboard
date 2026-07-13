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
  /** Servicemenü-Button erwartet sichtbar? */
  serviceMenuVisible: boolean;
};

const EXPECTED: RoleExpectation[] = ALL_SEED_ROLES.map((role) => ({
  role,
  // Aktuelle App zeigt das Servicemenü allen angemeldeten Rollen; einzelne
  // Einträge sind über PermissionGate ausgeblendet. Sichtbarer Öffner-Button
  // ist bewusst rollen-agnostisch – Regressions-Anker.
  serviceMenuVisible: true,
}));

for (const exp of EXPECTED) {
  test.describe(`Rolle: ${exp.role}`, () => {
    test.use({ role: exp.role });
    test(`Startseite lädt und Main ist sichtbar`, async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("main").first()).toBeVisible();
    });
    test(`Servicemenü-Button ${exp.serviceMenuVisible ? "sichtbar" : "verborgen"}`, async ({ page }) => {
      await page.goto("/");
      const btn = page.getByRole("button", { name: /Einstellungen und Services/i });
      if (exp.serviceMenuVisible) {
        await expect(btn).toBeVisible();
      } else {
        await expect(btn).toHaveCount(0);
      }
    });
  });
}
