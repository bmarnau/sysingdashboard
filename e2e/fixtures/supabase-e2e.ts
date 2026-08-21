/**
 * Synthetische Supabase-Grenze für Playwright (E2E-Auth-Harness).
 *
 * Ziel: Die App durchläuft im E2E-Test EXAKT denselben produktiven
 * Auth-Pfad (`supabase.auth.getUser()`, `profiles`, `user_roles`,
 * RPC `is_account_active`) — nur die externe HTTP-Grenze ist vollständig
 * synthetisch und wird von Playwright abgefangen.
 *
 * Sicherheitsgrenze:
 * - Es gibt keine echte Supabase-URL, keinen echten Key, kein echtes JWT.
 * - Alle Requests an die synthetische Origin werden von Playwright bedient.
 * - Zusätzlich werden Requests an `*.supabase.co` hart abgebrochen, damit
 *   ein Konfigurationsfehler NIEMALS eine produktive Instanz erreicht.
 * - Produktivcode kennt diese Datei nicht: kein Auth-Bypass, kein
 *   E2E-Sonderfall im Anwendungscode.
 */
import type { Page, Route } from "@playwright/test";

/** Synthetische Test-Origin. Existiert nicht im DNS. */
export const E2E_SUPABASE_URL = "http://e2e.supabase.local";
/** Eindeutig als Testwert erkennbarer, nicht geheimer Publishable-Key. */
export const E2E_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_e2e-synthetic-not-a-real-key";
/** supabase-js leitet den Storage-Key aus dem Hostnamen ab: `sb-<first-label>-auth-token`. */
export const E2E_STORAGE_KEY = "sb-e2e-auth-token";

export type SeedRole =
  | "systemadministrator"
  | "administrator"
  | "teamlead"
  | "projectmanager"
  | "engineer"
  | "customer"
  | "viewer";

export const ALL_SEED_ROLES: SeedRole[] = [
  "systemadministrator",
  "administrator",
  "teamlead",
  "projectmanager",
  "engineer",
  "customer",
  "viewer",
];

/** Deterministische, gültige synthetische UUIDs (v4-Form) je Rolle. */
const ROLE_UUID: Record<SeedRole, string> = {
  systemadministrator: "e2e00001-0000-4000-8000-000000000001",
  administrator: "e2e00002-0000-4000-8000-000000000002",
  teamlead: "e2e00003-0000-4000-8000-000000000003",
  projectmanager: "e2e00004-0000-4000-8000-000000000004",
  engineer: "e2e00005-0000-4000-8000-000000000005",
  customer: "e2e00006-0000-4000-8000-000000000006",
  viewer: "e2e00007-0000-4000-8000-000000000007",
};

export interface SyntheticIdentity {
  id: string;
  email: string;
  role: SeedRole;
  firstName: string;
  lastName: string;
  displayName: string;
}

export function syntheticIdentity(role: SeedRole): SyntheticIdentity {
  const first = "E2E";
  const last = role;
  return {
    id: ROLE_UUID[role],
    email: `${role}@e2e.local`,
    role,
    firstName: first,
    lastName: last,
    displayName: `${first} ${last}`,
  };
}

const FIXED_NOW = "2026-07-13T00:00:00.000Z";
/** Weit in der Zukunft — verhindert einen Token-Refresh im Regelfall. */
const EXPIRES_AT = Math.floor(Date.UTC(2099, 0, 1) / 1000);

function authUser(identity: SyntheticIdentity) {
  return {
    id: identity.id,
    aud: "authenticated",
    role: "authenticated",
    email: identity.email,
    email_confirmed_at: FIXED_NOW,
    phone: "",
    confirmed_at: FIXED_NOW,
    last_sign_in_at: FIXED_NOW,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {
      first_name: identity.firstName,
      last_name: identity.lastName,
      display_name: identity.displayName,
    },
    identities: [],
    created_at: FIXED_NOW,
    updated_at: FIXED_NOW,
    is_anonymous: false,
  };
}

