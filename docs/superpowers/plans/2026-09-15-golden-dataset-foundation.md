# Golden Dataset Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den in `docs/GOLDEN-DATASET-STRATEGY.md` festgelegten Golden Dataset V1 als versionierte, vollständig synthetische und deterministische Referenzbasis implementieren und ab BSF-03A als reproduzierbares Regression-/Abnahme-Gate nutzen.

**Architecture:** Der Golden Dataset lebt als providerneutraler, versionierter Fixture-Vertrag unter `docs/examples/golden-dataset/v1/`. Ein kleiner TypeScript-Vertrag und ein eigenständiger Validator prüfen Schema, Referenzen und feste Expected Results; Produktionsadapter erzeugen die Expected Results niemals selbst. BSF-03A konsumiert dieselben Fixtures in seinen Fachtests, KIOSK-02 und spätere Sprints erweitern ausschließlich additive Expected-Result-Verträge.

**Tech Stack:** TypeScript 5.9, Bun, Vitest, JSON-Fixtures, bestehende GitHub-Actions-CI, React/TanStack/Supabase nur in den jeweils konsumierenden Sprints.

**Spec:** `docs/GOLDEN-DATASET-STRATEGY.md`, Issue #142

## Global Constraints

- GitHub ist Source of Truth.
- KIOSK-01 wird durch GDS-01 nicht rückwirkend erweitert oder blockiert.
- Umsetzung von Golden Dataset V1 beginnt fachlich mit BSF-03A / #106.
- Ausschließlich synthetische Daten; keine produktiven Namen, IDs, E-Mails, Hostnamen, IPs, Tokens, Secrets oder Cookies.
- `schemaVersion = "sysing.golden.v1"` und `datasetVersion = "1.0.0"` für V1.
- Feste Referenzzeit: `2026-09-14T00:00:00Z`.
- Keine Zufallswerte und keine Abhängigkeit von `Date.now()`/`new Date()` ohne injizierte Referenzzeit.
- Expected Results werden explizit als Fixture gepflegt und nie durch dieselbe Produktionsimplementierung erzeugt, die geprüft wird.
- Ein Golden-Testfehler darf Expected Results niemals automatisch aktualisieren.
- Providerneutral: keine Supabase-UUIDs, SQL-internen IDs oder Azure-spezifischen Identitäten im Golden-Fachvertrag.
- `(systemhouseId, customerId)` bleibt fachlicher Customer-Scope.
- Negative Cross-Scope-Fixtures bleiben von positiven Expected Results getrennt.
- Keine produktive DB-Migration oder Runtime-Datenhaltung allein für GDS-01.
- Kein Merge/Deploy ohne die bestehende Sprint-Governance.

---

### Task 1: Golden-Dataset-Vertrag und Manifest-Validator

**Files:**
- Create: `src/lib/golden-dataset/golden-dataset-contract.ts`
- Create: `src/__tests__/lib/golden-dataset-contract.test.ts`
- Create: `scripts/golden-dataset/check.mjs`

**Interfaces:**
- Produces: `GOLDEN_SCHEMA_VERSION`, `GOLDEN_DATASET_VERSION`, `GOLDEN_REFERENCE_TIME`, `GoldenManifest`, `GoldenSummary`, `assertGoldenManifest()`.
- Consumes: noch keine Produktionslogik.

- [ ] **Step 1: RED-Vertragstest schreiben**

