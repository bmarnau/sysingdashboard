## Analyse des Ist-Zustands (verifiziert)

- **Kein zentraler Logout vorhanden.** `supabase.auth.signOut()` wird heute nur an zwei Stellen aufgerufen: `src/routes/reset-password.tsx:36` und im Auth-Gate `src/routes/_authenticated/route.tsx:91` (Konto inaktiv). Im Dashboard gibt es **keine** manuelle Abmelde-Schaltfläche.
- **Auth-Gate**: `src/routes/_authenticated/route.tsx` (`ssr:false`) prüft `getUser()` + RPC `is_account_active` und leitet mit `?redirect=…&reason=…` nach `/auth`.
- **Anmeldeseite** `src/routes/auth.tsx` besitzt bereits ein validiertes `reason`-Search-Param (`unavailable | account_inactive | account_locked | account_archived`) und eine Meldungstabelle → hier wird `idle_timeout` ergänzt.
- **Benutzerzustand**: `src/hooks/useCurrentUser.ts` (Session + Profil + Rolle, `onAuthStateChange`), Dashboard-Store `src/lib/store/dashboard-store.ts`, IndexedDB-Downloads/Logs.
- **RBAC**: Matrix in `src/lib/rbac/permissions.ts`, gespiegelt in `backend/services/rbac.mjs` (Drift-Check `scripts/check-rbac.mjs`). Passende bestehende administrative Berechtigung: **`users.manage`** (SysAdmin + Administrator) – keine neue Rolle/Permission.
- **Konfiguration**: Namenskonvention `VITE_*` für Client, dokumentiert in `.env.example`; keine Systemeinstellungs-Tabelle vorhanden.
- **Logging**: zentraler Logger `src/lib/logger.ts`, `lint:no-console` mit Policy in `scripts/console-policy.mjs`.

## Umzusetzen

### 1. Datenbank (Migration)
Neue Tabelle `public.app_settings` (`key text PK`, `value jsonb`, `updated_at`, `updated_by`), inkl. GRANTs, RLS:
- SELECT für `authenticated` (nicht `anon`) – jeder Angemeldete muss den wirksamen Timeout kennen.
- INSERT/UPDATE nur wenn `has_permission(auth.uid(),'users.manage')`.
- `set_updated_at`-Trigger; Audit-Eintrag über bestehendes `audit_log`-Muster (Trigger).
Kein Eingriff in bestehende RLS/RBAC-Objekte.

### 2. Zentrale Konfiguration
`src/lib/session/idle-config.ts`:
- `DEFAULT_IDLE_TIMEOUT_MINUTES = 5`, `MIN = 1`, `MAX = 480`, `DEFAULT_WARNING_SECONDS = 60`.
- `parseIdleTimeout(raw): { minutes, source, invalidReason? }` – verwirft leer/Text/0/negativ/>480/Dezimal, fällt auf Standard zurück und meldet über `logger.warn` (ohne Rohwert-Ausgabe).
- Priorität: `app_settings.idle_timeout_minutes` → `VITE_IDLE_TIMEOUT_MINUTES` → Standard; Warnzeit = `min(60s, 20 % des Timeouts)`.
- Hook `useIdleTimeoutConfig()` lädt die Einstellung einmalig, liefert Wert + Herkunft.

### 3. Zentraler Logout (Provider-Adapter)
`src/lib/session/logout-service.ts` – **einziger** Logout-Pfad für manuell und automatisch:
`Guard gegen Mehrfachaufruf → App-/Query-Caches und benutzerbezogene Zustände leeren → supabase.auth.signOut() (Fehler geloggt, aber nicht blockierend) → lokale Auth-Storage-Reste entfernen → Navigation nach /auth mit reason`. Netzwerkfehler führen trotzdem zu vollständiger lokaler Bereinigung und Redirect.

### 4. Inaktivitätslogik (providerneutral)
`src/lib/session/idle-monitor.ts` – reines TS ohne Supabase-Bezug: absolute Zeitstempel (`Date.now()`), Aktivitätsereignisse (`mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart`, `pointerdown`, `visibilitychange`→sichtbar, Router-Navigation) mit 2 s Throttle, 1 s Tick-Prüfung (erkennt Standby/Zeitsprünge), Warn- und Ablauf-Callbacks, Listener-Cleanup.
`src/lib/session/idle-channel.ts` – `BroadcastChannel` mit `storage`-Event-Fallback; verteilt ausschließlich `{ lastActivity: number }` und `{ type: "logout" }`, niemals Tokens. Ältere Zeitstempel werden verworfen. Reload liest den letzten Zeitstempel (Plausibilitätsprüfung: nicht in der Zukunft, nicht älter als Timeout×2 → sonst sofortiger Logout).
`src/hooks/useIdleLogout.ts` verdrahtet Monitor + Kanal + Logout-Service; **nur** innerhalb `_authenticated` aktiv (Mount in `src/routes/_authenticated/route.tsx`), also nicht auf `/auth`, `/reset-password`, `/`.

