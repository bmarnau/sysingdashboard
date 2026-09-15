# Golden Dataset Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task. Apply test-driven-development to every product change and verification-before-completion before any PASS/DONE claim.

**Goal:** Den in `docs/GOLDEN-DATASET-STRATEGY.md` festgelegten Golden Dataset V1 als versionierte, vollständig synthetische und deterministische Referenzbasis implementieren und ab BSF-03A als reproduzierbares Regression-/Abnahme-Gate nutzen.

**Architecture:** Der Golden Dataset lebt als providerneutraler Fixture-Vertrag unter `docs/examples/golden-dataset/v1/`. Ein kleiner TypeScript-Vertrag und ein eigenständiger Validator prüfen Schema, Referenzen und feste Expected Results. Produktionsadapter erzeugen die Expected Results niemals selbst. BSF-03A konsumiert dieselben Fixtures in seinen Fachtests; KIOSK-02 und spätere Sprints ergänzen nur additive Expected-Result-Verträge.

**Tech Stack:** TypeScript, Bun, Vitest, JSON-Fixtures, GitHub Actions. React/TanStack/Supabase werden ausschließlich in den konsumierenden Fachsprints verwendet.

**Spec:** `docs/GOLDEN-DATASET-STRATEGY.md`, Issue #142.

## Global Constraints

- GitHub ist Source of Truth.
- KIOSK-01 wird durch GDS-01 nicht rückwirkend erweitert oder blockiert.
- Golden Dataset V1 beginnt fachlich mit BSF-03A / #106.
- Ausschließlich synthetische Daten; keine produktiven Namen, IDs, E-Mails, Hostnamen, IPs, Tokens, Secrets oder Cookies.
- `schemaVersion = sysing.golden.v1` und `datasetVersion = 1.0.0`.
- Feste Referenzzeit `2026-09-14T00:00:00Z`.
- Keine Zufallswerte und keine Abhängigkeit vom aktuellen Datum.
- Expected Results werden explizit gepflegt und nie durch dieselbe Produktionsimplementierung erzeugt, die geprüft wird.
- Ein Golden-Testfehler darf Expected Results niemals automatisch aktualisieren.
- Providerneutral: keine Supabase-internen oder Azure-spezifischen Identitäten im Fachvertrag.
- `(systemhouseId, customerId)` bleibt fachlicher Customer-Scope.
- Negative Cross-Scope-Fixtures bleiben von positiven Expected Results getrennt.
- Keine produktive DB-Migration oder Runtime-Datenhaltung allein für GDS-01.
- Kein Merge/Deploy ohne bestehende Sprint-Governance.

---

## Task 1: Golden-Dataset-Vertrag und Validator TDD

**Files:**

- Create: `src/lib/golden-dataset/golden-dataset-contract.ts`
- Create: `src/__tests__/lib/golden-dataset-contract.test.ts`
- Create: `scripts/golden-dataset/check.mjs`

**Vertrag:**

```text
GOLDEN_SCHEMA_VERSION = sysing.golden.v1
GOLDEN_DATASET_VERSION = 1.0.0
GOLDEN_REFERENCE_TIME = 2026-09-14T00:00:00Z

GoldenManifest:
  schemaVersion
  datasetVersion
  synthetic = true
  referenceTime
  files[]

GoldenSummary:
  activities
  customers
  projects
  workPackages
  totalHours
  billableHours
  nonBillableHours
  billableQuotePercent
```

- [ ] Roten Contract-Test schreiben: V1-Konstanten müssen exakt den oben genannten Werten entsprechen.
- [ ] Roten Test schreiben: `synthetic=false` wird mit `golden_dataset_must_be_synthetic` abgewiesen.
- [ ] Roten Test schreiben: falsche Schema-/Dataset-Version und dynamische Referenzzeit werden abgewiesen.
- [ ] RED mit `bunx vitest run src/__tests__/lib/golden-dataset-contract.test.ts` nachweisen.
- [ ] Minimalen TypeScript-Vertrag implementieren.
- [ ] Validator `scripts/golden-dataset/check.mjs` implementieren.
- [ ] Validator prüft Manifest, Dateiexistenz, ID-Eindeutigkeit und alle positiven Referenzen.
- [ ] Validator kennt den absichtlich unbekannten Kategorie-Key `unknown-golden-category` als erwarteten Unknown-Fall und remappt ihn nicht.
- [ ] GREEN für Contract-Test nachweisen.