```ts
import { describe, expect, it } from "vitest";
import {
  GOLDEN_DATASET_VERSION,
  GOLDEN_REFERENCE_TIME,
  GOLDEN_SCHEMA_VERSION,
  assertGoldenManifest,
} from "@/lib/golden-dataset/golden-dataset-contract";

describe("golden dataset contract", () => {
  it("fixiert V1-Schema, Version und Referenzzeit", () => {
    expect(GOLDEN_SCHEMA_VERSION).toBe("sysing.golden.v1");
    expect(GOLDEN_DATASET_VERSION).toBe("1.0.0");
    expect(GOLDEN_REFERENCE_TIME).toBe("2026-09-14T00:00:00Z");
  });

  it("akzeptiert nur ein synthetisches V1-Manifest", () => {
    expect(() =>
      assertGoldenManifest({
        schemaVersion: "sysing.golden.v1",
        datasetVersion: "1.0.0",
        synthetic: true,
        referenceTime: "2026-09-14T00:00:00Z",
        files: ["systemhouse.json"],
      }),
    ).not.toThrow();

    expect(() =>
      assertGoldenManifest({
        schemaVersion: "sysing.golden.v1",
        datasetVersion: "1.0.0",
        synthetic: false,
        referenceTime: "2026-09-14T00:00:00Z",
        files: ["systemhouse.json"],
      }),
    ).toThrow("golden_dataset_must_be_synthetic");
  });
});
```

- [ ] **Step 2: RED nachweisen**

Run:

```bash
bunx vitest run src/__tests__/lib/golden-dataset-contract.test.ts
```

Expected: FAIL mit fehlendem Modul `@/lib/golden-dataset/golden-dataset-contract`.

- [ ] **Step 3: Minimalen Vertrag implementieren**

```ts
export const GOLDEN_SCHEMA_VERSION = "sysing.golden.v1" as const;
export const GOLDEN_DATASET_VERSION = "1.0.0" as const;
export const GOLDEN_REFERENCE_TIME = "2026-09-14T00:00:00Z" as const;

export interface GoldenManifest {
  schemaVersion: typeof GOLDEN_SCHEMA_VERSION;
  datasetVersion: typeof GOLDEN_DATASET_VERSION;
  synthetic: true;
  referenceTime: typeof GOLDEN_REFERENCE_TIME;
  files: string[];
}

export interface GoldenSummary {
  activities: number;
  customers: number;
  projects: number;
  workPackages: number;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billableQuotePercent: number;
}

export function assertGoldenManifest(value: unknown): asserts value is GoldenManifest {
  if (!value || typeof value !== "object") throw new Error("golden_manifest_invalid");
  const manifest = value as Record<string, unknown>;
  if (manifest.schemaVersion !== GOLDEN_SCHEMA_VERSION) throw new Error("golden_schema_version_invalid");
  if (manifest.datasetVersion !== GOLDEN_DATASET_VERSION) throw new Error("golden_dataset_version_invalid");
  if (manifest.synthetic !== true) throw new Error("golden_dataset_must_be_synthetic");
  if (manifest.referenceTime !== GOLDEN_REFERENCE_TIME) throw new Error("golden_reference_time_invalid");
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) throw new Error("golden_files_missing");
}
```

- [ ] **Step 4: GREEN nachweisen**

Run:

