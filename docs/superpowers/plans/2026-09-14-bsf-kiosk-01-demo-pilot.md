# BSF-KIOSK-01 Demo-Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einen read-only Info-Kiosk unter `/kiosk` bereitstellen, der sechs Managementbereiche ausschliesslich mit synthetischen Demo-Daten darstellt und spaeter ohne UI-Neubau auf einen internen Read-Provider umgestellt werden kann.

**Architecture:** Die Kiosk-UI konsumiert ausschliesslich den providerneutralen `KioskDataProvider`. KIOSK-01 liefert nur `DemoKioskDataProvider`; die Route liegt unter dem bestehenden `_authenticated`-Gate und verwendet `dashboard.view`, ohne neue Rolle, Permission, Datenbank oder Auth-Ausnahme. Refresh, Empty-, Unknown- und Error-Zustaende werden im Hook gekapselt; die Komponenten bleiben reine Darstellung.

**Tech Stack:** React 19, TanStack Router/React Start, TypeScript 5.9, Tailwind CSS 4, shadcn/ui, Vitest, Testing Library, vitest-axe, Playwright, Bun, GitHub Actions.

**Spec:** `docs/BSF-KIOSK-01-DESIGN.md`, `docs/BSF-INTERNAL-KIOSK-FIRST-ROADMAP.md`, GitHub Issue #135.

## Global Constraints

- GitHub `main` ist Source of Truth; Implementierung beginnt erst von der dann aktuellen `main`-Baseline.
- Arbeitsbranch getrennt von `main`; keine direkte Implementierung auf `main`.
- Keine DB-/RLS-/Grant-/Function-Aenderung in KIOSK-01.
- Keine Service Role, keine produktiven Secrets, Tokens oder Passwoerter.
- Keine neue Rolle und keine neue globale Permission; `dashboard.view` wird wiederverwendet.
- Keine Aenderung an `src/integrations/supabase/client.ts` fuer Kiosk-Zwecke.
- `src/integrations/supabase/previewAuthStorage.ts` darf nicht neu eingefuehrt werden.
- Der vorhandene Idle-Logout unter `_authenticated` bleibt aktiv und wird nicht kuenstlich zurueckgesetzt.
- Nur synthetische Demo-Daten; keine echten Kunden-, Personen-, Mail-, Host-, Ticket- oder IP-Daten.
- UI-Komponenten kennen keinen Supabase-, Graph-, SharePoint-, Exchange-, PRTG-, MCP- oder Agenten-Provider.
- TDD: Produktcode erst nach passendem roten Test.
- `src/routeTree.gen.ts` niemals manuell bearbeiten.
- `unknown` ist ein eigener Zustand und darf nicht still auf `0` oder `ok` normalisiert werden.
- Der Hinweis `DEMO-DATEN — KEINE LIVE-DATEN` bleibt dauerhaft sichtbar.
- Lovable darf nur innerhalb des in `docs/LOVABLE-PROMPT-PLAN-KIOSK-01.md` beschriebenen UI-Scopes arbeiten.

---

## File Map

**Neu:**

- `src/lib/kiosk/kiosk-contract.ts` — providerneutraler Read-Vertrag und Refresh-Konstante.
- `src/lib/kiosk/demo-kiosk-scenarios.ts` — ausschliesslich synthetische, deterministische Szenarien.
- `src/lib/kiosk/demo-kiosk-provider.ts` — lokaler Demo-Provider mit injizierbarer Clock.
- `src/hooks/useKioskSnapshot.ts` — Load-/Refresh-/Last-good-/Error-Zustand.
- `src/components/kiosk/KioskDomainCard.tsx` — reine Domaenenkarte.
- `src/components/kiosk/KioskView.tsx` — Grossbild-Layout und Gesamtzustand.
- `src/routes/_authenticated/kiosk.tsx` — Route, Search-Validierung, Provider-Verdrahtung, `dashboard.view`-Gate.
- `src/__tests__/lib/kiosk-contract.test.ts` — Vertragsinvarianten.
- `src/__tests__/lib/demo-kiosk-provider.test.ts` — Szenarien und Zeitstempel.
- `src/__tests__/hooks/useKioskSnapshot.test.tsx` — Refresh und Last-good-Verhalten.
- `src/__tests__/components/KioskView.test.tsx` — Darstellung der vier Szenarien.
- `src/__tests__/a11y/kiosk.test.tsx` — axe-Pruefung.
- `e2e/specs/kiosk/kiosk-demo.spec.ts` — Route, Auth, Szenarien und Grossbild-Sichtbarkeit.
- `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md` — erst im Abschlusstask.

