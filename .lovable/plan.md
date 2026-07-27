# Sprint 03A – Auth- und Security-Regression

Keine neuen Fachfunktionen. Reihenfolge: reproduzieren → analysieren → minimal fixen → Tests → Report.

## 1. Auth-Regression: reproduzieren & bewerten

**Erste Beobachtung aus den Quellen:**
- `src/routes/index.tsx` (Landing, 129 Zeilen) ruft `getSession()`. Bei vorhandener Session `navigate({ to: "/dashboard", replace: true })`. Das ist erwartetes Verhalten für einen **eingeloggten** Benutzer.
- `_authenticated/route.tsx` erzwingt Session per `getUser()` und `is_account_active` RPC. Ohne Session → Redirect nach `/auth`. Anonymer Zugriff ist damit blockiert.
- These: Die "verschwundene Anmeldung" ist keine Umgehung, sondern eine **persistierte Session** aus früheren Anmeldungen (`persistSession: true, storage: localStorage` in `client.ts`).

**Vorgehen zur Verifikation** (Playwright im Sandbox):
1. Preview + Published öffnen mit sauberem Storage → muss auf Landing verharren und Anmelde-CTA zeigen.
2. Direktaufruf `/_authenticated/dashboard` ohne Session → muss auf `/auth` redirecten.
3. Direktaufruf `/dashboard` mit vorhandener Session → Dashboard nur mit `is_account_active=true`.
4. Netzwerk-Trace: prüfen, ob PostgREST-Requests wirklich `Authorization: Bearer <jwt>` tragen (RLS-wirksame Identität).
5. Logout: `signOut()` + Cache-Teardown → Zurück auf `/auth`, Reload bleibt anonym.

**Behebung nur wenn Verifikation Umgehung zeigt.** Andernfalls im Report als "kein Sicherheitsproblem – persistierte Session, wie spezifiziert" schließen und im Handbuch als erwartetes Verhalten dokumentieren. Zusätzlich `search`-Redirect in `_authenticated/route.tsx` von `location.href` auf `location.pathname + location.search` einschränken (Open-Redirect-Härtung), damit externe URLs nicht als Redirect-Ziel eingeschleust werden können.

## 2. High-Findings validieren

| ID | Datei | Bewertung nach Codelese | Aktion |
|---|---|---|---|
| SEC-HIGH-LOG-001 | `src/lib/logger.ts`, `backend/services/logger.mjs` | **Echt.** Redaction prüft nur `JWT_RE` auf Werten; `AccountKey=`/`SharedAccessSignature=`/`Server=…Password=` bleiben unmaskiert. | Fix + Tests |
| td-endpoint-auth-…cdae73c5 | `src/routes/api/status.ts` | **Fehlalarm.** Datei deklariert `endpointMeta.public = true` mit Begründung; Scanner (`scripts/api-discovery/analyzers.mjs`) wertet dieses Marker-Feld nicht aus. | Scanner erweitern, Finding schließen |
| td-cycle-1fa843a1 | `src/__tests__/mocks/server.ts` | **Fehlalarm.** Self-Loop (Modul → sich selbst) in 16-Zeilen-Testdatei; Detektor zählt Re-Export als Kante. | Detektor: Self-Loop ignorieren |
| td-cycle-dc9fbe11 | `src/lib/logger.ts ↔ src/lib/logger.indexeddb.ts` | **Echt, klein & risikoarm.** | Sofort auflösen: `LogEntry`-Type nach `src/lib/logger.types.ts` extrahieren |
| td-oversize-99cca8a6 | `src/routes/index.tsx` (Report sagt 3256, tatsächlich 129) | **Stale Report.** Datei wurde in Sprint 1.40.x geschrumpft. | Reports neu bauen; Finding fällt weg |
| td-oversize-26e43c0a | `src/components/ExportDialog.tsx` (807 Z.) | **Echt, kein Auth/Security-Bezug.** | Tech-Debt für späteren Sprint, Refactor-Plan skizzieren |
| td-oversize-ebfd4b54 | `src/components/UserManagementDialog.tsx` (562 Z.) | **Echt, RBAC-nahe – aber Logik in `users-supabase-service.ts` gekapselt.** | Tech-Debt, Refactor-Plan skizzieren |

## 3. Minimale Fixes

### 3.1 Logger-Redaction (SEC-HIGH-LOG-001)
- `src/lib/logger.ts`: Regex-Set erweitern (`SECRET_VALUE_RE`) für:
  `AccountKey=…`, `SharedAccessSignature=…`, `Password=…`, `Server=…;.*Password=…`, `AccountName=…;AccountKey=…`, `postgres://…:…@`, `Bearer <opaque/JWT>`, `sb_secret_…`, `sb_publishable_…` (nur in Werten, nicht als Feldname).