```bash
bunx vitest run src/__tests__/lib/golden-dataset-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: CLI-Validator anlegen**

`scripts/golden-dataset/check.mjs` muss:

1. `docs/examples/golden-dataset/v1/manifest.json` lesen,
2. exakt `sysing.golden.v1`, `1.0.0`, `synthetic=true`, `2026-09-14T00:00:00Z` prüfen,
3. jede im Manifest genannte Datei auf Existenz prüfen,
4. alle IDs innerhalb ihres Objekttyps auf Eindeutigkeit prüfen,
5. Customer -> Systemhouse, Project -> Customer, WorkPackage -> Project und Activity -> WorkPackage referenziell prüfen,
6. `unknown-golden-category` ausdrücklich als nicht im Reference-Data-Katalog vorhanden akzeptieren,
7. alle anderen beobachteten Kategorie-Keys gegen `reference-data.json` prüfen,
8. bei Fehler mit Exit-Code 1 und stabilem Fehlercode abbrechen.

Der Validator darf keine fachlichen Expected Results neu schreiben.

- [ ] **Step 6: Commit**

```bash
git add src/lib/golden-dataset/golden-dataset-contract.ts src/__tests__/lib/golden-dataset-contract.test.ts scripts/golden-dataset/check.mjs
git commit -m "test(golden): define dataset contract"
```

---

### Task 2: Golden Dataset V1 mit festen Fachobjekten

**Files:**
- Create: `docs/examples/golden-dataset/v1/manifest.json`
- Create: `docs/examples/golden-dataset/v1/systemhouse.json`
- Create: `docs/examples/golden-dataset/v1/customers.json`
- Create: `docs/examples/golden-dataset/v1/projects.json`
- Create: `docs/examples/golden-dataset/v1/work-packages.json`
- Create: `docs/examples/golden-dataset/v1/activities.json`
- Create: `docs/examples/golden-dataset/v1/reference-data.json`
- Create: `docs/examples/golden-dataset/v1/kiosk.json`

**Interfaces:**
- Consumes: Vertrag aus Task 1.
- Produces: stabile positive V1-Fixtures für BSF-03A und spätere Verbraucher.

- [ ] **Step 1: Manifest anlegen**

```json
{
  "schemaVersion": "sysing.golden.v1",
  "datasetVersion": "1.0.0",
  "synthetic": true,
  "referenceTime": "2026-09-14T00:00:00Z",
  "files": [
    "systemhouse.json",
    "customers.json",
    "projects.json",
    "work-packages.json",
    "activities.json",
    "reference-data.json",
    "kiosk.json",
    "expected/project-controlling.json",
    "expected/kiosk-summary.json"
  ]
}
```

- [ ] **Step 2: Systemhouse und Kunden anlegen**

`systemhouse.json`:

```json
[
  { "id": "golden-systemhouse-01", "name": "Golden Systemhaus GmbH" }
]
```

`customers.json`:

```json
[
  { "id": "golden-customer-a", "systemhouseId": "golden-systemhouse-01", "name": "Beispielkunde Alpha GmbH", "active": true },
  { "id": "golden-customer-b", "systemhouseId": "golden-systemhouse-01", "name": "Beispielkunde Beta GmbH", "active": true }
]
```

- [ ] **Step 3: Projekte anlegen**

```json
[
  { "id": "golden-project-a1", "systemhouseId": "golden-systemhouse-01", "customerId": "golden-customer-a", "name": "Alpha Betrieb", "status": "on_track" },
  { "id": "golden-project-a2", "systemhouseId": "golden-systemhouse-01", "customerId": "golden-customer-a", "name": "Alpha Modernisierung", "status": "at_risk" },
  { "id": "golden-project-b1", "systemhouseId": "golden-systemhouse-01", "customerId": "golden-customer-b", "name": "Beta Infrastruktur", "status": "on_track" }
]
```

- [ ] **Step 4: Reference Data anlegen**

```json
{
  "catalog": "workpackage.category",
  "values": [
    { "key": "regelbetrieb", "label": "Regelbetrieb", "active": true },
    { "key": "stoerung", "label": "Störung", "active": true },
    { "key": "legacy-alt", "label": "Historische Kategorie", "active": false }
  ]
}
```

- [ ] **Step 5: Fünf Arbeitspakete anlegen**

```json
[
  { "id": "golden-wp-a1", "systemhouseId": "golden-systemhouse-01", "customerId": "golden-customer-a", "projectId": "golden-project-a1", "title": "Regelbetrieb", "status": "in_arbeit", "priority": "mittel", "categoryObserved": true, "categoryKey": "regelbetrieb" },
  { "id": "golden-wp-a2", "systemhouseId": "golden-systemhouse-01", "customerId": "golden-customer-a", "projectId": "golden-project-a1", "title": "Ohne Kategorie", "status": "offen", "priority": "niedrig", "categoryObserved": true, "categoryKey": null },
  { "id": "golden-wp-a3", "systemhouseId": "golden-systemhouse-01", "customerId": "golden-customer-a", "projectId": "golden-project-a2", "title": "Historischer Bestand", "status": "wartend", "priority": "mittel", "categoryObserved": true, "categoryKey": "legacy-alt" },
  { "id": "golden-wp-a4", "systemhouseId": "golden-systemhouse-01", "customerId": "golden-customer-a", "projectId": "golden-project-a2", "title": "Legacy ohne Beobachtung", "status": "in_arbeit", "priority": "hoch", "categoryObserved": false, "categoryKey": null },
  { "id": "golden-wp-b1", "systemhouseId": "golden-systemhouse-01", "customerId": "golden-customer-b", "projectId": "golden-project-b1", "title": "Unbekannte Kategorie", "status": "in_arbeit", "priority": "hoch", "categoryObserved": true, "categoryKey": "unknown-golden-category" }
]
```

- [ ] **Step 6: Acht Tätigkeiten mit festen Werten anlegen**

```json
[
  { "id": "golden-act-01", "systemhouseId": "golden-systemhouse-01", "customerId": "golden-customer-a", "projectId": "golden-project-a1", "workPackageId": "golden-wp-a1", "title": "Betriebsprüfung", "date": "2026-09-01", "durationHours": 4.0, "billable": true, "billingStatus": "offen" },
  { "id": "golden-act-02", "systemhouseId": "golden-systemhouse-01", "customerId": "golden-customer-a", "projectId": "golden-project-a1", "workPackageId": "golden-wp-a1", "title": "Interne Dokumentation", "date": "2026-09-01", "durationHours": 2.0, "billable": false, "billingStatus": "nicht_abrechenbar" },
  { "id": "golden-act-03", "systemhouseId": "golden-systemhouse-01", "customerId": "golden-customer-a", "projectId": "golden-project-a1", "workPackageId": "golden-wp-a2", "title": "Analyse", "date": "2026-09-02", "durationHours": 3.0, "billable": true, "billingStatus": "offen" },
  { "id": "golden-act-04", "systemhouseId": "golden-systemhouse-01", "customerId": "golden-customer-a", "projectId": "golden-project-a2", "workPackageId": "golden-wp-a3", "title": "Historienpflege", "date": "2026-09-03", "durationHours": 1.0, "billable": false, "billingStatus": "nicht_abrechenbar" },
  { "id": "golden-act-05", "systemhouseId": "golden-systemhouse-01", "customerId": "golden-customer-b", "projectId": "golden-project-b1", "workPackageId": "golden-wp-b1", "title": "Infrastrukturprüfung", "date": "2026-09-01", "durationHours": 5.0, "billable": true, "billingStatus": "offen" },
  { "id": "golden-act-06", "systemhouseId": "golden-systemhouse-01", "customerId": "golden-customer-b", "projectId": "golden-project-b1", "workPackageId": "golden-wp-b1", "title": "Interne Nacharbeit", "date": "2026-09-04", "durationHours": 2.0, "billable": false, "billingStatus": "nicht_abrechenbar" },
  { "id": "golden-act-07", "systemhouseId": "golden-systemhouse-01", "customerId": "golden-customer-b", "projectId": "golden-project-b1", "workPackageId": "golden-wp-b1", "title": "Umsetzung", "date": "2026-09-04", "durationHours": 3.0, "billable": true, "billingStatus": "abgerechnet" },
  { "id": "golden-act-08", "systemhouseId": "golden-systemhouse-01", "customerId": "golden-customer-a", "projectId": "golden-project-a2", "workPackageId": "golden-wp-a4", "title": "Legacy-Prüfung", "date": "2026-09-05", "durationHours": 5.0, "billable": true, "billingStatus": "offen" }
]
```

- [ ] **Step 7: Validator ausführen**

Run:

```bash
bun scripts/golden-dataset/check.mjs
```

Expected: PASS und Ausgabe `Golden Dataset V1: PASS`.

- [ ] **Step 8: Commit**

```bash
git add docs/examples/golden-dataset/v1
git commit -m "test(golden): add deterministic v1 fixtures"
```

---

### Task 3: Expected Results unabhängig festschreiben

**Files:**
- Create: `docs/examples/golden-dataset/v1/expected/project-controlling.json`
- Create: `docs/examples/golden-dataset/v1/expected/kiosk-summary.json`
- Create: `src/__tests__/lib/golden-dataset-expected.test.ts`

**Interfaces:**
- Consumes: V1-Fixtures aus Task 2.
- Produces: unabhängige, feste BSF-03A-/Kiosk-Erwartungswerte.

- [ ] **Step 1: Controlling Expected Results anlegen**

Mindestens folgende Werte sind verbindlich:

```json
{
  "all": {
    "activities": 8,
    "customers": 2,
    "projects": 3,
    "workPackages": 5,
    "totalHours": 25.0,
    "billableHours": 20.0,
    "nonBillableHours": 5.0,
    "billableQuotePercent": 80.0
  },
  "customerA": { "activities": 5, "totalHours": 15.0, "billableHours": 12.0, "nonBillableHours": 3.0, "billableQuotePercent": 80.0 },
  "customerB": { "activities": 3, "totalHours": 10.0, "billableHours": 8.0, "nonBillableHours": 2.0, "billableQuotePercent": 80.0 },
  "billableOnly": { "activities": 5, "totalHours": 20.0 },
  "nonBillableOnly": { "activities": 3, "totalHours": 5.0 },
  "categories": {
    "regelbetrieb": { "activities": 2, "totalHours": 6.0, "billableHours": 4.0, "nonBillableHours": 2.0 },
    "none": { "activities": 1, "totalHours": 3.0 },
    "inactive": { "activities": 1, "totalHours": 1.0 },
    "legacyNotObserved": { "activities": 1, "totalHours": 5.0 },
    "unknown": { "activities": 3, "totalHours": 10.0 }
  },
  "trend": [
    { "date": "2026-09-01", "totalHours": 11.0, "billableHours": 9.0, "nonBillableHours": 2.0 },
    { "date": "2026-09-02", "totalHours": 3.0, "billableHours": 3.0, "nonBillableHours": 0.0 },
    { "date": "2026-09-03", "totalHours": 1.0, "billableHours": 0.0, "nonBillableHours": 1.0 },
    { "date": "2026-09-04", "totalHours": 5.0, "billableHours": 3.0, "nonBillableHours": 2.0 },
    { "date": "2026-09-05", "totalHours": 5.0, "billableHours": 5.0, "nonBillableHours": 0.0 }
  ]
}
```

Zusätzlich müssen Project-/WorkPackage-Filter und der Drill-down die oben festgelegten IDs explizit referenzieren.

- [ ] **Step 2: Kiosk Expected Result anlegen**

`expected/kiosk-summary.json` enthält für die aus V1 fachlich ableitbaren Domänen:

```json
{
  "source": "golden-dataset-v1",
  "period": { "from": "2026-09-01", "to": "2026-09-05" },
  "projectsWithActivity": 3,
  "workPackagesWithActivity": 5,
  "activityHours": 25.0,
  "billableQuotePercent": 80.0
}
```

Verfügbarkeit, Infrastruktur und Support sind nicht aus BSF-03A-Fachdaten ableitbar und werden hier nicht erfunden.

- [ ] **Step 3: Unabhängigen Fixture-Arithmetiktest schreiben**

Der Test liest ausschließlich JSON-Fixtures und verwendet einfache Summen-/Filterlogik im Test selbst. Er importiert **nicht** `ProjectControllingService` oder dessen Aggregator.

```ts
it("Golden V1 hat die festgeschriebene Grundsumme", () => {
  const total = activities.reduce((sum, row) => sum + row.durationHours, 0);
  const billable = activities.filter((row) => row.billable).reduce((sum, row) => sum + row.durationHours, 0);
  expect(total).toBe(25);
  expect(billable).toBe(20);
  expect(total - billable).toBe(5);
});
```

- [ ] **Step 4: GREEN nachweisen**

Run:

```bash
bunx vitest run src/__tests__/lib/golden-dataset-expected.test.ts
bun scripts/golden-dataset/check.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/examples/golden-dataset/v1/expected src/__tests__/lib/golden-dataset-expected.test.ts
git commit -m "test(golden): lock expected business results"
```

---

### Task 4: Negative Scope- und Integritätsfixtures

**Files:**
- Create: `docs/examples/golden-dataset/v1/negative/cross-systemhouse.json`
- Create: `docs/examples/golden-dataset/v1/negative/cross-customer.json`
- Create: `docs/examples/golden-dataset/v1/negative/invalid-relations.json`
- Modify: `src/__tests__/lib/golden-dataset-contract.test.ts`

**Interfaces:**
- Produces: stabile Negativfixtures für spätere Adapter-/Securitytests.

- [ ] **Step 1: Cross-Systemhouse-Fixture anlegen**

Enthält einen zweiten synthetischen Scope `golden-systemhouse-foreign` mit Customer `golden-customer-foreign`; keine positive Expected-Result-Datei darf diese Objekte enthalten.

- [ ] **Step 2: Cross-Customer-Fixture anlegen**

Eine Activity deklariert `customerId = golden-customer-b`, referenziert aber `projectId = golden-project-a1`. Der Validator muss mit `golden_cross_customer_relation` fehlschlagen.

- [ ] **Step 3: Invalid-Relations-Fixture anlegen**

Enthält mindestens:

- unbekannte Project-ID,
- unbekannte WorkPackage-ID,
- doppelte Activity-ID.

Erwartete stabile Fehlercodes:

```text
golden_project_reference_missing
golden_workpackage_reference_missing
golden_duplicate_id
```

- [ ] **Step 4: Tests schreiben und GREEN nachweisen**

Run:

```bash
bunx vitest run src/__tests__/lib/golden-dataset-contract.test.ts
```

Expected: PASS; jeder Negativfall wird geschlossen abgewiesen.

- [ ] **Step 5: Commit**

```bash
git add docs/examples/golden-dataset/v1/negative src/__tests__/lib/golden-dataset-contract.test.ts
git commit -m "test(golden): add negative scope fixtures"
```

---

### Task 5: BSF-03A gegen Golden Expected Results prüfen

**Files:**
- Modify: `src/__tests__/lib/project-controlling.test.ts` oder den im BSF-03A-Plan tatsächlich angelegten äquivalenten Fachtest
- Modify: `docs/BSF-03A-DESIGN.md`
- Modify: `docs/LOVABLE-PROMPT-PLAN-BSF-03A.md`

**Interfaces:**
- Consumes: `ProjectControllingService`/providerneutrale Aggregationsfunktion aus BSF-03A und Golden V1.
- Produces: fachlicher Gleichheitsnachweis Produktionslogik vs. unabhängige Expected Results.

- [ ] **Step 1: RED Golden-Controlling-Test hinzufügen**

Der Test lädt Golden V1, mappt die kanonischen Fixture-Felder über einen **Testadapter** auf den providerneutralen BSF-03A-Eingabevertrag und prüft:

```text
all                 -> 25.0 / 20.0 / 5.0 / 80.0 %
customer A          -> 15.0 / 12.0 / 3.0 / 80.0 %
customer B          -> 10.0 / 8.0 / 2.0 / 80.0 %
billable only       -> 20.0 h / 5 activities
non-billable only   -> 5.0 h / 3 activities
regelbetrieb        -> 6.0 h
none                -> 3.0 h
inactive            -> 1.0 h
legacy-not-observed -> 5.0 h
unknown             -> 10.0 h
```

- [ ] **Step 2: RED nachweisen**

Run den gezielten BSF-03A-Fachtest. Expected: FAIL, solange Produktionsaggregation oder Kategorieauflösung die Golden-Fälle noch nicht erfüllt.

- [ ] **Step 3: BSF-03A minimal korrigieren**

Nur Produktionscode ändern, der gegen den bereits freigegebenen BSF-03A-Fachvertrag verstößt. Golden Expected Results bleiben unverändert, außer ein unabhängiges fachliches Review stellt einen Fehler in der Fixture fest.

- [ ] **Step 4: Golden + BSF-03A GREEN nachweisen**

Run:

```bash
bun scripts/golden-dataset/check.mjs
bunx vitest run src/__tests__/lib/golden-dataset-expected.test.ts
bunx vitest run src/__tests__/lib/project-controlling.test.ts
```

Expected: alle PASS.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/lib/project-controlling.test.ts docs/BSF-03A-DESIGN.md docs/LOVABLE-PROMPT-PLAN-BSF-03A.md
git commit -m "test(controlling): verify golden business results"
```