**Aendern:**

- `src/routes/_authenticated/dashboard.tsx` — kleiner Link `Info-Kiosk` unter `dashboard.view`.
- `src/lib/help-documentation.ts` — Hilfethema Kiosk.
- `docs/ENTWICKLUNGSTAGEBUCH.md` — Abschlussnachweis.
- `docs/CURRENT-STATUS.md` — Status nach Abnahme.
- `docs/PROJECT-STATUS.yaml` — Status nach Abnahme.
- `docs/BSF-CURRENT-PRIORITIES.md` — KIOSK-01 DONE und BSF-03A NEXT erst nach Abnahme.
- `CHANGELOG.md` — fachlicher Abschluss.

---

### Task 1: Kiosk-Vertrag und Demo-Szenarien TDD

**Files:**

- Create: `src/lib/kiosk/kiosk-contract.ts`
- Create: `src/lib/kiosk/demo-kiosk-scenarios.ts`
- Create: `src/__tests__/lib/kiosk-contract.test.ts`

**Interfaces:**

- Produces: `KioskLevel`, `KioskMetric`, `KioskDomainSnapshot`, `KioskSnapshot`, `KioskDataProvider`, `KIOSK_REFRESH_MS`, `DemoKioskScenario`.
- Consumes: keine Runtime-/Providerabhaengigkeit.

- [ ] **Step 1: Roten Vertrags-Test schreiben**

```ts
import { describe, expect, it } from "vitest";
import { KIOSK_REFRESH_MS, KIOSK_DOMAIN_IDS } from "@/lib/kiosk/kiosk-contract";

it("defines the fixed kiosk refresh and six domains", () => {
  expect(KIOSK_REFRESH_MS).toBe(60_000);
  expect(KIOSK_DOMAIN_IDS).toEqual([
    "projects",
    "workPackages",
    "activities",
    "availability",
    "infrastructure",
    "support",
  ]);
});
```

- [ ] **Step 2: Test ausfuehren und RED belegen**

Run:

```bash
bunx vitest run src/__tests__/lib/kiosk-contract.test.ts
```

Expected: FAIL, weil `@/lib/kiosk/kiosk-contract` noch nicht existiert.

- [ ] **Step 3: Minimalen Vertrag implementieren**

```ts
export const KIOSK_DOMAIN_IDS = [
  "projects",
  "workPackages",
  "activities",
  "availability",
  "infrastructure",
  "support",
] as const;

export const KIOSK_REFRESH_MS = 60_000;

export type KioskDomainId = (typeof KIOSK_DOMAIN_IDS)[number];
export type KioskLevel = "ok" | "warning" | "critical" | "unknown";
export type DemoKioskScenario = "default" | "empty" | "unknown" | "error";

export interface KioskMetric {
  value: number | null;
  label: string;
  level: KioskLevel;
}

export interface KioskDomainSnapshot {
  id: KioskDomainId;
  title: string;
  level: KioskLevel;
  metrics: KioskMetric[];
  note?: string;
}

export interface KioskSnapshot {
  mode: "demo";
  generatedAt: string;
  observedAt: string;
  domains: KioskDomainSnapshot[];
}

export interface KioskDataProvider {
  getSnapshot(): Promise<KioskSnapshot>;
}
```

- [ ] **Step 4: `demo-kiosk-scenarios.ts` mit vier rein synthetischen Szenarien anlegen**

Die Werte muessen beispielhaft und ohne reale Namen sein. Beispiel fuer `default`:

