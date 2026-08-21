/**
 * Rollen-Fixture für Playwright.
 *
 * Die Produktanwendung bezieht Benutzer und Rolle seit der Supabase-
 * Authentifizierung nicht mehr aus den historischen `northbit-*`-
 * localStorage-Keys. Diese Fixture seedet deshalb eine synthetische
 * Supabase-Session. Netzwerkantworten werden in `test-instance.ts`
 * vollständig lokal abgefangen.
 */
import type { Page } from "@playwright/test";

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

export interface SeedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: SeedRole;
}

export function makeSeedUser(role: SeedRole): SeedUser {
  return {
    id: `00000000-0000-4000-8000-${role.padEnd(12, "0").slice(0, 12)}`,
    email: `${role}@e2e.local`,
    firstName: "E2E",
    lastName: role,
    displayName: `E2E ${role}`,
    role,
  };
}

/**
 * Supabase-js leitet den Default-Storage-Key aus dem ersten Host-Segment ab.
 * Für `http://e2e.supabase.local` ist dies deterministisch `sb-e2e-auth-token`.
 */
const E2E_AUTH_STORAGE_KEY = "sb-e2e-auth-token";

function encodeJwtSegment(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function makeUnsignedTestJwt(user: SeedUser): string {
  const header = encodeJwtSegment({ alg: "none", typ: "JWT" });
  const payload = encodeJwtSegment({
    aud: "authenticated",
    exp: 4_102_444_800,
    iat: 1_788_000_000,
    sub: user.id,
    email: user.email,
    role: "authenticated",
  });
  return `${header}.${payload}.e2e`;
}

/** Muss vor `page.goto` aufgerufen werden. */
export async function seedRole(page: Page, role: SeedRole): Promise<SeedUser> {
  const user = makeSeedUser(role);
  const accessToken = makeUnsignedTestJwt(user);
  const session = {
    access_token: accessToken,
    refresh_token: "e2e-refresh-token",
    expires_in: 2_147_483_647,
    expires_at: 4_102_444_800,
    token_type: "bearer",
    user: {
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
    },
  };

  await page.addInitScript(
    ({ storageKey, session, role }: { storageKey: string; session: unknown; role: SeedRole }) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(session));
        window.localStorage.setItem("test:e2e-role", role);
      } catch {
        /* Storage disabled – der jeweilige Test schlägt dann sichtbar fehl. */
      }
    },
    { storageKey: E2E_AUTH_STORAGE_KEY, session, role },
  );

  return user;
}
