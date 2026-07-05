## Ziel

Einheitlicher Logger + Error-Class-Layer, in kritische Services eingezogen, mit Tests, DevTools-Zugriff und aktualisiertem Handbuch/CI.

## 1. Logger (`src/lib/logger.ts`)

- Levels: `debug | info | warn | error`, jeweils mit `context?: Record<string, unknown>`.
- Sinks:
  - **DEV** (`import.meta.env.DEV`): `console.debug/info/warn/error` mit Stack.
  - **PROD**: Ringpuffer im Speicher (max 500 Einträge) + persistiert in **IndexedDB** (Store `logs`, Rotation nach 1000 Zeilen / 7 Tagen). Fallback auf `localStorage`, wenn IndexedDB fehlt (SSR / Worker → No-Op).
- SSR-safe: Sink wird lazy initialisiert, im Worker/SSR nur `console`.
- **Secret-Redaction**: gemeinsame Utility `redact(context)` maskiert Keys mit `/token|secret|key|password|authorization|bearer/i` als `"[REDACTED]"`; wird vor jedem Sink-Write aufgerufen.
- Öffentliche API zusätzlich:
  - `logger.getRecent(level?)` → Buffer-Read für DevTools
  - `logger.clear()` → wipe (nur DEV oder mit RBAC `system.debug`)
  - Bei App-Start `window.__dashboardLogger = logger` nur wenn `import.meta.env.DEV`.

## 2. Error-Klassen (`src/lib/errors.ts`)

- `DashboardError extends Error { code: string; context?: Record<string, unknown>; cause?: unknown }` mit `name = 'DashboardError'` und `toJSON()` für Logs.
- Subklassen: `SyncError`, `ValidationError`, `ImportError`, `ExportError`, `AzureError`, `BackupError`, `RbacError`.
- Helper `isDashboardError(x)`, `wrapError(code, message, cause, ctx)`.

## 3. Service-Integration

Pattern überall: try → `logger.info` bei Erfolg mit Zähler/IDs, catch → `logger.error(msg, err, ctx)` + `throw new XxxError(CODE, msg, { cause, ...ctx })`. Keine `console.*` mehr, keine Secrets im Context.

Betroffene Dateien:
- `backend/services/syncService.mjs` — ESM-Variante des Loggers (`backend/services/logger.mjs`, gleiche API, nur Console-Sink, da Worker/Node). `runSync` gibt strukturierte Fehler zurück; `SyncError`-Äquivalent via `code`-Feld.
- `src/lib/json-import-service.ts` — Wrap in `ImportError` / `ValidationError` je nach Schritt (Parse / Schema / Merge).
- `src/lib/backup-service.ts` — `BackupError` (create/restore/list), Kontext: `manual`, `recordId`.
- `src/lib/azure/azure-service.ts` — bereits kanonisch für Aktionen → auf `AzureError` + Logger umstellen (Historie-Einträge behalten).

Nicht angefasst: reine UI-Komponenten, `time-period.ts` (pur), Tests.

## 4. React-Hook (`src/hooks/useSafeAsync.ts`)

- `useSafeAsync<T>(fn)` → `{ execute, data, error, isError, isLoading, reset }`.
- Setzt `error` als `Error`; loggt mit `logger.error('useSafeAsync failed', err, { fn: fn.name })`.
- Nicht als Ersatz für TanStack Query gedacht — nur für Ad-hoc-Handler (z. B. Azure-Panel-Buttons).

## 5. DevTools

- Neuer Reiter im bestehenden `SystemStatusDialog`: **„Logs“** (nur mit Permission `system.debug`, sonst versteckt). Zeigt `logger.getRecent()`, Filter nach Level, Copy-JSON, „Löschen“-Button.
- Kein neuer Dialog, keine neue Route.

## 6. Tests (`src/__tests__/lib/`)

- `logger.test.ts`: Level-Filter, Redaction (Token/Password/Bearer), Ringpuffer-Rotation, No-Op im SSR-Fall (kein `window`).
- `errors.test.ts`: `DashboardError` erhält `code`/`context`/`cause`, `toJSON` ohne Secret-Leak, `isDashboardError` guard.
- `useSafeAsync.test.tsx`: Erfolg setzt `data`, Wurf setzt `error` und ruft Logger (via `vi.spyOn`), `reset()` leert State.
- Erweiterung `import.test.ts` / `exports.test.ts`: Fehlerpfade werfen jetzt `ImportError`/`ExportError` mit erwartetem `code`.
- Erwartete Test-Anzahl steigt von 61 auf ≥ 75.

## 7. CI (`.github/workflows/ci.yml`)

- Neuer Step nach `test:coverage`: `bun run lint:no-console` — kleiner Node-Skript-Check `scripts/check-no-console.mjs`, der in `src/lib/**` und `backend/services/**` (außer `logger.*`) keine `console.log/info/warn/error/debug` erlaubt. Fails red.
- `package.json` bekommt Script `lint:no-console`.
- Bestehende `docs:check` bleibt.

## 8. Handbuch + CHANGELOG (Pflicht)

- Neuer HelpTopic **`fehlerbehandlung-logging`** in `src/lib/help-documentation.ts` (was Logger loggt, wie DevTools-Reiter benutzt wird, welche Error-Codes es gibt).
- Erweitere Topic `tests-qualitaetssicherung` um Hinweis auf Error-Tests.
- `CHANGELOG.md`: neue Version `1.21.0 - 2026-07-05` mit Bullets.
- `bun run docs:check` grün.

## Technische Details

```text
src/lib/
  logger.ts            (neu)  Sink-Wahl, Redaction, IndexedDB-Adapter
  errors.ts            (neu)  DashboardError + Subklassen
  logger.indexeddb.ts  (neu)  isolierter IDB-Adapter (dynamisch importiert)
backend/services/
  logger.mjs           (neu)  ESM-Pendant (nur Console + Redaction)
src/hooks/
  useSafeAsync.ts      (neu)
src/__tests__/lib/
  logger.test.ts       (neu)
  errors.test.ts       (neu)
src/__tests__/hooks/
  useSafeAsync.test.tsx (neu)
scripts/
  check-no-console.mjs (neu)
```

- Keine neuen Runtime-Dependencies.
- IndexedDB-Zugriff via nativer `indexedDB`-API (Cloudflare-Worker-safe, weil Aufrufe nur clientseitig laufen — Guard `typeof indexedDB !== 'undefined'`).
- Bestehendes `src/lib/error-capture.ts` bleibt (SSR-Kanal), Logger wird lediglich zusätzlich aufgerufen.

## Done Criteria

- Alle in §3 genannten Services rufen ausschließlich `logger.*` und werfen `DashboardError`-Subklassen.
- `bun run test` grün, ≥ 75 Tests, neue Testdateien enthalten.
- `bun run lint:no-console` grün und in CI verdrahtet.
- DevTools-Reiter „Logs“ sichtbar für Rolle mit `system.debug`.
- HelpTopic + CHANGELOG-Eintrag vorhanden, `bun run docs:check` grün.
- Keine Secrets in geloggtem Context (durch Redaction + Test abgesichert).