function session(identity: SyntheticIdentity) {
  return {
    access_token: `e2e-synthetic-access-token.${identity.role}`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: EXPIRES_AT,
    refresh_token: `e2e-synthetic-refresh-token.${identity.role}`,
    user: authUser(identity),
  };
}

function profileRow(identity: SyntheticIdentity) {
  return {
    id: identity.id,
    first_name: identity.firstName,
    last_name: identity.lastName,
    display_name: identity.displayName,
    email: identity.email,
    phone: "",
    profile_image: null,
    status: "active",
    mfa_enabled: false,
    created_at: FIXED_NOW,
    updated_at: FIXED_NOW,
  };
}

function wantsSingleObject(route: Route): boolean {
  const accept = route.request().headers()["accept"] ?? "";
  return accept.includes("pgrst.object");
}

async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(body),
  });
}

/**
 * Beantwortet alle Requests an die synthetische Supabase-Origin
 * deterministisch. Unbekannte Tabellen liefern bewusst eine leere Menge —
 * fachlich korrekt für eine frische Testinstanz ohne Daten.
 */
export async function installSupabaseMock(
  page: Page,
  identity: SyntheticIdentity | null,
): Promise<void> {
  // Harte Sperre gegen jede echte Supabase-Instanz.
  await page.route(/https?:\/\/[^/]*supabase\.(co|in)\//, (route) => route.abort());

  await page.route(`${E2E_SUPABASE_URL}/**`, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (method === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
        },
        body: "",
      });
      return;
    }

    // --- Auth ---------------------------------------------------------
    if (path.startsWith("/auth/v1/user")) {
      if (!identity) {
        await json(route, { message: "invalid claim: missing sub claim" }, 401);
        return;
      }
      await json(route, authUser(identity));
      return;
    }
    if (path.startsWith("/auth/v1/token")) {
      // Deckt auch einen versuchten Refresh deterministisch ab.
      if (!identity) {
        await json(route, { error: "invalid_grant", error_description: "no e2e session" }, 400);
        return;
      }
      await json(route, session(identity));
      return;
    }
    if (path.startsWith("/auth/v1/logout")) {
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    if (path.startsWith("/auth/v1/")) {
      await json(route, {});
      return;
    }

    // --- RPC ----------------------------------------------------------
    if (path.startsWith("/rest/v1/rpc/is_account_active")) {
      await json(route, identity !== null);
      return;
    }
    if (path.startsWith("/rest/v1/rpc/")) {
      await json(route, null);
      return;
    }

    // --- Data API -----------------------------------------------------
    if (path.startsWith("/rest/v1/")) {
      const table = path.replace("/rest/v1/", "").split("?")[0];
      if (method !== "GET" && method !== "HEAD") {
        // Schreibzugriffe sind im E2E-Harness bewusst wirkungslos.
        await json(route, wantsSingleObject(route) ? null : []);
        return;
      }
      if (identity && table === "profiles") {
        const row = profileRow(identity);
        await json(route, wantsSingleObject(route) ? row : [row]);
        return;
      }
      if (identity && table === "user_roles") {
        const row = { user_id: identity.id, role: identity.role };
        await json(route, wantsSingleObject(route) ? row : [row]);
        return;
      }
      await json(route, wantsSingleObject(route) ? null : []);
      return;
    }

    await json(route, {});
  });
}

/**
 * Schreibt die synthetische Session in den Browser-Storage, BEVOR die App
 * lädt. Danach folgt die App ihrem normalen produktiven Auth-Pfad.
 */
export async function seedSession(page: Page, identity: SyntheticIdentity): Promise<void> {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* Storage deaktiviert – der jeweilige Test entscheidet. */
      }
    },
    { key: E2E_STORAGE_KEY, value: JSON.stringify(session(identity)) },
  );
}