```ts
export const DEFAULT_DEMO_DOMAINS: KioskDomainSnapshot[] = [
  {
    id: "projects",
    title: "Projekte",
    level: "warning",
    metrics: [
      { label: "Aktiv", value: 12, level: "ok" },
      { label: "Auffaellig", value: 2, level: "warning" },
    ],
  },
  {
    id: "workPackages",
    title: "Arbeitspakete",
    level: "warning",
    metrics: [
      { label: "Offen", value: 34, level: "ok" },
      { label: "Ueberfaellig", value: 4, level: "warning" },
    ],
  },
  {
    id: "activities",
    title: "Taetigkeiten",
    level: "ok",
    metrics: [{ label: "Heute offen", value: 18, level: "ok" }],
  },
  {
    id: "availability",
    title: "Verfuegbarkeit",
    level: "ok",
    metrics: [{ label: "Abwesend heute", value: 2, level: "ok" }],
  },
  {
    id: "infrastructure",
    title: "Infrastruktur",
    level: "critical",
    metrics: [
      { label: "Warnung", value: 3, level: "warning" },
      { label: "Kritisch", value: 1, level: "critical" },
    ],
  },
  {
    id: "support",
    title: "Support-Postfach",
    level: "warning",
    metrics: [
      { label: "Heute", value: 11, level: "ok" },
      { label: "Aelter", value: 5, level: "warning" },
    ],
  },
];
```

`empty` liefert sechs Domaenen mit `metrics: []` und beschrifteter Note. `unknown` setzt mindestens eine Domaene auf `level: "unknown"` und `value: null`. `error` wird nicht als Snapshot gespeichert, sondern spaeter vom Provider geworfen.

- [ ] **Step 5: Vertragstest GREEN ausfuehren**

```bash
bunx vitest run src/__tests__/lib/kiosk-contract.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/kiosk src/__tests__/lib/kiosk-contract.test.ts
git commit -m "feat(kiosk): providerneutralen Demo-Vertrag definieren"
```

---

### Task 2: DemoKioskDataProvider TDD

**Files:**

- Create: `src/lib/kiosk/demo-kiosk-provider.ts`
- Create: `src/__tests__/lib/demo-kiosk-provider.test.ts`

**Interfaces:**

- Consumes: `DemoKioskScenario`, `KioskDataProvider`, Szenarien aus Task 1.
- Produces: `createDemoKioskDataProvider({ scenario, now })`.

- [ ] **Step 1: Roten Provider-Test schreiben**

```ts
import { describe, expect, it } from "vitest";
import { createDemoKioskDataProvider } from "@/lib/kiosk/demo-kiosk-provider";

const NOW = new Date("2026-09-14T06:00:00.000Z");

it("returns a deterministic demo snapshot", async () => {
  const provider = createDemoKioskDataProvider({ scenario: "default", now: () => NOW });
  const snapshot = await provider.getSnapshot();

  expect(snapshot.mode).toBe("demo");
  expect(snapshot.generatedAt).toBe(NOW.toISOString());
  expect(snapshot.domains).toHaveLength(6);
});

it("throws the controlled demo error", async () => {
  const provider = createDemoKioskDataProvider({ scenario: "error", now: () => NOW });
  await expect(provider.getSnapshot()).rejects.toThrow("demo_kiosk_provider_error");
});
```

- [ ] **Step 2: Test ausfuehren und RED belegen**

```bash
bunx vitest run src/__tests__/lib/demo-kiosk-provider.test.ts
```

Expected: FAIL, Provider fehlt.

- [ ] **Step 3: Minimalen Provider implementieren**

```ts
export interface DemoKioskProviderOptions {
  scenario: DemoKioskScenario;
  now?: () => Date;
}

export function createDemoKioskDataProvider({
  scenario,
  now = () => new Date(),
}: DemoKioskProviderOptions): KioskDataProvider {
  return {
    async getSnapshot() {
      if (scenario === "error") throw new Error("demo_kiosk_provider_error");
      const timestamp = now().toISOString();
      return {
        mode: "demo",
        generatedAt: timestamp,
        observedAt: timestamp,
        domains: domainsForScenario(scenario),
      };
    },
  };
}
```

`domainsForScenario` gibt immer neue Arrays/Objekte zurueck, damit UI oder Tests keine globalen Fixtures mutieren koennen.

- [ ] **Step 4: Provider-Test GREEN**

```bash
bunx vitest run src/__tests__/lib/demo-kiosk-provider.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/kiosk/demo-kiosk-provider.ts src/__tests__/lib/demo-kiosk-provider.test.ts
git commit -m "feat(kiosk): deterministischen Demo-Provider ergänzen"
```

---

### Task 3: Refresh- und Last-good-State im Hook TDD

**Files:**