---

### Task 6: KIOSK-01-Kompatibilität bewahren und KIOSK-02 vorbereiten

**Files:**
- Modify: `docs/BSF-KIOSK-02-DESIGN.md`
- Modify: den KIOSK-02-Provider-Test laut bestehendem KIOSK-02-Implementation-Plan
- Do not modify: `docs/examples/kiosk-demo-dataset-v1.json` nur zur Anpassung an Golden V1

**Interfaces:**
- Consumes: `expected/kiosk-summary.json`.
- Produces: KIOSK-02-Gleichheitsnachweis für vergleichbare interne Kennzahlen.

- [ ] **Step 1: Kompatibilitätsregel als Test festlegen**

Für Golden V1 im Zeitraum 2026-09-01..2026-09-05 muss der interne KIOSK-02-Provider liefern:

```text
projectsWithActivity = 3
workPackagesWithActivity = 5
activityHours = 25.0
billableQuotePercent = 80.0
```

- [ ] **Step 2: Nicht vergleichbare Domänen explizit ausschließen**

Availability, Infrastructure und Support dürfen in KIOSK-02 weiter Demo/Unavailable sein. Der Test darf dafür keine Golden-Produktivwerte erfinden.

- [ ] **Step 3: KIOSK-01-Regression ausführen**

