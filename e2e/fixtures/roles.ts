/**
 * Rollen-Fixture.
 *
 * HISTORIE: Bis v1.59.5 wurden hier LocalStorage-Schlüssel (`northbit-users`,
 * `northbit-active-user`) geseedet. Seit der Umstellung auf Supabase-Auth ist
 * das fachlich überholt — die Rolle stammt ausschließlich aus
 * `public.user_roles` hinter einer gültigen Session. Das Seeding erfolgt jetzt
 * über eine synthetische Session plus Playwright-Netzwerk-Mock
 * (`supabase-e2e.ts`); der produktive Auth-Pfad bleibt unverändert.
 *
 * Rein UI-seitige Rollen-Sichtbarkeit ist weiterhin KEIN Sicherheitsnachweis;
 * serverseitige Verweigerung prüft `specs/rbac/backend-denial.spec.ts`.
 */
export {
  ALL_SEED_ROLES,
  syntheticIdentity,
  installSupabaseMock,
  seedSession,
  E2E_SUPABASE_URL,
  E2E_SUPABASE_PUBLISHABLE_KEY,
  E2E_STORAGE_KEY,
  type SeedRole,
  type SyntheticIdentity,
} from "./supabase-e2e";