**Commit-Ziel:** `test(golden): define dataset contract`

---

## Task 2: Golden Dataset V1 mit festen Fachobjekten

**Files:**

- Create: `docs/examples/golden-dataset/v1/manifest.json`
- Create: `docs/examples/golden-dataset/v1/systemhouse.json`
- Create: `docs/examples/golden-dataset/v1/customers.json`
- Create: `docs/examples/golden-dataset/v1/projects.json`
- Create: `docs/examples/golden-dataset/v1/work-packages.json`
- Create: `docs/examples/golden-dataset/v1/activities.json`
- Create: `docs/examples/golden-dataset/v1/reference-data.json`
- Create: `docs/examples/golden-dataset/v1/kiosk.json`

**Manifest:**

```text
schemaVersion: sysing.golden.v1
datasetVersion: 1.0.0
synthetic: true
referenceTime: 2026-09-14T00:00:00Z
files:
  systemhouse.json
  customers.json
  projects.json
  work-packages.json
  activities.json
  reference-data.json
  kiosk.json
  expected/project-controlling.json
  expected/kiosk-summary.json
```

**Positive Identitäten:**

```text
golden-systemhouse-01

golden-customer-a -> golden-systemhouse-01
golden-customer-b -> golden-systemhouse-01

golden-project-a1 -> customer A
golden-project-a2 -> customer A
golden-project-b1 -> customer B
```

**Reference Data:**

```text
regelbetrieb -> aktiv
stoerung -> aktiv
legacy-alt -> inaktiv
unknown-golden-category -> absichtlich NICHT im Katalog
```

**WorkPackages:**

```text
golden-wp-a1 -> project A1 -> categoryObserved=true  -> regelbetrieb
golden-wp-a2 -> project A1 -> categoryObserved=true  -> null
golden-wp-a3 -> project A2 -> categoryObserved=true  -> legacy-alt
golden-wp-a4 -> project A2 -> categoryObserved=false -> null
golden-wp-b1 -> project B1 -> categoryObserved=true  -> unknown-golden-category
```

**Activities:**

```text
golden-act-01 | 2026-09-01 | A | A1 | A1 | 4.0 h | billable     | offen
golden-act-02 | 2026-09-01 | A | A1 | A1 | 2.0 h | non-billable | nicht_abrechenbar
golden-act-03 | 2026-09-02 | A | A1 | A2 | 3.0 h | billable     | offen
golden-act-04 | 2026-09-03 | A | A2 | A3 | 1.0 h | non-billable | nicht_abrechenbar
golden-act-05 | 2026-09-01 | B | B1 | B1 | 5.0 h | billable     | offen
golden-act-06 | 2026-09-04 | B | B1 | B1 | 2.0 h | non-billable | nicht_abrechenbar
golden-act-07 | 2026-09-04 | B | B1 | B1 | 3.0 h | billable     | abgerechnet
golden-act-08 | 2026-09-05 | A | A2 | A4 | 5.0 h | billable     | offen
```

- [ ] Alle Dateien mit exakt diesen stabilen IDs und Beziehungen anlegen.
- [ ] Keine Personenidentität in V1 einführen; Personensicht bleibt BSF-03E.
- [ ] `bun scripts/golden-dataset/check.mjs` ausführen.
- [ ] Erwartete Ausgabe: `Golden Dataset V1: PASS`.

**Commit-Ziel:** `test(golden): add deterministic v1 fixtures`

---

## Task 3: Expected Results unabhängig festschreiben

