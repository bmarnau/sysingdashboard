## Ziel

Single Source of Truth für Azure-ENV-Namen: `envValidator.mjs` wird in `secretManager.mjs` aufgelöst, `validateEnv()` wandert als `secretManager.validate()` dorthin. Alle Aufrufer werden umgestellt, die Datei `config/envValidator.mjs` entfernt.

## Änderungen

### 1. `config/secretManager.mjs` erweitern
- Neue Funktion `validate()` mit identischer Semantik wie bisheriges `validateEnv()`:
  - iteriert über die bereits vorhandene `KNOWN`-Liste (= Pflicht-ENVs in PROD),
  - PROD: aggregierter Throw `Missing required ENV variables: A, B, C`,
  - DEV: einzelne Warn-Zeile mit Namen, kein Throw,
  - Rückgabe `{ mode, missing, ok }`.
- Neue Funktion `getEnv(name, requiredInProd = true)` analog der bisherigen Logik (vorhanden → Wert; fehlt+PROD+required → Throw; sonst Warnung+undefined). Akzeptiert auch unbekannte Namen (für künftige Nicht-Azure-Variablen), prüft aber niemand-loggen-Regel.
- Re-Export `isDev`, `isProd` aus `config/env.mjs` zur bequemen Nutzung.
- Header-Kommentar: „Backend only — do not import from src/".

### 2. Aufrufer umstellen
- `backend/server.mjs`: Import `validateEnv` → `import { validate as validateEnv } from "../config/secretManager.mjs"` (Aufrufseite unverändert).
- `backend/services/ensure-env.mjs`: gleicher Import-Swap.
- `src/types/backend.d.ts`: Modul-Deklaration `*/config/envValidator.mjs` entfernen; `*/config/secretManager.mjs` ergänzen (inkl. neuer `validate`/`getEnv`-Signaturen plus bestehender `has`/`preview`/`status`/`consume`/`mask`/`KNOWN`).

### 3. Cleanup
- `config/envValidator.mjs` löschen (`rm`).
- Suche im Repo nach Restreferenzen (`rg envValidator`) und ggf. nachziehen.

### 4. Doku-Sync (Pflicht)
- `CHANGELOG.md`: neuer Eintrag `## 1.17.7 - 2026-06-27` mit Hinweis auf Konsolidierung (keine funktionale Änderung, reine Architektur).
- `src/lib/help-documentation.ts`: Kapitel „ENV-Validierung & Production-Gating" aktualisieren — Pfad/Funktionsname auf `secretManager.validate()` setzen, `lastUpdated` anheben.
- `bun run docs:check` zur Verifikation.

## Bewusst NICHT enthalten

- Keine Verhaltens-/Semantik-Änderung an Validierung, Masking oder `consume()`.
- Kein Schema-Wechsel (Zod o.ä.).
- Keine zusätzliche `requiredInProd=false`-Liste — bleibt bei den 5 bekannten Azure-Pflicht-ENVs.