- Create: `src/hooks/useKioskSnapshot.ts`
- Create: `src/__tests__/hooks/useKioskSnapshot.test.tsx`

**Interfaces:**

```ts
export interface KioskSnapshotState {
  status: "loading" | "ready" | "error";
  snapshot: KioskSnapshot | null;
  refreshError: string | null;
  lastRefreshedAt: string | null;
}

export function useKioskSnapshot(provider: KioskDataProvider): KioskSnapshotState;
```

- [ ] **Step 1: Roten Hook-Test fuer Erstladen, 60-Sekunden-Refresh und Last-good schreiben**

Test mit `vi.useFakeTimers()` und einem Provider, der zuerst einen Snapshot liefert und beim zweiten Aufruf wirft. Erwartung:

```ts
expect(result.current.status).toBe("ready");
expect(result.current.snapshot).toEqual(firstSnapshot);

await vi.advanceTimersByTimeAsync(60_000);

expect(result.current.snapshot).toEqual(firstSnapshot);
expect(result.current.refreshError).toBe("Aktualisierung fehlgeschlagen");
```

- [ ] **Step 2: RED ausfuehren**

```bash
bunx vitest run src/__tests__/hooks/useKioskSnapshot.test.tsx
```

Expected: FAIL, Hook fehlt.

- [ ] **Step 3: Hook minimal implementieren**

Der Hook muss:

```text
mount -> sofort load()
load success -> snapshot ersetzen, refreshError loeschen
load initial failure -> status=error, snapshot=null
load refresh failure mit last-good -> snapshot behalten, refreshError setzen
interval -> exakt KIOSK_REFRESH_MS
unmount -> interval abbrechen
provider change -> alten interval abbrechen und neu laden
```

Keine Session-Aktivitaet erzeugen, keine Storage-Writes, kein API-Polling ausser `provider.getSnapshot()`.

- [ ] **Step 4: Hook-Test GREEN**

```bash
bunx vitest run src/__tests__/hooks/useKioskSnapshot.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useKioskSnapshot.ts src/__tests__/hooks/useKioskSnapshot.test.tsx
git commit -m "feat(kiosk): sicheren Refresh-Zustand kapseln"
```

---

### Task 4: KioskView und DomainCard TDD

**Files:**

- Create: `src/components/kiosk/KioskDomainCard.tsx`
- Create: `src/components/kiosk/KioskView.tsx`
- Create: `src/__tests__/components/KioskView.test.tsx`

**Interfaces:**

```ts
export interface KioskViewProps {
  state: KioskSnapshotState;
  onBackToDashboard?: () => void;
}
```

- [ ] **Step 1: Roten Komponententest schreiben**

Der Test prueft mindestens:

```ts
expect(screen.getByText("DEMO-DATEN — KEINE LIVE-DATEN")).toBeVisible();
expect(screen.getByRole("heading", { name: "Projekte" })).toBeVisible();
expect(screen.getByRole("heading", { name: "Arbeitspakete" })).toBeVisible();
expect(screen.getByRole("heading", { name: "Taetigkeiten" })).toBeVisible();
expect(screen.getByRole("heading", { name: "Verfuegbarkeit" })).toBeVisible();
expect(screen.getByRole("heading", { name: "Infrastruktur" })).toBeVisible();
expect(screen.getByRole("heading", { name: "Support-Postfach" })).toBeVisible();
```

Zusaetzlich je ein Test fuer `loading`, `empty`, `unknown`, initial `error` und `refreshError` mit erhaltenem Snapshot.

- [ ] **Step 2: RED ausfuehren**

```bash
bunx vitest run src/__tests__/components/KioskView.test.tsx
```

Expected: FAIL, Komponenten fehlen.

- [ ] **Step 3: Presentational Components implementieren**

`KioskDomainCard` akzeptiert nur `KioskDomainSnapshot`. Es fuehrt keine Datenbeschaffung aus.

`KioskView` verwendet eine viewport-fuellende Struktur:

```tsx
<main className="min-h-dvh bg-background text-foreground">
  <header>{/* Titel, DEMO-Badge, Datenstand, Dashboard-Link */}</header>
  <section className="grid gap-4 lg:grid-cols-3">{/* sechs Karten */}</section>
  <footer>{/* Demo-/Refresh-/Fehlerhinweis */}</footer>
</main>
```

