
# Sprint 03B – Login Recovery und End-to-End-Authentifizierung

## Beobachteter Zustand (verifiziert vor Planung)

- Console-Log der laufenden Preview zeigt einen harten Renderfehler **`TypeError: Cannot convert object to primitive value`** im `beforeLoad` von `/_authenticated`, gefolgt von einem Ausschlag der `CatchBoundary` in `__root__/`. Dadurch erscheint die Fehlerseite „This page didn't load" statt einer Weiterleitung nach `/auth`.
- Session-Replay bestätigt: Aufruf `/dashboard` → sofort Fehlerseite. Es gibt also keine „stumme Auto-Anmeldung"; der Redirect-Guard löst technisch aus, bricht aber vor der eigentlichen `redirect()`-Wirkung ab.
- Auth-Konfiguration (`config.ts`, `runtime-config.ts`, `/api/public/auth-config`) ist grundsätzlich vorhanden und mit Runtime-Fallback ausgestattet; Publish nutzt ggf. den Runtime-Weg.
- Ursachenverdacht (unbestätigt): Der neue Open-Redirect-Guard in `_authenticated/route.tsx` konstruiert `combined = \`${path}${search}\`` — wenn TanStack `location.search` in dieser Router-Version als **Objekt** liefert, wirft die Template-Coercion genau diesen `TypeError`. Ebenfalls prüfen: `throw redirect({ … search: { … } })` innerhalb `try/catch` mit `isRedirect`-Fehlprüfung (Property-Check statt `isRedirect()`-Funktion) — kann Redirects verschlucken.

Diese Hypothesen werden in Schritt 1 des Sprints reproduziert und bestätigt, bevor eine Zeile geändert wird.

## Ziel

Preview- und Published-Login sind mit einem realen Supabase-Benutzer end-to-end nachweisbar. Keine Fachfunktionen, kein Refactoring über den Fix hinaus.

## Vorgehen

### 1. Fehler reproduzieren und Ursache bestätigen
- Playwright-Reproskript gegen `http://localhost:8080/dashboard` und `/auth?redirect=/dashboard` (Chromium headless, viewport 1280×1800). Erfasst URL, Screenshot, Console, Netzwerkstatus, `X-Correlation-Id`. Keine Tokens/Passwörter im Log.
- Zweite Session mit gültigem Supabase-User (`LOVABLE_BROWSER_AUTH_STATUS`) — falls `injected`, Session in localStorage restoren und Verhalten dokumentieren; sonst als „external_unmanaged" markieren und nur öffentliche Route testen.
- Runtime-Typ von `location.search` in `_authenticated/route.tsx` per gezieltem `console.debug` (temporär) verifizieren, um Hypothese A oder B zu belegen.

### 2. Minimalfix
Nur die tatsächlich bestätigte Ursache ändern. Erwartete, minimal-invasive Kandidaten:
- `src/routes/_authenticated/route.tsx`
  - `safeInternalTarget` neu: `location.pathname` (String) verwenden, `search` mit `new URLSearchParams` in String konvertieren, statt Template-Coercion auf ein potenziell-Objekt.
  - `catch`-Block: TanStack-`isRedirect(e)` importieren (statt Property-Check `.isRedirect`), damit legitime Redirects nicht in den Fallback-Redirect kollabieren.
  - `is_account_active`-RPC in eigenen `try/catch`, damit Netzwerk-/RLS-Fehler nicht die gesamte Session abbrechen (Unterscheidung „Auth ok, Statusprüfung down" vs. „nicht eingeloggt").
- `src/routes/auth.tsx`
  - `safeRedirect` analog absichern; `Link to="/"` in „Zurück"-Zeile prüfen — kein Coercion-Risiko, aber Konsistenz.
- Redirect-Guard bleibt aktiv: Nur same-origin Pfade (`^/[^/\\]`) werden weitergereicht, alles andere fällt auf `/dashboard` zurück.

Explizit **nicht** angetastet: Supabase-Client, RBAC, RLS, Runtime-Config, Service-Role, Logger-Redaction, Oversize-Refactor.

