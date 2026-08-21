/**
 * Zentrale Testinstanz-Fixture für Playwright.
 *
 * - `role` seedet eine synthetische Supabase-Session.
 * - Sämtliche Requests zur synthetischen Supabase-Origin werden lokal
 *   beantwortet; die E2E-Suite kann keine echte Supabase-Instanz erreichen.
 * - Storage wird nach jedem Test best-effort bereinigt.
 */
import { test as base, expect, type Page } from "@playwright/test";
import { makeSeedUser, seedRole, type SeedRole, type SeedUser } from "./roles";

const E2E_SUPABASE_ORIGIN = "http://e2e.supabase.local";

type Fixtures = {
  role: SeedRole | null;
  seededPage: void;
};

function jsonHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "access-control-allow-origin": "http://localhost:8080",
    "access-control-allow-credentials": "true",
    "content-type": "application/json; charset=utf-8",
    ...extra,
  };
}

async function installSupabaseMock(page: Page, user: SeedUser): Promise<void> {
  await page.route(`${E2E_SUPABASE_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: jsonHeaders() });
      return;
    }

    if (path === "/auth/v1/user") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({
          id: user.id,
          aud: "authenticated",
          role: "authenticated",
          email: user.email,
          email_confirmed_at: "2026-01-01T00:00:00.000Z",
          phone: "",
          confirmed_at: "2026-01-01T00:00:00.000Z",
          last_sign_in_at: "2026-08-21T00:00:00.000Z",
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: {
            first_name: user.firstName,
            last_name: user.lastName,
            display_name: user.displayName,
          },
          identities: [],
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-08-21T00:00:00.000Z",
          is_anonymous: false,
        }),
      });
      return;
    }

    if (path === "/rest/v1/profiles") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders({ "content-range": "0-0/1" }),
        body: JSON.stringify([
          {
            id: user.id,
            first_name: user.firstName,
            last_name: user.lastName,
            display_name: user.displayName,
            email: user.email,
            phone: "",
            status: "active",
            mfa_enabled: false,
            profile_image: null,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-08-21T00:00:00.000Z",
          },
        ]),
      });
      return;
    }

    if (path === "/rest/v1/user_roles") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders({ "content-range": "0-0/1" }),
        body: JSON.stringify([{ role: user.role }]),
      });
      return;
    }

    if (path === "/rest/v1/rpc/is_account_active") {
      await route.fulfill({ status: 200, headers: jsonHeaders(), body: "true" });
      return;
    }

    // Alle übrigen Supabase-Reads der Dashboard-Initialisierung bleiben
    // deterministisch leer. Mutationen werden nicht stillschweigend als
    // produktiv erfolgreich simuliert, sondern nur mit leerem JSON quittiert.
    await route.fulfill({
      status: 200,
      headers: jsonHeaders({ "content-range": "*/0" }),
      body: request.method() === "HEAD" ? "" : "[]",
    });
  });
}

export const test = base.extend<Fixtures>({
  role: [null, { option: true }],
  seededPage: [
    async (
      { page, role }: { page: Page; role: SeedRole | null },
      use: (v: void) => Promise<void>,
    ) => {
      if (role) {
        const user = makeSeedUser(role);
        await installSupabaseMock(page, user);
        await seedRole(page, role);
      }

      await page.addInitScript(() => {
        try {
          localStorage.setItem("test:e2e-marker", "1");
        } catch {
          /* ignore */
        }
      });

      await use();

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