Farbe ist nie alleinige Semantik; Status muss als Text oder Icon mit Accessible Name vorhanden sein.

- [ ] **Step 4: Komponententest GREEN**

```bash
bunx vitest run src/__tests__/components/KioskView.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/kiosk src/__tests__/components/KioskView.test.tsx
git commit -m "feat(kiosk): Grossbild-Demoansicht ergänzen"
```

---

### Task 5: Route, Szenario-Validierung und Dashboard-Einstieg

**Files:**

- Create: `src/routes/_authenticated/kiosk.tsx`
- Modify: `src/routes/_authenticated/dashboard.tsx`
- Test: `src/__tests__/components/KioskView.test.tsx`

**Interfaces:**

- Route URL: `/kiosk`.
- Query: `scenario=default|empty|unknown|error`.
- Permission: `dashboard.view`.

- [ ] **Step 1: Route-Search-Schema definieren**

```ts
const KioskSearchSchema = z.object({
  scenario: z.enum(["default", "empty", "unknown", "error"]).catch("default").default("default"),
});
```

- [ ] **Step 2: Route implementieren**

```tsx
export const Route = createFileRoute("/_authenticated/kiosk")({
  validateSearch: KioskSearchSchema,
  head: () => ({ meta: [{ title: "Info-Kiosk — SysIng Dashboard" }] }),
  component: KioskPage,
});
```

`KioskPage` erzeugt den Demo-Provider aus dem validierten Szenario, ruft `useKioskSnapshot` auf und rendert die View innerhalb eines `PermissionGate permission="dashboard.view"`.

- [ ] **Step 3: Kleinen Dashboard-Link einfuegen**

Im vorhandenen Dashboard-Header einen einzelnen Link `Info-Kiosk` unter bestehendem `PermissionGate permission="dashboard.view"` ergaenzen. Keine Umstrukturierung des grossen Dashboard-Moduls in diesem Sprint.

- [ ] **Step 4: RouteTree generieren lassen**

Den projektspezifischen Build-/Router-Generator verwenden. `src/routeTree.gen.ts` nicht von Hand editieren.

- [ ] **Step 5: Targeted Checks**

```bash
bun run typecheck
bun run lint
bunx prettier --check src/lib/kiosk src/hooks/useKioskSnapshot.ts src/components/kiosk src/routes/_authenticated/kiosk.tsx
```

Expected: alle PASS.

- [ ] **Step 6: Commit**

```bash
git add src/routes/_authenticated/kiosk.tsx src/routes/_authenticated/dashboard.tsx src/routeTree.gen.ts
git commit -m "feat(kiosk): authentifizierte Demo-Route bereitstellen"
```

---

### Task 6: Accessibility und E2E-Vertrag

**Files:**

- Create: `src/__tests__/a11y/kiosk.test.tsx`
- Create: `e2e/specs/kiosk/kiosk-demo.spec.ts`

**Interfaces:**

- Consumes: bestehender E2E-Auth-Harness des Projekts.
- Produces: reproduzierbarer Browsernachweis fuer Default-/Empty-/Unknown-/Error-Szenario.

- [ ] **Step 1: A11y-Test rot schreiben**

Mit dem vorhandenen `vitest-axe`-Muster `KioskView` im Default- und Unknown-Zustand pruefen.

Erwartung:

```ts
expect(await axe(container)).toHaveNoViolations();
```

- [ ] **Step 2: E2E-Test schreiben**

Mindestens:

```text
E01 unauthenticated /kiosk -> Redirect nach /auth
E02 authenticated + dashboard.view -> /kiosk sichtbar
E03 DEMO-DATEN-Hinweis sichtbar
E04 sechs Domaenen sichtbar
E05 ?scenario=empty -> beschrifteter Empty-State
E06 ?scenario=unknown -> UNBEKANNT sichtbar, nicht 0/OK
E07 ?scenario=error -> kontrollierte Fehlerflaeche
E08 1920x1080 -> keine horizontalen Overflow-/Clipping-Findings im Kernlayout
E09 Dashboard-Link zurueck funktioniert
```

Keine echten Accounts oder Secrets in Fixtures. Vorhandenen synthetischen Auth-Harness wiederverwenden.

- [ ] **Step 3: Targeted A11y/E2E ausfuehren**

