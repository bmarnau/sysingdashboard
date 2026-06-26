## Ziel

Eine zentrale, sichere Validierung aller Azure-bezogenen Environment Variables. PROD startet hart fehl bei fehlenden Pflicht-ENVs, DEV bleibt ohne Azure-ENVs lauffähig. Keine Werte im Log, keine Hardcoded Secrets, nur Backend-Nutzung.

## Hinweis zur Dateiendung

Das Projekt nutzt durchgängig ESM mit `.mjs` (`config/env.mjs`, `config/secretManager.mjs`, `backend/server.mjs`). Ich lege die Datei deshalb als **`config/envValidator.mjs`** an statt `.js`. Funktional identisch, aber konsistent mit dem bestehenden Code. Wenn du strikt `.js` willst, sag Bescheid.

## Umsetzung

### 1. Neue Datei `config/envValidator.mjs`

API:
- `isDev()` / `isProd()` — re-export aus `config/env.mjs` (Single Source of Truth, kein doppeltes Mode-Parsing).
- `getEnv(name, requiredInProd = true)` — Logik gemäß Spezifikation:
  - vorhanden → Wert zurück
  - fehlt + DEV → `warn("Missing ENV variable: <name> (dev, optional)")`, `undefined`
  - fehlt + PROD + required → `throw new Error("Missing required ENV variable: <name>")`
  - fehlt + PROD + !required → Warnung, `undefined`
- `validateEnv()` — iteriert über die Pflichtliste:
  ```
  AZURE_SQL_CONNECTION
  AZURE_TABLE_CONNECTION
  AZURE_STORAGE_SAS
  AZURE_CLIENT_ID
  AZURE_TENANT_ID
  ```
  - In DEV: sammelt fehlende Namen, loggt eine einzelne `warn`-Zeile mit Namensliste, kein Throw.
  - In PROD: sammelt alle fehlenden Namen, wirft am Ende **einen** aggregierten Error (`Missing required ENV variables: A, B, C`), damit der Operator alles auf einmal sieht statt Fix-by-Fix.
  - Rückgabe: `{ mode, missing: string[], ok: boolean }`.

Sicherheitsregeln im Code:
- Keine Defaults, keine Fallback-Strings.
- `console.warn` / `console.error` nur mit Variablennamen, **nie** mit Werten. Eslint-Regel ist hier nicht durchsetzbar — Convention im Modul-Header dokumentieren.
- Keine Imports aus `src/` → kein Risiko, dass Frontend-Bundles das Modul ziehen.

### 2. Backend-Startpunkte instrumentieren

- **`backend/server.mjs`**: `validateEnv()` direkt nach den Imports aufrufen, vor `server.listen(...)`. Bei PROD-Throw bricht Node mit Exit-Code != 0 ab → sicheres Fail-Fast.
- **TanStack Server-Routes** (`src/routes/api/status.ts`, `src/routes/api/sync.ts`) sind der zweite „Startpunkt" im deployten Worker. Da hier kein klassischer Boot-Hook existiert, ergänze ich einen **lazy einmaligen Validation-Guard** in einem neuen Helper `backend/services/ensure-env.mjs`, der beim ersten Request `validateEnv()` ausführt und das Ergebnis cached. Im PROD-Worker führt eine fehlende Pflicht-ENV dann zu einem 500 mit generischer Fehlermeldung (kein Variablenwert im Body), im DEV-Worker nur zu einer Warnung. Beide bestehenden Route-Handler rufen diesen Guard als erste Zeile auf.

### 3. Frontend-Schutz

- `config/envValidator.mjs` enthält Kommentar-Header „Backend only — do not import from src/".
- Keine Code-Änderung im Frontend.
- Optional: Eintrag in `scripts/security-check.mjs`, der ein `import .* from .*envValidator` unter `src/**` als Finding meldet. Wenn du das willst, ergänze ich es; ansonsten lasse ich es weg, um den Scope klein zu halten.

### 4. Doku-Sync (Pflicht laut Memory)

- `CHANGELOG.md`: neuer Eintrag `## 1.17.6 - 2026-06-26` mit Stichpunkten zur ENV-Validierung.
- `src/lib/help-documentation.ts`: bestehendes Kapitel „Offline-Betrieb" / neuer HelpTopic „ENV-Validierung & Production-Gating" mit `lastUpdated`.
- `bun run docs:check` zur Verifikation.

## Bewusst NICHT enthalten (kritisches Feedback)

- **Keine Verschmelzung mit `secretManager.mjs`.** Sinnvoller wäre langfristig EIN Modul, das Secrets sowohl validiert als auch maskiert ausgibt — Aufteilung in `envValidator` + `secretManager` erzeugt zwei Quellen für „welche ENVs gibt es?". Wenn du willst, refaktoriere ich das in einem Folge-Schritt zu `secretManager.validate()` und entferne `envValidator` wieder.
- **Kein Zod-Schema.** Für 5 String-Variablen Overkill, würde nur Bundle und Komplexität erhöhen.
- **Kein Auto-Validate-on-Import.** Validierung läuft explizit beim Server-Boot bzw. beim ersten API-Request — sonst würden Build-Tools/Tests beim bloßen Import schon werfen.
