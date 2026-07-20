
## Ist-Zustand (verifiziert)

- Supabase-Projekt verbunden, Trigger `on_auth_user_created` existiert, Enum + Funktionen (`handle_new_user`, `has_role`, `has_any_role`, `has_permission`) sind da, RLS-Policies auf `profiles`/`user_roles`/`audit_log` aktiv.
- Datenbank ist **leer**: `auth.users = 0`, `profiles = 0`, `user_roles = 0`, `sysadmins = 0` → Fall A (noch kein Auth-Benutzer). Keine Reparaturmigration nötig.
- Auth-Provider-Einstellungen (Email/Password an, Confirm-Email, Redirect-URLs, HIBP) sind über die Cloud-Tools nicht direkt abfragbar → müssen explizit gesetzt werden.
- Bekannte Lücken: `handle_new_user()` prüft `NOT EXISTS (SELECT 1 FROM user_roles)` ohne Lock (Race Condition), es gibt keinen DB-Schutz gegen Herabstufung/Archivierung des letzten Sysadmins, `profiles.status` wird beim Login nicht durchgesetzt, Signup-Feedback in `/auth` ist minimal.

## Ziel

Ein realer Erstbenutzer registriert sich selbst, wird atomar `systemadministrator`, kann sich anmelden, Rolle wird serverseitig verifiziert, Status-/Lockout-Regeln greifen auch bei direktem API-Zugriff. Keine Test-/Standardpasswörter, keine PII im Report.

---

## Änderungen

### 1. DB-Migration `20260720_auth_hardening.sql`

**a) Race-safe Bootstrap** — `handle_new_user()` neu:
- Vor der Rollenzuweisung `PERFORM pg_advisory_xact_lock(hashtext('sysadmin_bootstrap'))`.
- Danach `SELECT NOT EXISTS ... FOR UPDATE`-Äquivalent per Lock erzwungen; parallele Signups sehen konsistent, ob bereits ein Sysadmin existiert → genau einer wird `systemadministrator`, alle weiteren `viewer`.
- Verhalten sonst unverändert, `ON CONFLICT DO NOTHING` bleibt.

**b) Sysadmin-Lockout-Trigger** auf `user_roles` (BEFORE UPDATE/DELETE) und `profiles` (BEFORE UPDATE):
- Blockiert Löschen/Herabstufen der letzten `systemadministrator`-Rolle mit `status='active'`-Profil.
- Blockiert Status-Wechsel auf `inactive|locked|archived` für den letzten aktiven Sysadmin.
- `RAISE EXCEPTION 'last_sysadmin_locked'` → auch bei direktem SQL/API wirksam.

**c) Statusprüfung** — neue SECURITY DEFINER Funktion `public.is_account_active(_user_id uuid) returns boolean` (liest `profiles.status='active'`), authenticated GRANT.

**d) Audit-Log-Trigger** auf `user_roles` für INSERT/UPDATE/DELETE (Actor = `auth.uid()`, keine E-Mail/PII, nur IDs + Aktion), damit Bootstrap und Rollenänderungen dokumentiert sind.

### 2. Server-seitige Enforcement in TanStack

- Neues Middleware-Add-on `requireActiveAccount` (baut auf `requireSupabaseAuth` auf): ruft `is_account_active(userId)` → wirft 403 bei nicht-`active`. Wird in bestehende geschützte `createServerFn`-Aufrufe eingehängt (sync, user-management, azure).
- `_authenticated/route.tsx`: nach `getUser()` zusätzlich `is_account_active` per RPC prüfen; bei false → `signOut()` + Redirect `/auth?reason=account_inactive`.

### 3. UI-Feedback in `/auth`

- Signup-Ergebnis unterscheidet: `identities.length === 0` (Konto existiert bereits), `session != null` (direkt eingeloggt), sonst „E-Mail bestätigen".
- `search.reason` (`account_inactive|account_locked|account_archived|unavailable`) auf `/auth` als sichtbarer Alert.
- Profilbereich (bestehender Dialog) zeigt Anzeigename, E-Mail, Rolle, Status — keine UUIDs.

### 4. Auth-Konfiguration (Tool-Aufruf)

- `supabase--configure_auth` mit `disable_signup=false`, `external_anonymous_users_enabled=false`, `auto_confirm_email=false` (Confirm-Email an), `password_hibp_enabled=true`.
- Hinweis an Nutzer: Redirect-URLs (`preview`, `sysingdashboard.lovable.app`) müssen in Cloud→Users→URL-Konfiguration ergänzt werden — kein Tool-API dafür.

### 5. Tests

- `src/__tests__/auth/bootstrap.test.ts`: erster User → sysadmin, zweiter → viewer, parallele Signups (Promise.all) → genau ein sysadmin.
- `src/__tests__/auth/lockout.test.ts`: Herabstufen des letzten Sysadmins wirft `last_sysadmin_locked`; mit zweitem Sysadmin erlaubt.
- `src/__tests__/auth/status-enforcement.test.ts`: `inactive`-User bekommt 403 auf geschützten serverFn.
- Playwright `e2e/specs/auth/full-flow.spec.ts`: Signup → (Confirm optional übersprungen wenn autoconfirm=off in Test-Instanz) → Login → `/dashboard` → Logout → geschützte Route → Redirect → Reset-Flow (bis `resetPasswordForEmail`).

### 6. Dokumentation & Bericht

- CHANGELOG `1.41.0` — Bootstrap-Härtung, Lockout-Trigger, Status-Enforcement, UX.
- `help-documentation.ts`: Kapitel „Erst-Inbetriebnahme & Bootstrap", „Kontostatus & Sperren".
- `docs/DEPLOYMENT.md`: Redirect-URL-Konfiguration, Confirm-Email, HIBP.
- Neuer Bericht `test-report/auth-commissioning-report.md` mit den 14 Punkten aus Abschnitt 13 (nur anonymisierte Zahlen).
- SystemStatus-Dialog: Sektion „Auth" (Confirm-Email, Provider-Count, Sysadmin-Count via RPC-Zähler ohne PII).

---

## Technische Details

- Trigger-Sprache: `plpgsql`, `SECURITY DEFINER`, `SET search_path = public` — konsistent zu Bestand.
- Advisory-Lock-Key deterministisch (`hashtext('sysadmin_bootstrap')`), Scope `xact` → wird beim Commit freigegeben.
- `is_account_active` läuft als SECURITY DEFINER, GRANT nur für `authenticated`.
- Lockout-Trigger prüft `count(*) FILTER (WHERE role='systemadministrator' AND profile.status='active') > 1` **nach** der geplanten Änderung (per NEW/OLD).
- Reparaturpfade (Fall B–E) sind aktuell **nicht** nötig (leere DB) → wir liefern sie als dokumentierte SQL-Snippets im Deployment-Handbuch statt als ausgeführte Migration.

---

## Manueller Schritt für den Nutzer (nach Deploy)

1. Redirect-URLs in Cloud→Users→URL-Konfiguration ergänzen: `https://sysingdashboard.lovable.app/**`, aktuelle Preview-URL, `/reset-password`.
2. Auf `/auth` erstes Konto registrieren — wird automatisch Sysadmin.
3. Bericht `test-report/auth-commissioning-report.md` prüfen.

Kein Passwort, keine E-Mail wird von uns gesetzt oder committed.
