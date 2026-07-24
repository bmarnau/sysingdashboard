import { test, expect } from "../../fixtures/test-instance";

/**
 * Manipulations-Test: setzt eine gefälschte Sysadmin-Identität in
 * localStorage und prüft, dass:
 *   (a) die App daraus KEINE angemeldete Session ableitet,
 *   (b) geschützte Sysadmin-/Dashboard-Sichten nicht über localStorage
 *       geöffnet werden können.
 *
 * Ziel: Regressionsschutz für SEC-CRIT-002. Autorität ist die Auth-Session
 * plus `public.user_roles`, nicht `northbit-active-user`.
 */
test.describe("Security – UI-Gate Tampering (SEC-CRIT-002)", () => {
  test("localStorage-Rolle vortäuschen öffnet keine Sysadmin-Sichten", async ({ page }) => {
    await page.addInitScript(() => {
      const now = new Date("2026-06-01T00:00:00.000Z").toISOString();
      const fake = {
        id: "attacker-sysadmin",
        firstName: "Attacker",
        lastName: "Sysadmin",
        displayName: "Attacker Sysadmin",
        email: "attacker@e2e.local",
        phone: "",
        role: "systemadministrator",
        status: "active",
        mfaEnabled: false,
        createdAt: now,
        updatedAt: now,
      };
      localStorage.setItem("northbit-users", JSON.stringify([fake]));
      localStorage.setItem("northbit-active-user", fake.id);
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /SysIng Dashboard/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Einstellungen und Services/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Anmelden/i })).toBeVisible();
  });
});
