
# Prompt 2A.2 – Technical-Debt-Scanner (v1.29.0)

## Kritische Reflexion vorab

Der Prompt listet ~70 Prüfpunkte. **Die Hälfte davon ist nicht sinnvoll voll­automatisch entscheidbar** ("unklare Modulgrenzen", "zu viele Verantwortlichkeiten", "Widersprüche zwischen README, Architektur, API und ADR"). Ein rein regelbasierter Scanner, der solche Kategorien produziert, erzeugt genau die "automatisch erzeugten Scheinprobleme", die der Prompt explizit verbietet.

**Bewusste Entscheidung → Hybrid-Ansatz:**

1. **Automatische Detektoren** nur für objektiv messbare Signale (hoher Trennschärfegrad, wenige False Positives).
2. **Kuratierter Findings-Katalog** (`tech-debt/findings.yaml`) für alles Subjektive — mit exakt dem im Prompt geforderten Schema. Vom Team gepflegt, vom Scanner geladen und in denselben Report gemischt.
3. **Ein einziger Report-Merger**, der beides zusammenführt, gegen den Vor-Report diffed und Management-Summary + Priorisierung ableitet.

Der bestehende `scripts/check-tech-debt.mjs` (Zeilen-Count/TODOs) wird ersetzt, nicht ergänzt — er passt nicht ins neue Schema und ist Rauschen.

## Umfang

### 1. Findings-Schema (`src/lib/tech-debt/schema.ts` + JSON-Schema)

Ein `TechDebtFinding` mit exakt den Feldern aus dem Prompt: `id`, `title`, `category`, `location`, `description`, `rootCause`, `impact`, `severity` (Critical/High/Medium/Low/Informational), `likelihood`, `recommendation`, `recommendedOrder`, `effort` (klein/mittel/gross), `status` (offen/akzeptiert/geplant/behoben/nicht-zutreffend), `firstDetected`, `lastChecked`, `version`, `source` (`automated` | `manual`), optional `adrRef`, `automatedRule`.

Zod-validiert. Beide Quellen (YAML + Detektor-Output) laufen durch dieselbe Validierung → Reportintegrität.

### 2. Automatische Detektoren (`scripts/tech-debt/detectors/*.mjs`)

Nur Regeln mit **hoher Präzision**. Jede liefert `TechDebtFinding[]`.

| Detektor | Deckt Prompt-Punkt | Quelle |
|---|---|---|
| `cyclic-deps.mjs` | zyklische Abhängigkeiten | `madge --circular` (devDep) |
| `orphan-modules.mjs` | nicht genutzter/veralteter Code | `knip` (devDep), Ignore-Liste für ADR-legitimierte Fälle |
| `layer-violations.mjs` | UI→Persistenz / UI→Azure-Direktzugriffe | AST-freies Grep: `src/components/**` importiert `@/lib/store/dashboard-persistence` oder `@/lib/azure/*` (nicht via Facade `azure-service`) |
| `oversize-modules.mjs` | übergrosse Komponenten | LOC + JSX-Return-Count Heuristik, Schwelle 400 LOC ODER >8 exportierte Symbole; ADR-0006-Ausnahmen respektieren |
| `console-usage.mjs` | direkte console.\* | reuse `scripts/check-no-console.mjs`-Regel |
| `endpoint-guards.mjs` | ungeschützte Endpoints, fehlende Zod-Validierung | scannt `src/routes/api/**` auf fehlende `requireSupabaseAuth`/`X-Sync-Token`/Zod-`.parse` |
| `doc-drift.mjs` | abweichende Versionsangaben, veraltete Kapitel | reuse `scripts/check-docs-sync.mjs`-Kern + `lastUpdated > 180 Tage` |
| `coverage-gaps.mjs` | ungetestete kritische Services | liest `coverage/coverage-summary.json`, meldet `<50%` für Dateien unter `src/lib/{azure,rbac,backup-service,json-*,user-management,logger*}` |
| `adr-compliance.mjs` | ADR-Verletzungen | ADR-Metadaten in `docs/ADR/*.md` frontmatter (`enforced-by:`) → verlinkt entsprechenden Detektor-Fund als `adrRef` |