- `SECRET_KEY_RE` um `connectionString`, `conn`, `dsn`, `sasUrl`, `sasToken` ergänzen.
- `backend/services/logger.mjs`: gleiche Regeln, gemeinsame Definition via reinem Datenmodul `backend/services/redact-rules.mjs` (kein ESM-CJS-Bruch).
- Tests: `src/__tests__/lib/logger.test.ts` erweitern (positiv: Werte werden `[REDACTED]`; negativ: harmlose Strings wie `"Server=lokaler Testserver"` ohne Credential-Muster bleiben unverändert; Nested Objects/Arrays; Fehler-Messages externer Provider).
- Snapshot-Guard: `src/__tests__/security/logging.test.ts` — kein Rohwert im Ringpuffer.

### 3.2 Endpoint-Auth-Scanner (Fehlalarm)
- `scripts/api-discovery/analyzers.mjs`: Wenn Modul `endpointMeta.public === true` exportiert, als "public, dokumentiert" führen und aus Auth-Guard-Prüfung ausklammern.
- Test: `src/__tests__/api-discovery/discovery.test.ts` — Fixture mit `endpointMeta.public = true` erzeugt **kein** Finding; Fixture ohne Marker erzeugt weiterhin Finding.

### 3.3 Zyklen
- `src/lib/logger.types.ts` (neu): `LogEntry`, `LogLevel`.
- `src/lib/logger.ts` und `src/lib/logger.indexeddb.ts` importieren daraus; kein Rückimport mehr.
- `scripts/tech-debt/detectors/cyclic-deps.mjs`: Self-Loops (a→a) verwerfen, weil Re-Exports einer Datei kein Zyklus im Sinne der Initialisierungsreihenfolge sind. Test ergänzen.

### 3.4 Open-Redirect-Härtung
- `src/routes/_authenticated/route.tsx`: `redirect`-Suchparameter auf `location.pathname + location.search` beschränken; Whitelist per `startsWith("/")` und `!startsWith("//")`.
- `src/routes/auth.tsx`: gleiche Validierung beim Rücksprung nach Login.

### 3.5 Report-Refresh
- `bun run test-report:build` (bzw. gleichwertiges Script) neu ausführen, damit stale Oversize-Angabe für `src/routes/index.tsx` verschwindet.

## 4. Tech-Debt dokumentieren (nicht beheben)

`docs/adr/ADR-0019-oversize-modules.md` (neu): Aufteilungsplan für `ExportDialog.tsx` (Export-Wizard-Steps + `useExportForm`-Hook + `export-formats.ts` Services) und `UserManagementDialog.tsx` (User-Table, Role-Editor-Panel, Invite-Form). Ziel-Sprint benennen.

## 5. Tests

- `bun run test` (Vitest, u.a. api/, security/, lib/logger, api-discovery).
- `bun run docs:check`.
- `bun run build`.
- `bunx tsc --noEmit`.
- Playwright (Sandbox, headless) Szenarien aus Abschnitt 1 gegen `http://localhost:8080`.

## 6. Dokumentation

- `CHANGELOG.md`: neuer Eintrag `v1.42.1` mit Bulletliste.
- `src/lib/help-documentation.ts`: Kapitel "Authentifizierung" (persistierte Session dokumentieren) und "Logging" (Redaction-Regeln) aktualisieren, `lastUpdated` setzen.
- `docs/SECURITY.md` (falls vorhanden, sonst kurzer Abschnitt in `README.md`): Auth-Verhalten, Public-Endpoint-Konvention (`endpointMeta.public`), Redaction-Regeln.

## 7. Abschlussbericht (im Report + Chat)
Ursache Auth-"Regression", geänderte Dateien, Ergebnis je High-Finding, geschlossene vs. offene Tech-Debt, Testergebnisse, **Go/No-Go für Sprint 04**.

## Technische Details
- Keine RLS-Policies berühren; keine Schema-Migration in diesem Sprint.
- Keine neuen Server-Fns; keine Änderungen an `client.server.ts` oder `auth-middleware.ts`.
- Änderungen sind additiv (Regex-Set, neuer Types-Splitfile, Scanner-Whitelist) → geringes Regressionsrisiko.
- Ergebnisartefakte: `test-report/technical-test-report.json` neu; alter Report als `prev` erhalten für Diff-Panel im Compliance-Dashboard.
