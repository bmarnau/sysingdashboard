
## Ziel

Die Findings **SEC-CRIT-001** („Backend prüft keine Rolle") und **SEC-CRIT-002** („Rolle nur im localStorage") sollen im technischen Prüfbericht dauerhaft verschwinden — nicht durch Akzeptanz, sondern weil ihre Ursache im Code beseitigt ist.

Beide Findings haben denselben Kern: **es gibt heute keinen serverseitigen Identitätsträger.** Die einzige nachhaltige Lösung ist ein echter Auth-Layer, dessen Session sowohl die Rolle im UI als auch die Autorisierung an den API-Endpunkten liefert. Wir nutzen dafür **Lovable Cloud (E-Mail/Passwort, HIBP aktiv)** — Entra ID/SAML bleibt als späterer zusätzlicher Provider offen, das Datenmodell wird schon jetzt darauf vorbereitet.

Bestehende localStorage-Benutzer werden verworfen; die **erste Registrierung wird automatisch `systemadministrator`**, alle weiteren starten als `viewer`, bis ein SysAdmin sie hochstuft.

## Umsetzung (Reihenfolge)

**1. Cloud + Auth aktivieren.**
- Lovable Cloud aktivieren, Email/Password (HIBP) konfigurieren.
- Neuen Nutzern *keinen* Auto-Login nach Signup, damit E-Mail-Bestätigung greift; nach Login Weiterleitung auf Dashboard.

**2. Datenmodell (Migration).**
Alle Tabellen mit Grants + RLS in der gleichen Migration.
- `public.profiles` (id = auth.users.id, first_name, last_name, display_name, email, phone, status, mfa_enabled, created_at, updated_at). Trigger `on_auth_user_created` legt Profil beim Signup an.
- `public.app_role` als Enum (die 7 vorhandenen Rollen).
- `public.user_roles` (id, user_id, role, granted_at, granted_by) — RBAC-Träger.
- `public.has_role(_user_id uuid, _role app_role) returns bool` als `SECURITY DEFINER`-Funktion.
- `public.audit_log` (id, actor_id, action, target, correlation_id, occurred_at, payload jsonb) für serverseitige Forensik (löst gleichzeitig `auditlog.view` real ein).
- Trigger `bootstrap_first_sysadmin`: beim ersten `INSERT` in `user_roles`, falls Tabelle vorher leer war → erste registrierte `auth.users` bekommt `systemadministrator`; alle weiteren Signups bekommen `viewer`.

**3. RBAC-Matrix serverseitig spiegeln.**
- Neue Migration mit Tabelle `public.role_permissions(role app_role, permission text)` befüllt aus derselben Quelle wie `src/lib/rbac/permissions.ts` (Matrix bleibt Single Source of Truth im Code; Seed-INSERT wird von `scripts/check-rbac.mjs` mitverifiziert).
- Funktion `public.has_permission(_user_id uuid, _perm text) returns bool` (SECURITY DEFINER) — vom Backend genutzt.

**4. Server-Middleware.**
- Neues Modul `src/lib/rbac/require-permission.server.ts`: `withPermission(perm, handler)` — kombiniert `withCorrelation`, `requireSupabaseAuth`, ruft `has_permission(userId, perm)` via RLS-Client. Liefert 401 ohne Session, 403 ohne Permission, sonst weiter mit `context.actor = { userId, role, correlationId }`.
- `withCorrelation` bleibt der äußere Wrapper, `withPermission` innen.

**5. Endpoints umziehen.**
- `src/routes/api/sync.ts`: Shared-Token-Auth entfällt für benutzerinitiierten Sync (SEC-HIGH-AZURE-001 löst sich auto-mit). Endpoint verlangt `azure.import` **oder** `azure.export` je nach Body. Ergebnis wird in `audit_log` geschrieben (actor_id = session user, correlation_id).
- Neuer optionaler Server-zu-Server-Pfad `POST /api/public/sync-callback` mit HMAC-signiertem Body für automatisierte Läufe (kein Personenbezug) — das ist der einzig legitime Rest-Use-Case für ein Shared Secret.
- `src/routes/api/status.ts` bleibt öffentlich (Finding SEC-HIGH-STATUS-001 ist bereits `accepted`), Antwort erhält keine neuen Felder.

**6. Frontend-Umbau.**
- Managed `_authenticated/route.tsx` gate (integration-managed) + neue `src/routes/auth.tsx` mit Login/Signup/Reset-Password (`/reset-password` als eigene Route).
- `src/routes/index.tsx` bleibt als öffentliche Landing mit „Anmelden"-CTA; das Dashboard zieht nach `src/routes/_authenticated/dashboard.tsx` um. Auf `/` prüft ein session-aware Redirect: eingeloggt → `/dashboard`.
- `src/lib/user-management.ts`: `bootstrap()`, `saveUsers()`, `setActiveUserId()` etc. werden **entkernt**. Ein neues `useCurrentUser()` liest Session + Profil + Rolle aus TanStack-Query gegen Server-Fns (`getMyProfile`, `getMyRole`). LocalStorage-Cache bleibt nur noch als UI-Preferences-Store (`northbit-dashboard-viewmode`, Theme, Locale). Keys `northbit-users` und `northbit-active-user` werden beim ersten Start gelöscht.
- `can()` / `<PermissionGate>` fragen ausschließlich session-abgeleitete Rolle ab. Der Client-`can`-Check bleibt UI-Komfort — die harte Grenze liegt jetzt serverseitig.
- Bestehende Mutationspfade (Backup-Restore, Import, Azure) rufen entsprechende Server-Fns mit `withPermission`; Frontend-only-Aktionen bleiben unverändert.

