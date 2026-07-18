
## Ziel

1. UserManagementDialog liest/schreibt Profile und Rollen wieder aus `public.profiles` / `public.user_roles` — nicht mehr aus dem localStorage-Store. Admins können damit Rollen aus der UI vergeben.
2. Kurzes Handbuch-Kapitel erklärt, wie und wann `accepted:true` in `scripts/security/static-findings.json` gesetzt wird, mit Beispiel-Begründung und Ticket-Format.

Kein Umbau der Auth-, Routing- oder Backend-Layer. Legacy-`UserManagementService` (localStorage) wird für diesen Dialog nicht mehr aufgerufen; der Service bleibt im Repo, weil weitere Verbraucher (Actor-IDs, Storage-Scoping) noch daran hängen — Cleanup ist eigener Folge-Schritt.

## Änderungen im Frontend

### Neuer Datenzugriffs-Layer
- Neue Datei `src/lib/users-supabase-service.ts` mit reinen Funktionen, die gegen den Browser-Client arbeiten und die RLS-Grenzen respektieren:
  - `listUsers()` — `profiles` + `user_roles` in zwei parallelen Queries, mapped auf `UserProfile`. Rolle-Fallback `viewer`.
  - `updateOwnProfile(id, patch)` — `profiles.update`, gescoped über `auth.uid()` (durch RLS-Policy `profiles_self_update`).
  - `updateUserProfile(id, patch)` — `profiles.update` als Admin (`profiles_admins_update_all`).
  - `setUserRole(userId, role)` — löscht alle bestehenden Rollen des Users und legt eine neue Zeile in `user_roles` an (SysAdmin-only via RLS). Enthält Client-seitigen Lockout-Guard: verweigert Wechsel weg von der letzten aktiven Sysadmin-Rolle.
  - `setUserStatus(userId, status)` — `profiles.update({status})`.
  - Kein `createUser`/`deleteUser` — Neuanlage passiert ausschließlich über Registrierung, Löschen wäre Auth-Admin (Service-Role) und ist bewusst nicht Teil dieses Schritts. Dialog zeigt stattdessen Status „archived" als Soft-Delete.
- `useUsers()` in `src/hooks/useCurrentUser.ts` neu implementieren: React-Query-frei, mit lokalem `useEffect`-Fetch + Refresh-Trigger (Callback aus dem Dialog nach Mutation). Ergänzt Realtime nicht — bewusst simpel gehalten.

### UserManagementDialog Refactor (`src/components/UserManagementDialog.tsx`)
- Tab „Profil wechseln" entfernen (mit echter Auth entfällt der Use-Case; Wechsel = Abmelden + neu anmelden).
- Tabs verbleiben: „Mein Profil" und „Benutzerverwaltung" (letzterer nur bei `users.manage`).
- „Mein Profil":
  - Speichert über `updateOwnProfile`. Feld `email` wird read-only (Änderung nur über Supabase Auth).
- „Benutzerverwaltung":
  - Zeigt Liste aus `listUsers()`. Neuanlage-Formular entfernen und durch Hinweis ersetzen: „Neue Benutzer registrieren sich über die Anmeldeseite. Rolle und Status hier zuweisen."
  - Rolle ändern: Dropdown → `setUserRole`, nur sichtbar wenn `roles.manage` (SysAdmin).
  - Status: Toggle Aktiv/Archiviert → `setUserStatus`.
  - Löschen-Button entfällt (Hinweis auf Archivierung).
  - Nach jeder Mutation: Refresh-Callback → `useUsers` lädt neu; Toast-artige Inline-Meldung bei RLS-Fehlern (`error.message`).
- Alle `UserManagementService.*`-Aufrufe im Dialog entfernen; ActorContext bleibt, weil der Legacy-Logger sie später konsumiert.

### Tests
- `src/__tests__/lib/user-management.test.ts` weiter grün halten (Legacy-Service unverändert).
- Neue leichte Vitest-Suite `src/__tests__/lib/users-supabase-service.test.ts`: mockt den Supabase-Client und prüft Lockout-Guard (letzter SysAdmin) sowie Query-Shape von `listUsers`.

## Handbuch-Ergänzung

`src/lib/help-documentation.ts`:
- Neues HelpTopic `security-findings-acceptance` (Kategorie „Sicherheit"), verlinkt aus dem bestehenden Kapitel „Sicherheits- und RBAC-Tests":
  - Was `accepted:true` bedeutet (kein Verstecken; Blocker-Ausnahme mit Nachweis).
  - Wann erlaubt: kompensierender Guard vorhanden, Dokumentation aktualisiert, Verantwortlicher benannt.
  - Wann NICHT erlaubt: offene Root Cause, unbekanntes Risiko, fehlender Guard-Test.
  - Prozedur: Finding-Eintrag um `accepted`, `acceptanceReason` (inkl. Ticket-Referenz und Guard-Test-Pfad) ergänzen; PR-Beschreibung verlinkt Ticket und Test.
  - **Beispiel-Text für `acceptanceReason`** (aus dem Kapitel kopierbar):
    `"v1.39.0 (TICKET-1234): Kompensiert durch e2e/specs/security/api-direct-call.spec.ts und src/__tests__/security/rbac-endpoints.test.ts. Reevaluation vor Azure-Produktivierung. Owner: @sec-team."`
  - **Ticket-Format**: `SEC-<AREA>-<NNNN>` (z. B. `SEC-AUTH-0007`), Titel = Finding-ID + Kurzbeschreibung, Labels `security`, `accepted-finding`, Due-Date für Reevaluation Pflicht.
- `lastUpdated` des neuen Topics setzen.

`CHANGELOG.md`:
- Neuer Eintrag `## 1.40.0 - 2026-07-18` mit den beiden Bullets (Dialog-Refactor, Handbuch-Kapitel). `DASHBOARD_VERSION` wird durch das CHANGELOG-Skript automatisch nachgezogen.

## Bewusst nicht Teil dieses Schritts (kritisches Feedback)

- **Benutzer löschen** via Auth Admin API würde einen serverseitigen `createServerFn`-Endpoint mit `supabaseAdmin` und Rollencheck brauchen. Sinnvoll, aber eigener Prompt — sonst zieht dieser Schritt Server-Auth-Design mit rein.
- **Realtime-Updates** der Benutzerliste (postgres_changes) verschieben — Refresh-Callback reicht für Admin-UI mit niedriger Änderungsfrequenz.
- **Lockout-Enforcement in der DB** (Trigger, der letzten aktiven SysAdmin schützt) wäre die eigentlich harte Absicherung. Client-Guard schließt die UI-Lücke, ersetzt aber keinen DB-Constraint — als HIGH-Finding-Kandidat für den nächsten Sicherheits-Review vormerken.
- **Legacy-`UserManagementService`** aufräumen: erst nachdem alle Verbraucher (Actor-IDs im Logger, Storage-Scoping) migriert sind; getrennter Refactor-Prompt.