Der bestehende Testvertrag für `docs/examples/kiosk-demo-dataset-v1.json` bleibt PASS. Die Datei wird nicht still auf die neuen Golden-Kennzahlen umgeschrieben.

- [ ] **Step 4: Commit**

```bash
git add docs/BSF-KIOSK-02-DESIGN.md <tatsaechlicher-kiosk02-provider-testpfad>
git commit -m "test(kiosk): align internal metrics with golden reference"
```

Beim Ausführen ist `<tatsaechlicher-kiosk02-provider-testpfad>` durch den im bereits vorhandenen KIOSK-02-Plan explizit benannten Testpfad zu ersetzen; der Implementierer darf keinen zweiten Provider-Testpfad erfinden.

---

### Task 7: Golden Dataset als CI-Gate aktivieren

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/PROJECT-STATUS.yaml`
- Modify: `docs/ENTWICKLUNGSTAGEBUCH.md`

**Interfaces:**
- Produces: `bun run golden-dataset:check` und CI-Gate.

- [ ] **Step 1: Package-Script ergänzen**

```json
"golden-dataset:check": "bun scripts/golden-dataset/check.mjs"
```

- [ ] **Step 2: CI im Static-/Contract-Block ergänzen**

Nach Docs-/Manifest-Prüfungen und vor nachgelagerten Fachtests:

```bash
bun run golden-dataset:check
```

Expected: Fehler blockiert CI; keine automatische Fixture-Aktualisierung.

- [ ] **Step 3: Projektmanifest synchronisieren**

In `docs/PROJECT-STATUS.yaml`:

- Architekturprinzip `golden-reference` ergänzen,
- GDS-01 / #142 als Querschnitts-Backlog/-Roadmapbezug dokumentieren,
- BSF-03A-Exitkriterium um Golden-V1-Regression ergänzen,
- Produktversion nicht allein wegen Test-/Planungsdaten anheben.

- [ ] **Step 4: Entwicklungstagebuch fortschreiben**

Dokumentieren:

- Issue #142,
- Dataset `sysing.golden.v1` / `1.0.0`,
- Referenzzeit,
- Kernsummary 25/20/5/80,
- CI-Gate,
- keine Produktivdaten und keine DB-Änderung.

- [ ] **Step 5: Vollgates**

Run mindestens:

```bash
bun run golden-dataset:check
bun run project-status:check
bun run docs:check
bun run typecheck
bun run lint
```

Danach vollständige GitHub Security + CI auf demselben Exact Head.

- [ ] **Step 6: Commit**

```bash
git add package.json .github/workflows/ci.yml docs/PROJECT-STATUS.yaml docs/ENTWICKLUNGSTAGEBUCH.md
git commit -m "ci(golden): enforce reference dataset contract"
```

---

### Task 8: Sprint-Abnahme und Erweiterungsregeln festhalten

**Files:**
- Modify: `docs/BSF-CURRENT-PRIORITIES.md`
- Modify: `docs/SPRINT-PLAN-MVP-BSF.md`
- Modify: jeweilige Closure-Dokumente der konsumierenden Sprints

**Interfaces:**
- Consumes: alle vorherigen Tasks.
- Produces: dauerhaft nachvollziehbare Sprint-Governance für GDS-01.

- [ ] **Step 1: BSF-03A-Abschlusskriterium festschreiben**

BSF-03A ist nur dann DONE, wenn Golden V1 gegen die Controlling-Fachlogik PASS ist und der Abschlussbericht `schemaVersion` und `datasetVersion` nennt.

- [ ] **Step 2: KIOSK-02-Regel festschreiben**

Vergleichbare Kiosk-KPIs müssen dieselbe Golden-Fachdefinition verwenden; keine zweite KPI-Logik.

- [ ] **Step 3: BSF-03B-Erweiterungsregel festschreiben**

BSF-03B ergänzt `expected/performance-statement.json`; bestehende V1-Controlling-Erwartungen dürfen nur nach separatem fachlichem Review geändert werden.

- [ ] **Step 4: BSF-05A-Erweiterungsregel festschreiben**

Canonical Import muss Golden V1 ohne semantischen Drift reproduzieren. Positive und negative Import-Fixtures referenzieren die Golden-IDs.

- [ ] **Step 5: BSF-09-/FINAL-Gate festschreiben**

BSF-09 ergänzt Reporting-Expected-Results; `BSF-FINAL-INTERNAL` verlangt die vollständige Golden-Regression-Suite als PASS.

- [ ] **Step 6: Abschlussbericht für GDS-01 V1**

Muss enthalten:

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
DB_CHANGED = NEIN (sofern nur Foundation/Tests)
MERGE = NEIN bis separate Freigabe
DEPLOY = NEIN
```