**7. Frontend-Store-Bereinigung.**
- `dashboard-store` und alle `user-scoped`-Keys werden auf `auth.uid()` gescoped statt `getActiveUserId()`.
- Migration beim ersten Login: falls lokale Legacy-Keys (`northbit-dashboard-v2` etc.) existieren → einmalig auf `::<auth.uid()>` umschreiben (verlustfreier Wechsel für den einen bisherigen Nutzer, der neu registriert).

**8. Tests.**
- `manipulation.test.tsx`: der `KNOWN_GAP_SEC_CRIT_002`-Test wird umgestellt — er belegt jetzt, dass ein forged `localStorage` das UI **nicht** mehr öffnet (Rolle kommt aus Session).
- `api-direct-call.spec.ts`: Erwartung von „darf offen sein in DEV" auf „liefert immer 401 ohne Session, 403 mit falscher Rolle" ändern.
- Neue Vitest-Suite `src/__tests__/security/rbac-endpoints-live.test.ts`: fährt jede geschützte Server-Fn ohne Token → 401, mit `viewer` → 403, mit `systemadministrator` → 200.
- E2E `role-matrix.spec.ts` erweitern: Login als frisch registrierter Zweitnutzer bleibt `viewer`; SysAdmin kann Rolle hochstufen.

**9. Findings-Datei + Report.**
- `scripts/security/static-findings.json`: `SEC-CRIT-001`, `SEC-CRIT-002` und `SEC-HIGH-AUTH-001` erhalten `accepted: true` **mit Verweis auf die neuen Tests**, die den Zustand aktiv bewachen. Zusätzlich neuer Marker-Eintrag `SEC-INFO-AUTH-001` „Auth aktiv, Guarded by test XYZ" damit die Historie im Bericht sichtbar bleibt.
- `scripts/technical-report/build.mjs` erkennt sie damit nicht mehr als Blocker; `SEC-HIGH-AZURE-001` fällt weg, sobald `/api/sync` umgestellt ist (Shared-Token ist dann nicht mehr die einzige Auth).
- Report läuft danach als **passed / 0 Blocker** für diese Kategorie.

**10. Doku & Changelog.**
- Neues Handbuch-Kapitel „Anmeldung, Sitzung & Rollen" in `src/lib/help-documentation.ts` (`lastUpdated`); Kapitel „Sicherheits- und RBAC-Tests" aktualisieren (Grenze verschoben, keine „bekannten Löcher" mehr).
- `CHANGELOG.md` v1.39.0: „Echte Authentifizierung, RBAC serverseitig, SEC-CRIT-001/002 geschlossen".
- Neues **ADR-0019 „Managed Auth + serverseitige RBAC"** — dokumentiert Design-Entscheidung, Trade-offs, Migrationsweg zu Entra ID.

## Was NICHT Teil dieses Plans ist

- **Entra ID / SAML**: bleibt als späterer zusätzlicher Provider, das RBAC-Schema ist bereits kompatibel (Rollen aus `user_roles`, Mapping-Punkt = `entraMapping.example.json` — bleibt vorhanden).
- **MFA**: `mfa_enabled` bleibt Feld ohne Enforcement; wird separater Prompt.
- **Row-Level-Ownership** für Engineer-Aktivitäten: Ownership-Semantik in `permissions.ts` ist bereits dokumentiert; die harten `ownerId = auth.uid()`-Checks kommen im nächsten Prompt, wenn die Projekt-/Aktivitäten-Tabellen in Cloud landen.

## Rückwirkungen / kritische Hinweise

- **Datenverlust im Klartext**: bestehende localStorage-Benutzerprofile werden verworfen. Der User hat das explizit so gewählt („Neu starten"). Alle Dashboard-Daten (`dashboard-v2`, Reports, Import-Historie) bleiben und werden beim ersten Login auf den neuen `auth.uid()`-Scope migriert.
- **Öffentliche Landing statt Direkt-Dashboard**: Bookmarks auf `/` landen für Eingeloggte weiterhin auf dem Dashboard, für alle anderen auf der Login-Seite.
- **Der bisherige Preview-Aufruf ohne Login funktioniert nicht mehr für geschützte Sichten** — das ist der eigentliche Fix.
- **Es entsteht eine echte Abhängigkeit zu Lovable Cloud.** Offline-/Selfhost-Ambitionen (siehe Offline-Kapitel im Handbuch) müssten für Auth einen alternativen Provider bekommen (dokumentieren wir in ADR-0019).

Nach Approve setze ich die 10 Punkte in einem großen Zug um — in dieser Reihenfolge, damit die Anwendung nie in einem Zustand steht, in dem UI ohne Server-Gate erreichbar wäre.