```bash
bun run test:a11y
bunx playwright test e2e/specs/kiosk/kiosk-demo.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/a11y/kiosk.test.tsx e2e/specs/kiosk/kiosk-demo.spec.ts
git commit -m "test(kiosk): Demo-Wallboard a11y und e2e absichern"
```

---

### Task 7: Lovable UI-/Preview-Pass ohne Architekturdrift

**Files:**

- Modify only as needed: `src/components/kiosk/KioskView.tsx`, `src/components/kiosk/KioskDomainCard.tsx`, eventuell rein visuelle lokale Kiosk-Komponenten.
- Do not modify: DB, migrations, `client.ts`, Auth-Storage, RBAC-Matrix, Providervertrag ohne explizite neue Architekturfreigabe.

**Interfaces:**

- Consumes: fertig getesteten `KioskDataProvider` und `useKioskSnapshot`.
- Produces: visuell belastbare Grossmonitoransicht ohne fachliche oder Security-Aenderung.

- [ ] **Step 1: Lovable-Prompt K01-L1 aus `docs/LOVABLE-PROMPT-PLAN-KIOSK-01.md` ausfuehren**

Zuerst Analyse, dann UI-Umsetzung, Tests, Dokumentation und Abschlussbericht.

- [ ] **Step 2: Preview pruefen**

Mindestens:

```text
1920x1080
1366x768
scenario=default
scenario=empty
scenario=unknown
scenario=error
```

- [ ] **Step 3: Drift-Pruefung**

`git diff` darf keine Migration, Auth-Broker-Datei, neue globale Permission oder direkte Providerkopplung enthalten.

- [ ] **Step 4: Targeted Tests erneut ausfuehren**

```bash
bunx vitest run src/__tests__/components/KioskView.test.tsx
bun run test:a11y
bunx playwright test e2e/specs/kiosk/kiosk-demo.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/kiosk
git commit -m "style(kiosk): Grossbilddarstellung verfeinern"
```

---

### Task 8: Hilfe, Abschlussdokumentation und vollstaendige Gates

**Files:**

- Modify: `src/lib/help-documentation.ts`
- Create: `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md`
- Modify: `docs/ENTWICKLUNGSTAGEBUCH.md`
- Modify: `docs/CURRENT-STATUS.md`
- Modify: `docs/PROJECT-STATUS.yaml`
- Modify: `docs/BSF-CURRENT-PRIORITIES.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Hilfethema ergaenzen**

Dokumentieren:

```text
Info-Kiosk = read-only Demo-Pilot
DEMO-DATEN sind keine Live-Daten
vier Preview-Szenarien
Idle-Logout bleibt aktiv
keine externe Integration in KIOSK-01
```

- [ ] **Step 2: Closure-Dokument anlegen**

Das Closure-Dokument enthaelt mindestens Scope, Nicht-Scope, Architektur, Demo-Datenschutz, Tests, Security, CI-Evidence, bekannte V1-Grenze Idle-Logout und Anschluss an BSF-03A/#106.

- [ ] **Step 3: Statusdateien erst nach nachgewiesenen Gates synchronisieren**

KIOSK-01 erst dann auf DONE setzen, wenn die vollstaendigen Gates auf dem exakten Head gruen sind. Danach BSF-03A/#106 als NEXT setzen.

- [ ] **Step 4: Vollstaendige lokale/repository Checks**

```bash
bunx prettier --check .
bun run lint
bun run typecheck
bun run test
bun run test:security
bun run test:a11y
bun run test:debt
bun run build
bun run test:e2e
bun run report:technical
bun run ci:gate
```

Expected: alle PASS.

- [ ] **Step 5: GitHub PR und Exact-Head-Gates**

PR nur als READY markieren, wenn Security und vollstaendige CI auf exakt demselben Head PASS sind. Kein Merge/Deploy ohne separate Freigabe.

- [ ] **Step 6: Abschlussbericht**

Struktur:

```text
BSF-KIOSK-01 STATUS
Head-SHA
geänderte Dateien
DB/RLS/Auth geändert: JA/NEIN
Demo-Daten geprüft
Unit/Component
A11y
E2E
Security
CI/Quality Gate
Dokumentation
Merge: NEIN bis Freigabe
Deploy: NEIN
Nächster Sprint: BSF-03A / #106
```