### 5. UI
- `src/components/session/IdleWarningDialog.tsx`: „Ihre Sitzung läuft wegen Inaktivität ab.", Countdown, `Angemeldet bleiben` / `Jetzt abmelden`; Fokus-Trap, ARIA-Live-Countdown, kein Schließen durch Hintergrundaktivität, hell/dunkel, responsiv.
- `src/routes/auth.tsx`: `reason`-Enum um `idle_timeout` erweitert; Text mit wirksamem Minutenwert („Sie wurden nach X Minuten Inaktivität automatisch abgemeldet."), Wert aus der Konfiguration.
- `src/components/dashboard/header/ServiceMenu.tsx`: neuer Eintrag **Abmelden** (nutzt denselben Logout-Service).
- `src/components/SystemStatusDialog.tsx` bzw. Servicebereich: Abschnitt **Automatische Abmeldung bei Inaktivität** mit Zahlenfeld (1–480), Hilfetext, wirksamem Wert, Herkunft (Systemeinstellung/Umgebungsvariable/Standard) und Hinweis zur Wirksamkeit; Schreibzugriff via `PermissionGate permission="users.manage"` **plus** serverseitige Durchsetzung durch RLS.

### 6. Tests
- Unit (Vitest, Fake-Timer): Konfig-Parsing (Standard, gültig, Min/Max, ungültige Varianten), Aktivität setzt Timer zurück, Hintergrundereignisse nicht, Warnzeitpunkt, Countdown, „Angemeldet bleiben", „Jetzt abmelden", genau ein Logout, Listener-Cleanup, Reload-Zeitstempel, Standby-Zeitsprung, veraltete Zeitstempel.
- Auth-Tests: `signOut()` aufgerufen, Zustandsbereinigung, Redirect mit `reason`, Fehlerfall lässt keinen zugänglichen Dashboardzustand.
- Tab-Tests: Kanal-Nachrichten synchronisieren Aktivität und Logout, nur ein Logout, Fallback-Pfad.
- Playwright (`e2e/specs/session/idle-logout.spec.ts`): mit verkürztem Timeout (Testkonfiguration, produktiv bleibt 5 Min) Warnung → Angemeldet bleiben → Ablauf → `/auth` mit Hinweis → geschützte Route bleibt gesperrt; zweiter Test für `Jetzt abmelden`.

### 7. Prüfbericht und Dokumentation
- Neuer Prüfbereich **Sitzungs- und Inaktivitätsmanagement** in der Report-Pipeline (`scripts/technical-report/`), Bericht neu erzeugen, Hash und Historieneintrag; nicht ausgeführte Prüfungen explizit als „nicht verifiziert".
- `CHANGELOG.md` (v1.45.0), `README.md`, `.env.example` (`VITE_IDLE_TIMEOUT_MINUTES`), `docs/ARCHITECTURE.md`, `docs/RBAC-MATRIX.md`-Hinweis, neue `docs/SESSION-TIMEOUT.md`, ADR-0020 (Providertrennung Inaktivität vs. Auth-Adapter), Handbuchkapitel (Benutzer + Administration) in `src/lib/help-documentation.ts`, `docs:check`.

### 8. Gates
`bun run typecheck`, `lint`, `lint:no-console`, `test`, `build`, `docs:check` – bestehende 318 Tests bleiben unverändert grün; Abschlussbericht mit den 26 geforderten Nachweispunkten und Go/No-Go für 05D.

## Bewusst nicht enthalten
Entra ID, MFA, Azure-Themen, Änderungen an Supabase-Session-Laufzeit, neue Rollen/Permissions, `backup-service.ts`-Refactoring.

## Kritische Anmerkung
Die automatische Abmeldung ist rein clientseitig — ein Angreifer mit gestohlenem Token bleibt bis zum serverseitigen Token-Ablauf gültig. Das wird als bekannte Grenze dokumentiert; eine echte serverseitige Idle-Durchsetzung wäre ein eigener Sprint (kürzere JWT-Laufzeit + serverseitige Aktivitätsprüfung).