### 3. Auth-Regressionstests
- **Neuer Unit-/Router-Test** in `src/__tests__/routes/authenticated-guard.test.ts` (oder analog): simuliert `location` mit Objekt-`search` und stellt sicher, dass `beforeLoad` **nicht** wirft und den korrekten Redirect wählt. Reproduziert den heutigen Bug 1:1.
- **Neuer E2E-Test** `e2e/specs/auth/login-e2e.spec.ts`:
  - anonym: `/dashboard` → Redirect nach `/auth?redirect=/dashboard`
  - Login mit Testuser (Supabase-Credentials aus `E2E_SUPABASE_TEST_EMAIL`/`E2E_SUPABASE_TEST_PASSWORD`; wenn nicht gesetzt → Test wird `skip` mit klarer Meldung, kein Fake-Pass)
  - nach Login: Weiterleitung auf `/dashboard`, Reload behält Session, Logout entfernt Session, Direktaufruf `/dashboard` erneut blockiert
  - Open-Redirect: `/auth?redirect=//evil.example` landet nach Login auf `/dashboard`
- Bestehende 301 Vitest- und Playwright-Suiten müssen grün bleiben (`bun run typecheck`, `bun run lint`, `bun run test`, `bun run test:e2e`, `bun run docs:check`).

### 4. Manuelle End-to-End-Verifikation
Ausgeführt und dokumentiert (URL, Zeitpunkt, HTTP-Status, Correlation-ID, sichtbare Meldung, Reload-Verhalten — **keine** Credentials):
- Preview desktop / Preview mobile Emulation
- Published desktop / Published mobile Emulation
- Privates + normales Browserfenster
- Ohne Session, falsches Passwort, unbekannter User, User ohne Rolle, abgelaufene Session, ungültiger Redirect-Param

Solange Published-Login nicht real bestätigt ist, bleibt der Sprint offen und der Technical Report führt einen expliziten Gate-Blocker.

### 5. Dokumentation
- `CHANGELOG.md` → neuer Eintrag `1.42.2`
- `src/lib/help-documentation.ts` → HelpTopic „Authentifizierung – Fehlerbehebung 03B" (`lastUpdated`)
- `docs/DEPLOYMENT.md` und `README.md`: Hinweis zu Preview/Published-Login-Verifikationslauf und benötigten E2E-Env-Variablen (nur Variablennamen, keine Werte)
- `test-report/auth-commissioning-report.md` + Technical Report: neuer Abschnitt „Login End-to-End nachgewiesen" mit Zeitpunkt, Version, Ergebnis Preview, Ergebnis Published

### 6. Abschluss-Gate
Sprint 03B wird nur als „Go" markiert, wenn **alle** Punkte aus Abschnitt „Abnahmekriterien" des Prompts belegt sind, inkl. real durchgeführtem Published-Login. Andernfalls: klarer No-Go mit offenem Gate-Blocker im Technical Report; keine Arbeiten an Sprint 04.

## Technische Details / Betroffene Dateien (voraussichtlich)

```text
src/routes/_authenticated/route.tsx     safeInternalTarget-String-Coercion, isRedirect(), RPC-try/catch
src/routes/auth.tsx                     safeRedirect analog, ggf. reason-Whitelist erweitern
src/__tests__/routes/…                  neuer Router-Guard-Test
e2e/specs/auth/login-e2e.spec.ts        neuer real-E2E-Test
CHANGELOG.md, help-documentation.ts,
docs/DEPLOYMENT.md, README.md,
test-report/*                           Doku- und Reportsynchronisation
```

## Kritische Hinweise

- Der reale End-to-End-Login benötigt **Supabase-Test-Credentials im Sandbox-Env**. Ohne diese Variablen kann der Sprint per Definition nicht abgeschlossen werden — bitte im Anschluss an die Plan-Freigabe `E2E_SUPABASE_TEST_EMAIL` und `E2E_SUPABASE_TEST_PASSWORD` als Secrets bereitstellen (Namen ok, Werte niemals in Chat). Ohne diese wird der neue E2E-Test dokumentiert `skip` und ich melde ausdrücklich **No-Go**, statt einen grünen Balken vorzutäuschen.
- Wenn Schritt 1 zeigt, dass die Ursache **nicht** die Guard-Coercion ist (z. B. RPC `is_account_active` wirft wegen fehlender EXECUTE-Grants nach dem letzten Härtungssprint), verschiebt sich der Fix auf die RPC-Grants — der Sprint bleibt ansonsten identisch.
- ADR-0019/Oversize-Refactor bleibt außerhalb dieses Sprints.