Detektoren, die **nicht** implementiert werden, mit Begründung im Handbuch: „zu viele Verantwortlichkeiten", „Widerspruch zwischen README und ADR", „instabile Tests" — landen im Manual-Katalog.

### 3. Kuratierter Manual-Katalog (`tech-debt/findings.yaml`)

Vom Team gepflegt. Beispiel-Einträge werden initial gesät für die aus 2A.1 bekannten offenen Punkte (Playwright-Smoke-only, MSW-Coverage, Chromium-Cache in CI). Jeder Eintrag hat die volle Schema-Struktur; `source: manual`.

### 4. Aggregator + Diff (`scripts/tech-debt/run.mjs`)

- Führt alle Detektoren aus, lädt YAML-Katalog, validiert, mergt (deterministische IDs: automatisierte via `hash(rule+file+line)`, manuelle via Slug).
- Vergleicht mit `test-report/tech-debt.prev.json` → produziert `diff.json` (neu / behoben / geändert).
- Priorisiert per gefordertem Ranking (Security → Datenverlust → offene privilegierte Endpoints → RBAC → Backup → funktional → Stabilität → Architektur → Performance → Doku → Kosmetik).
- Schreibt:
  - `test-report/tech-debt.json` (maschinenlesbar)
  - `test-report/tech-debt.md` (kompletter Bericht, gruppiert nach Kategorie)
  - `test-report/tech-debt-summary.md` (Management-Zusammenfassung: Top-10, Delta zum Vorlauf, Trend-Zeile)
  - `test-report/tech-debt-actions.md` (sortierte Maßnahmenliste)

### 5. CI-Integration (`.github/workflows/ci.yml`)

- Neuer Step `bun run test:tech-debt` **nach** `test:coverage` (braucht coverage-summary).
- Non-failing (Trend-Metrik, kein Gate) — Ausnahme: **Critical**-Funde failen (dokumentiert im Handbuch).
- Vor-Report wird als Actions-Cache-Key `tech-debt-${branch}` persistiert → echter Diff über Runs.
- Alle vier Report-Dateien als Artefakt.

### 6. Handbuch + ADR

- Neues Kapitel `tech-debt` in `src/lib/help-documentation.ts` (Kategorie "Qualitätssicherung"): Analyseverfahren, was **nicht** automatisch geprüft wird und warum, wie der Manual-Katalog gepflegt wird, wie Critical-Gate funktioniert.
- **ADR-0010 „Technical-Debt-Hybrid-Ansatz"**: dokumentiert die Trennung Automatik/Manual und die bewusst nicht automatisierten Prüfpunkte.
- `DOCUMENTATION_VERSION` → 1.8.0, `CHANGELOG.md` v1.29.0.

## Was NICHT im Umfang ist (bewusst)

- Kein Auto-Fix (`--fix`) — Debt-Findings brauchen menschliches Urteil.
- Kein Dashboard-UI für Findings (Report bleibt CI-Artefakt; falls gewünscht später separater Prompt).
- Keine Integration in Security-Scan (bleibt getrennt: Security = harter Gate, Debt = Trend).
- Kein AST-basierter „Verantwortlichkeiten"-Detektor — zu viele False Positives; im Manual-Katalog abgebildet.

## Technische Details

- **Neue devDependencies**: `madge`, `knip`, `js-yaml` (klein, alle Worker-agnostisch, nur CI/lokal).
- **ID-Stabilität**: automatisierte IDs = `td-<detector>-<sha1(path+rule+lineHash)[:8]>` → über Runs stabil, sodass Diff funktioniert.
- **Ownership-Feld** (Prompt: „unklare Ownership") wird optional aus `CODEOWNERS` gelesen, falls vorhanden — sonst leer, nicht erfunden.
- **Performance**: alle Detektoren laufen parallel via `Promise.all`; Zielwert < 15 s auf CI.

## Offene Frage (falls du sie anders siehst — sonst setze ich die default)

Default: **Critical-Funde failen CI**, alles andere ist reine Trend-Metrik. Alternative: alles non-failing (nur Report). Ich nehme Default, wenn du nichts anderes sagst.