**Files:**

- Create: `docs/examples/golden-dataset/v1/expected/project-controlling.json`
- Create: `docs/examples/golden-dataset/v1/expected/kiosk-summary.json`
- Create: `src/__tests__/lib/golden-dataset-expected.test.ts`

**Verbindliche Gesamtwerte:**

```text
activities = 8
customers = 2
projects = 3
workPackages = 5
totalHours = 25.0
billableHours = 20.0
nonBillableHours = 5.0
billableQuotePercent = 80.0
```

**Verbindliche Teilmengen:**

```text
Customer A -> 5 activities / 15.0 total / 12.0 billable / 3.0 non-billable / 80.0 %
Customer B -> 3 activities / 10.0 total / 8.0 billable / 2.0 non-billable / 80.0 %
Billable only -> 5 activities / 20.0 h
Non-billable only -> 3 activities / 5.0 h
regelbetrieb -> 2 activities / 6.0 total / 4.0 billable / 2.0 non-billable
none -> 1 activity / 3.0 h
inactive -> 1 activity / 1.0 h
legacy-not-observed -> 1 activity / 5.0 h
unknown -> 3 activities / 10.0 h
```

**Verbindlicher Tagestrend:**

```text
2026-09-01 -> 11.0 total / 9.0 billable / 2.0 non-billable
2026-09-02 -> 3.0 total / 3.0 billable / 0.0 non-billable
2026-09-03 -> 1.0 total / 0.0 billable / 1.0 non-billable
2026-09-04 -> 5.0 total / 3.0 billable / 2.0 non-billable
2026-09-05 -> 5.0 total / 5.0 billable / 0.0 non-billable
```

**Kiosk Expected Result für vergleichbare Domänen:**

```text
period = 2026-09-01..2026-09-05
projectsWithActivity = 3
workPackagesWithActivity = 5
activityHours = 25.0
billableQuotePercent = 80.0
```

- [ ] `expected/project-controlling.json` mit Gesamt-, Customer-, Billable-, Kategorie-, Projekt-, AP-, Trend- und Drill-down-Fällen anlegen.
- [ ] `expected/kiosk-summary.json` nur mit fachlich ableitbaren Leistungsdomänen anlegen.
- [ ] Availability, Infrastructure und Support nicht aus BSF-03A-Daten erfinden.
- [ ] Unabhängigen Test schreiben, der JSON-Fixtures mit einfacher Testarithmetik prüft und keinen Produktionsaggregator importiert.
- [ ] `bunx vitest run src/__tests__/lib/golden-dataset-expected.test.ts` PASS nachweisen.
- [ ] Golden-Validator erneut PASS nachweisen.

**Commit-Ziel:** `test(golden): lock expected business results`

---

## Task 4: Negative Scope- und Integritätsfixtures

**Files:**

- Create: `docs/examples/golden-dataset/v1/negative/cross-systemhouse.json`
- Create: `docs/examples/golden-dataset/v1/negative/cross-customer.json`
- Create: `docs/examples/golden-dataset/v1/negative/invalid-relations.json`
- Modify: `src/__tests__/lib/golden-dataset-contract.test.ts`

**Negative Identitäten und Fehlercodes:**

```text
golden-systemhouse-foreign
golden-customer-foreign

golden_cross_customer_relation
golden_project_reference_missing
golden_workpackage_reference_missing
golden_duplicate_id
```

- [ ] Cross-Systemhouse-Fixture mit separatem fremdem Systemhouse und Customer anlegen.
- [ ] Cross-Customer-Fixture: Activity behauptet Customer B, referenziert aber Project A1; Validator muss geschlossen ablehnen.
- [ ] Invalid-Relations-Fixture: unbekanntes Project, unbekanntes WorkPackage und doppelte Activity-ID abdecken.
- [ ] Positive Expected Results dürfen keine negativen Fixture-Objekte enthalten.
- [ ] Contract-/Validator-Tests für alle stabilen Fehlercodes GREEN nachweisen.