- [ ] **Step 7: Commit**

```bash
git add docs/BSF-CURRENT-PRIORITIES.md docs/SPRINT-PLAN-MVP-BSF.md <betroffene-closure-dateien>
git commit -m "docs(golden): bind reference data to sprint governance"
```

---

## Self-Review

### Spec coverage

- vollständig synthetisch: Tasks 1–4
- versioniert und deterministisch: Tasks 1–3
- feste IDs/Zeiten: Task 2
- unabhängige Expected Results: Task 3
- Kategorie-/Unknown-/Legacy-Fälle: Tasks 2–3
- Cross-Scope-Negativfälle: Task 4
- BSF-03A-Integration: Task 5
- KIOSK-01 unverändert / KIOSK-02-Anschluss: Task 6
- CI-Gate: Task 7
- BSF-03B/05A/09/FINAL-Erweiterungen: Task 8
- keine produktive DB-/Providerabhängigkeit: Global Constraints und Tasks 1–4

### Type consistency

- `schemaVersion`: `sysing.golden.v1`
- `datasetVersion`: `1.0.0`
- `referenceTime`: `2026-09-14T00:00:00Z`
- Summary: 8 Activities, 2 Customers, 3 Projects, 5 WorkPackages, 25.0/20.0/5.0 Stunden, 80.0 %

### Keine stillen Platzhalter

Die einzige dynamische Pfadangabe in Task 6 verweist ausdrücklich auf den bereits bestehenden KIOSK-02-Implementation-Plan und darf bei Ausführung nur durch dessen tatsächlich benannten Testpfad ersetzt werden. Es wird kein neuer unbestimmter Implementierungsscope eröffnet.

## Execution Handoff

Die Foundation wird **nicht vor KIOSK-01 FINAL PASS** als neuer Fachsprint gestartet. Nach formaler KIOSK-01-Endabnahme wird GDS-01 V1 als erster Test-/Referenzbaustein innerhalb von BSF-03A umgesetzt; danach folgt der bestehende BSF-03A-Plan.
