## Ziel
Einheitliches Logging über bestehende `logger`-API (`src/lib/logger.ts` bzw. `backend/services/logger.mjs`). Keine neue Infrastruktur, keine direkten `console.*`.

## Umfang der Änderungen

### 1. Frontend-Services mit Logger erweitern
- **`src/lib/json-import-service.ts`**: `info` bei Start/Ende Import (counts, warnings, snapshotId), `warn` bei Duplikaten/Mapping-Gaps, `error` in beiden `catch`-Blöcken (Parse-Fehler und Rollback), `debug` beim Snapshot-Erstellen/Rollback.
- **`src/lib/json-export-service.ts`**: `info` bei erfolgreichem Export (Format, Counts), `error` bei Fehler.
- **`src/lib/export-download-service.ts`**: `debug` bei Registrierung, `info` bei Löschung durch Retention, `error` bei IndexedDB-Fehlern.
- **`src/lib/azure/azure-service.ts`**: `info` für gestartete Aktionen (kind, actor), `warn` bei Stub-Skip (bereits vorhanden), `error` bei Fehlschlägen; Verbindungsstrings/Keys niemals loggen — nur `endpoint` gehasht oder Hostname.
- **`src/lib/azure/azure-history-store.ts`**: `warn` bei Parse-/Quota-Fehlern in `localStorage`.
- **`src/lib/user-management.ts`**: `info` bei Create/Update/Delete/Role-Change (userId, role, action — kein Passwort/E-Mail-Body), `warn` bei blockierten Admin-Lockouts, `error` bei Validierungsfehlern.
- **`src/lib/project-info.ts`**: `warn` bei fehlgeschlagenem `/api/status`-Fetch, `debug` bei erfolgreichem Refresh.

### 2. Service-Dialoge: `console.*` entfernen
- `src/components/ExportDialog.tsx` (3 Stellen), `src/components/SaveTargetDialog.tsx` (1), `src/components/azure/AzureDataDialog.tsx` (ErrorBoundary onError) → `logger.error/warn` mit `{ module: "ExportDialog", action, userId }`.

### 3. Backend
- **`backend/services/syncService.mjs`** und **`statusService.mjs`**: `logger.info` bei Aufruf, `logger.error` bei Fehler (bereits teilweise vorhanden — nur ergänzen falls Lücken).
- **`backend/server.mjs`**: Die zwei Startup-`console.log` durch `logger.info` ersetzen (Datei nicht in `check-no-console` TARGETS, aber Konsistenz).

### 4. Kontext-Konvention
Alle neuen `logger.*`-Aufrufe erhalten einheitlichen Kontext:
```
{ module: "BackupService" | "ImportService" | ..., action: "create" | "rollback" | ..., userId?, code?, counts? }
```
Bestehende Redaction in `logger.ts` fängt `token/secret/password/authorization/apikey/…` ab — für Azure zusätzlich Connection-Strings/Endpoints als `endpoint: hostname(url)` reduzieren (kein Query-String, kein SAS-Token).

### 5. Guard erweitern
`scripts/check-no-console.mjs` — TARGETS um `src/lib/json-import-service.ts`, `src/lib/json-export-service.ts`, `src/lib/export-download-service.ts`, `src/lib/user-management.ts`, `src/lib/project-info.ts`, `src/components/ExportDialog.tsx`, `src/components/SaveTargetDialog.tsx`, `src/components/azure/AzureDataDialog.tsx` ergänzen. Backend-Server bewusst außen vor lassen (Bootstrap-Ausgabe erlaubt).

### 6. Tests
Neue Datei `src/__tests__/lib/logger-integration.test.ts`:
- `should_logSuccess_when_userCreated` (user-management)
- `should_logError_when_jsonImportParseFails`
- `should_redactAzureConnectionString_when_loggedAsSecret`
- `should_notLeakTokens_when_exportDialogFails` (via `logger.getRecent()`)

Bestehende Tests bleiben unverändert lauffähig.

### 7. Doku
- `CHANGELOG.md`: neuer Eintrag `## 1.27.0 - 2026-07-11` mit Bullet-Zusammenfassung.
- `src/lib/help-documentation.ts`: bestehendes Kapitel „Log Viewer" um Absatz „Was wird geloggt" erweitern; `lastUpdated` aktualisieren.

## Nicht enthalten
- Kein neuer Log-Sink, kein Upload, keine neue UI.
- Kein Refactor der Redaction-Regeln (existierende JWT/Secret-Regex bleibt).
- Kein Umbau bestehender Logging-Aufrufe (`BackupService` bereits konform).

## Kritischer Hinweis
Für Azure sollte mittelfristig ein dedizierter Redactor für Connection-Strings (`AccountKey=…`, `SharedAccessSignature=…`) direkt in `logger.ts` ergänzt werden. Für diesen Schritt wird das über die Aufrufer-Disziplin gelöst (nur Hostname loggen); Empfehlung im Handbuch-Kapitel dokumentiert.