**Commit-Ziel:** `test(golden): add negative scope fixtures`

---

## Task 5: BSF-03A gegen Golden Expected Results prüfen

**Files:**

- Modify: `src/__tests__/lib/project-controlling.test.ts`
- Modify: `docs/BSF-03A-DESIGN.md`
- Modify: `docs/LOVABLE-PROMPT-PLAN-BSF-03A.md`

**Golden-Controlling-Gate:**

```text
all -> 25.0 / 20.0 / 5.0 / 80.0 %
customer A -> 15.0 / 12.0 / 3.0 / 80.0 %
customer B -> 10.0 / 8.0 / 2.0 / 80.0 %
billable only -> 20.0 h / 5 activities
non-billable only -> 5.0 h / 3 activities
regelbetrieb -> 6.0 h
none -> 3.0 h
inactive -> 1.0 h
legacy-not-observed -> 5.0 h
unknown -> 10.0 h
```

- [ ] Roten Test ergänzen, der Golden V1 über einen Testadapter auf den providerneutralen BSF-03A-Eingabevertrag mappt.
- [ ] RED gegen die noch unvollständige Produktionsaggregation nachweisen.
- [ ] Nur Produktionscode korrigieren, der dem bereits freigegebenen Fachvertrag widerspricht.
- [ ] Golden Expected Results unverändert lassen, außer ein separates fachliches Review weist einen Fixture-Fehler nach.
- [ ] Golden Validator, unabhängigen Expected-Test und Project-Controlling-Test gemeinsam GREEN nachweisen.
- [ ] BSF-03A-Abschlussbericht nennt Schema- und Dataset-Version.

**Commit-Ziel:** `test(controlling): verify golden business results`

---

## Task 6: KIOSK-01-Kompatibilität bewahren und KIOSK-02 anbinden

**Files:**

- Modify: `docs/BSF-KIOSK-02-DESIGN.md`
- Modify: `src/__tests__/lib/internal-kiosk-snapshot.test.ts`
- Modify: `src/__tests__/lib/internal-kiosk-provider.test.ts`
- Do not modify solely for Golden alignment: `docs/examples/kiosk-demo-dataset-v1.json`

**Vergleichbare KIOSK-02-Golden-Werte:**

```text
projectsWithActivity = 3
workPackagesWithActivity = 5
activityHours = 25.0
billableQuotePercent = 80.0
```

- [ ] Mapper-Test aus `internal-kiosk-snapshot.test.ts` gegen diese Golden-Werte erweitern.
- [ ] Provider-Test bestätigt, dass interne Leistungskennzahlen dieselbe Fachdefinition verwenden.
- [ ] Availability, Infrastructure und Support bleiben Demo oder unavailable, solange keine belastbare interne Quelle existiert.
- [ ] Kein interner Fehler darf Golden-/Demo-Werte als stillen Ersatz einsetzen.
- [ ] Bestehenden KIOSK-01-Demo-Vertrag unverändert regressieren.

**Commit-Ziel:** `test(kiosk): align internal metrics with golden reference`

---

## Task 7: Golden Dataset als CI-Gate aktivieren

**Files:**

- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/PROJECT-STATUS.yaml`
- Modify: `docs/ENTWICKLUNGSTAGEBUCH.md`

**Package-Script:**

```text
golden-dataset:check -> bun scripts/golden-dataset/check.mjs
```

- [ ] `golden-dataset:check` in `package.json` ergänzen.
- [ ] CI im Static-/Contract-Block um `bun run golden-dataset:check` ergänzen.
- [ ] Fehler blockieren CI; es gibt keine automatische Fixture-Aktualisierung.
- [ ] `docs/PROJECT-STATUS.yaml` um Architekturprinzip `golden-reference` und GDS-01/#142 ergänzen.
- [ ] BSF-03A-Exitkriterium im Manifest um Golden-V1-Regression ergänzen.
- [ ] Produktversion allein wegen Test-/Planungsdaten nicht erhöhen.
- [ ] Entwicklungstagebuch um Issue #142, Schema/Dataset-Version, Referenzzeit und Kernsummary ergänzen.
- [ ] Mindestens `golden-dataset:check`, `project-status:check`, `docs:check`, `typecheck` und `lint` lokal/CI nachweisen.
- [ ] Danach Security und vollständige GitHub-CI auf demselben Exact Head PASS nachweisen.

**Commit-Ziel:** `ci(golden): enforce reference dataset contract`

---

## Task 8: Sprint-Governance und spätere Erweiterungen

**Files:**

- Modify: `docs/BSF-CURRENT-PRIORITIES.md`
- Modify: `docs/SPRINT-PLAN-MVP-BSF.md`
- Modify: jeweilige Closure-Dokumente der konsumierenden Sprints

- [ ] BSF-03A: Golden V1 ist Pflicht-Gate für Aggregation, Filter, Trend und Drill-down.
- [ ] KIOSK-02: vergleichbare KPIs teilen dieselbe Golden-Fachdefinition; kein zweiter KPI-Vertrag.
- [ ] BSF-03B: `expected/performance-statement.json` additiv ergänzen.
- [ ] BSF-05A: Canonical Import muss Golden V1 ohne semantischen Drift reproduzieren.
- [ ] BSF-09: Reporting um `expected/reporting.json` erweitern.
- [ ] BSF-FINAL-INTERNAL: vollständige Golden-Regression als formales internes Gate verlangen.
- [ ] Jede Closure nennt die verwendete Golden-Dataset-Version.

**Abschlussbericht GDS-01 V1:**

```text
GOLDEN_SCHEMA_VERSION = sysing.golden.v1
GOLDEN_DATASET_VERSION = 1.0.0
REFERENCE_TIME = 2026-09-14T00:00:00Z
SYNTHETIC_ONLY = JA
TOTAL_HOURS = 25.0
BILLABLE_HOURS = 20.0
NON_BILLABLE_HOURS = 5.0
BILLABLE_QUOTE = 80.0
GOLDEN_CHECK = PASS
PROJECT_CONTROLLING_GOLDEN = PASS
KIOSK01_COMPATIBILITY = PASS
SECURITY = PASS
FULL_CI = PASS
DB_CHANGED = NEIN, sofern nur Foundation/Tests
MERGE = NEIN bis separate Freigabe
DEPLOY = NEIN
```

**Commit-Ziel:** `docs(golden): bind reference data to sprint governance`

---

## Self-Review

### Spec coverage

- vollständig synthetisch: Tasks 1 bis 4
- versioniert und deterministisch: Tasks 1 bis 3
- feste IDs und Zeiten: Task 2
- unabhängige Expected Results: Task 3
- Kategorie-/Unknown-/Legacy-Fälle: Tasks 2 und 3
- Cross-Scope-Negativfälle: Task 4
- BSF-03A-Integration: Task 5
- KIOSK-01 unverändert / KIOSK-02-Anschluss: Task 6
- CI-Gate: Task 7
- BSF-03B/05A/09/FINAL-Erweiterungen: Task 8
- keine produktive DB-/Providerabhängigkeit: Global Constraints

### Type consistency

```text
schemaVersion = sysing.golden.v1
datasetVersion = 1.0.0
referenceTime = 2026-09-14T00:00:00Z
activities = 8
customers = 2
projects = 3
workPackages = 5
totalHours = 25.0
billableHours = 20.0
nonBillableHours = 5.0
billableQuotePercent = 80.0
```

### Execution Handoff

Die Foundation wird **nicht vor KIOSK-01 FINAL PASS** als neuer Fachsprint gestartet. Nach formaler KIOSK-01-Endabnahme wird GDS-01 V1 als erster Test-/Referenzbaustein innerhalb von BSF-03A umgesetzt; danach folgt der bestehende BSF-03A-Plan.
