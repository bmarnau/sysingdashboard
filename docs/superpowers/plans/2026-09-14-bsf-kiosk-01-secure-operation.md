# BSF-KIOSK-01 Secure Operation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einen read-only Info-Kiosk unter `/kiosk` mit dediziertem Kiosk-Konto, eng begrenzter Idle-Ausnahme und administrativ ladbaren synthetischen Demodaten bereitstellen.

**Architecture:** Supabase authentifiziert ein technisches Konto mit exklusiver Rolle `kiosk`; diese Rolle besitzt nur `kiosk.view`. Der geschuetzte Router beschraenkt Kiosk-Konten auf `/kiosk` und deaktiviert nur dort die Inaktivitaetsueberwachung. Die Kiosk-UI konsumiert ausschliesslich `KioskDataProvider`; KIOSK-01 liest einen lokal und geraeteweit gespeicherten, versionierten Demo-Datensatz, der nur ueber den bestehenden Demo-/Servicebereich administrativ geladen oder entfernt wird.

**Tech Stack:** React 19, TanStack Router/React Start, TypeScript 5.9, Supabase/PostgreSQL, Tailwind CSS 4, shadcn/ui, Vitest, Testing Library, vitest-axe, Playwright, Bun, GitHub Actions.

**Spec:** `docs/BSF-KIOSK-01-DESIGN.md`, GitHub Issue #135. Dieser Plan ersetzt `2026-09-14-bsf-kiosk-01-demo-pilot.md` fuer die weitere Ausfuehrung.

## Global Constraints

- Feature-Branch `feat/bsf-kiosk-01-demo-pilot`; keine direkte Implementierung auf `main`.
- TDD: Produktionscode erst nach einem passenden, nachgewiesenen roten Test.
- Rolle `kiosk` besitzt ausschliesslich `kiosk.view`; keine Fach-, Export-, Admin- oder Seed-Rechte.
- Idle-Ausnahme nur fuer ein authentifiziertes Kiosk-Konto auf `/kiosk`; keine Fake-Aktivitaet und kein Auto-Login mit gespeicherten Credentials.
- Auth-/Tokenvalidierung, Account-Status, Sperre/Deaktivierung und manueller Logout bleiben wirksam.
- Service Role nur in bereits serverseitig abgegrenzten Auth-Adminpfaden; niemals Client, Prompt, Doku oder Normalpfad.
- Kiosk-Demodaten sind vollstaendig synthetisch, versioniert, lokal, geraete-/browserweit, idempotent neu ladbar und vollstaendig entfernbar.
- Keine neue Kiosk-Fachdatenbank, keine produktiven Fach-/Cloud-Demozeilen, keine externe Graph-/SharePoint-/Exchange-/PRTG-/MCP-/Agentenquelle.
- UI kennt keine Providerimplementierung ausser `KioskDataProvider`.
- `src/routeTree.gen.ts` niemals manuell editieren.
- `DEMO-DATEN — KEINE LIVE-DATEN` bleibt sichtbar.
- Kein Merge/Deploy ohne separate Freigabe.

---

### Task 1: Providerneutraler Kiosk-Vertrag

**Files:**
- Existing RED test: `src/__tests__/lib/kiosk-contract.test.ts`
- Create: `src/lib/kiosk/kiosk-contract.ts`

**Interfaces:**
- Produces `KIOSK_DOMAIN_IDS`, `KIOSK_REFRESH_MS`, `KioskLevel`, `KioskDatasetState`, `DemoKioskScenario`, `KioskMetric`, `KioskDomainSnapshot`, `KioskSnapshot`, `KioskDataProvider`.

- [x] **Step 1: RED nachweisen.** CI #676 Static/TypeScript scheitert mit `TS2307: Cannot find module '@/lib/kiosk/kiosk-contract'`; Prettier und ESLint davor PASS.
- [ ] **Step 2: Minimalen Vertrag implementieren.**

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
export type KioskDatasetState = "loaded" | "not_loaded";
export type DemoKioskScenario = "default" | "empty" | "unknown" | "error" | "not_loaded";
export interface KioskMetric { value: number | null; label: string; level: KioskLevel }
export interface KioskDomainSnapshot { id: KioskDomainId; title: string; level: KioskLevel; metrics: KioskMetric[]; note?: string }
export interface KioskSnapshot { mode: "demo"; datasetState: KioskDatasetState; datasetVersion: string; generatedAt: string; observedAt: string; domains: KioskDomainSnapshot[] }
export interface KioskDataProvider { getSnapshot(): Promise<KioskSnapshot> }
```

- [ ] **Step 3: GitHub Actions GREEN fuer Static/TypeScript bestaetigen.**

---

### Task 2: Kiosk-Rolle, Permission und DB-Sicherheitsvertrag

**Files:**
- Modify: `src/lib/user-management.ts`
- Modify: `src/lib/rbac/permissions.ts`
- Modify: `backend/services/rbac.mjs`
- Modify: `src/integrations/supabase/types.ts`
- Create: zwei neue `supabase/migrations/<timestamp>_kiosk_*.sql`
- Create: `src/__tests__/lib/kiosk-rbac.test.ts`
- Create: `supabase/tests/bsf-kiosk-01-role-contract.sql`

**Interfaces:** Rolle `kiosk`, Permission `kiosk.view`.

- [ ] **Step 1: RED Tests schreiben.** Frontendtest fordert exakt `permissionsOf("kiosk") === ["kiosk.view"]` und dass alle bisherigen Rollen `kiosk.view` nicht besitzen. SQL-Test fordert `has_permission(kiosk_user,'kiosk.view')=true`, `dashboard.view=false` und Rollenexklusivitaet.
- [ ] **Step 2: RED ueber CI nachweisen.** Erwartet Type-/RBAC-/SQL-Vertragsfehler, weil Rolle/Permission fehlen.
- [ ] **Step 3: Enum-Migration isoliert anlegen.**

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'kiosk';
```

- [ ] **Step 4: Zweite Migration fuer Permission und Exklusivitaet.** `has_permission` erhaelt fuer `kiosk` nur `kiosk.view`. Trigger verweigert sowohl `kiosk` neben einer anderen Rolle als auch eine andere Rolle neben bestehendem `kiosk`.
- [ ] **Step 5: Frontend-/Backend-Mirror und generierte Typen angleichen.** `ROLE_LABEL.kiosk = "Kiosk"`; `ROLE_PERMISSIONS.kiosk = ["kiosk.view"]`.
- [ ] **Step 6: CI GREEN inkl. RBAC-Matrix bestaetigen.**

---

### Task 3: Kiosk-Session- und Routenpolicy

**Files:**
- Create: `src/lib/kiosk/kiosk-session-policy.ts`
- Create: `src/__tests__/lib/kiosk-session-policy.test.ts`
- Modify: `src/routes/_authenticated/route.tsx`

**Interfaces:**

```ts
export function resolveKioskSessionPolicy(input: { pathname: string; hasKioskView: boolean }): {
  kioskMode: boolean;
  redirectTo: "/kiosk" | "/dashboard" | null;
  idleLogoutEnabled: boolean;
};
```

- [ ] **Step 1: RED Tests schreiben.** Kiosk + `/kiosk` => `idleLogoutEnabled=false`; Kiosk + andere geschuetzte Route => Redirect `/kiosk`; normal + `/kiosk` => Redirect `/dashboard`; normal sonst => Idle aktiv.
- [ ] **Step 2: RED nachweisen.** Policy-Modul fehlt.
- [ ] **Step 3: Pure Policy minimal implementieren.**
- [ ] **Step 4: `_authenticated` Gate erweitert `beforeLoad` nach erfolgreicher Auth um `has_permission(user.id,'kiosk.view')`; Redirects folgen ausschliesslich der Policy.**
- [ ] **Step 5: Layout verwendet `useIdleLogout(policy.idleLogoutEnabled)`; keine Aktivitaetssimulation.**
- [ ] **Step 6: Tests/Typecheck GREEN.**

---

### Task 4: Dediziertes Kiosk-Konto administrativ provisionieren

**Files:**
- Modify: `src/lib/admin/auth-accounts.server.ts`
- Modify: `src/lib/admin/auth-accounts.functions.ts`
- Modify: passende Account-/User-Admin-UI
- Create/modify: server/API tests fuer Kiosk-Provisionierung

**Interfaces:**

```ts
createKioskAuthAccount({ email, password, displayName }): Promise<{ userId: string }>
```

- [ ] **Step 1: RED Tests.** Unberechtigter Actor wird abgewiesen; nur Actor mit `users.manage` UND `roles.manage` darf provisionieren; Passwort darf nicht im Auditpayload erscheinen; Ergebnis besitzt exklusiv Rolle `kiosk`.
- [ ] **Step 2: RED nachweisen.** Funktion fehlt.
- [ ] **Step 3: Serverfunktion minimal implementieren.** Requester ueber normale Auth pruefen; beide Permissions serverseitig pruefen; vorhandenen serverseitigen Admin-Client fuer `auth.admin.createUser` nutzen; Profil + Rolle `kiosk` anlegen; bei DB-Fehler angelegten Auth-User kompensierend loeschen.
- [ ] **Step 4: Schmale Admin-UI ergaenzen.** Felder Anzeigename, E-Mail, Passwort/Bestätigung; kein Passwort-Logging/Preview.
- [ ] **Step 5: Tests GREEN.**

---

### Task 5: Versionierter lokaler Kiosk-Demodatensatz

**Files:**
- Create: `src/lib/kiosk/kiosk-demo-dataset.ts`
- Create: `src/lib/kiosk/kiosk-demo-repository.ts`
- Create: `src/lib/kiosk/kiosk-demo-service.ts`
- Create: `src/__tests__/lib/kiosk-demo-repository.test.ts`
- Create: `src/__tests__/lib/kiosk-demo-service.test.ts`
- Modify: `src/components/DemoDataDialog.tsx`

**Interfaces:**
- `KIOSK_DEMO_DATASET_VERSION = "1.0.0"`
- globaler Storage-Key `northbit-kiosk-demo-dataset-v1` (nicht `userScopedKey`).
- `readKioskDemoDataset()`, `loadKioskDemoDataset()`, `removeKioskDemoDataset()`.

- [ ] **Step 1: RED Repositorytests.** Nicht geladen => `null`; Laden => Version + synthetische Daten; erneutes Laden setzt definierten Ausgangszustand; Entfernen => `null`; anderer lokaler Benutzer sieht denselben geraeteweiten Datensatz.
- [ ] **Step 2: RED Servicetest.** Kiosk-Actor darf nicht laden/entfernen; Actor mit `users.manage` darf.
- [ ] **Step 3: Repository/Dataset implementieren.** Nur synthetische Aggregatwerte, keine produktiven Identifikatoren.
- [ ] **Step 4: DemoDataDialog unter `PermissionGate permission="users.manage"` um `Kiosk-Demodaten laden/neu laden/entfernen` plus Version/Status erweitern.**
- [ ] **Step 5: Tests GREEN.**

---

### Task 6: Demo-Provider und Refresh-State

**Files:**
- Create: `src/lib/kiosk/demo-kiosk-provider.ts`
- Create: `src/hooks/useKioskSnapshot.ts`
- Create: `src/__tests__/lib/demo-kiosk-provider.test.ts`
- Create: `src/__tests__/hooks/useKioskSnapshot.test.tsx`

- [ ] **Step 1: RED Provider-Test.** `not_loaded` liefert Snapshot mit `datasetState="not_loaded"` und `domains=[]`; `default/empty/unknown` lesen den geladenen Datensatz; `error` wirft `demo_kiosk_provider_error`; injizierte Clock bestimmt Zeitstempel.
- [ ] **Step 2: RED Hook-Test.** Initial Load, exakt 60s Refresh, Last-good bei Refreshfehler, Interval cleanup.
- [ ] **Step 3: Provider minimal implementieren.** Keine Storage-Schreiboperationen.
- [ ] **Step 4: Hook minimal implementieren.** Nur `provider.getSnapshot()`, kein Idle-/Session-Ping.
- [ ] **Step 5: Tests GREEN.**

---

### Task 7: Kiosk-UI, Route, Logout, A11y und E2E

**Files:**
- Create: `src/components/kiosk/KioskDomainCard.tsx`
- Create: `src/components/kiosk/KioskView.tsx`
- Create: `src/routes/_authenticated/kiosk.tsx`
- Create: `src/__tests__/components/KioskView.test.tsx`
- Create: `src/__tests__/a11y/kiosk.test.tsx`
- Create: `e2e/specs/kiosk/kiosk-demo.spec.ts`

- [ ] **Step 1: RED Componenttests.** Dauerbanner, sechs Domaenen, `UNBEKANNT`, `not_loaded`, initial error, refresh error mit Last-good, manueller Logout sichtbar.
- [ ] **Step 2: Presentational UI implementieren.** 3x2 Grossbildlayout bei 1920x1080, kontrollierter kleiner Desktop, Status nie nur ueber Farbe.
- [ ] **Step 3: `/kiosk` Route implementieren.** `scenario` validiert `default|empty|unknown|error|not_loaded`; Demo-Provider + Hook; Logout ueber bestehenden Logout-Service.
- [ ] **Step 4: Routergenerator laufen lassen; `routeTree.gen.ts` nicht manuell editieren.**
- [ ] **Step 5: A11y/E2E RED/GREEN.** E2E: unauthenticated redirect; normal role denied; kiosk role visible; kiosk role von anderer geschuetzter Route nach `/kiosk`; Demo-Banner; not_loaded; unknown; error; Logout; kein horizontaler Overflow bei 1920x1080.

---

### Task 8: Dokumentation, Security und Vollgates

**Files:**
- Modify: `src/lib/help-documentation.ts`
- Modify: `docs/DEMO-DATA.md`
- Create: `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md`
- Modify: `docs/ENTWICKLUNGSTAGEBUCH.md`, `docs/CURRENT-STATUS.md`, `docs/PROJECT-STATUS.yaml`, `docs/BSF-CURRENT-PRIORITIES.md`, `CHANGELOG.md`

- [ ] **Step 1: Hilfe/Betrieb dokumentieren.** Kiosk-Konto, keine Idle-Abmeldung im Kioskmodus, manuelle Abmeldung, Admin-Laden der Demo-Daten, keine Live-Daten.
- [ ] **Step 2: Supabase DB-Vertrag in Testumgebung/advisor pruefen.** Neue Migrationen, `has_permission`, Exklusivitaet; keine neue ERROR/CRITICAL Advisory-Warnung.
- [ ] **Step 3: Vollstaendige GitHub Security + CI auf exakt demselben Head.** Static, Unit/Components, Backend, API, RBAC/Security, Import/Export, Backup, Build, E2E, A11y, Debt, Technical Report/Quality Gate alle PASS.
- [ ] **Step 4: Erst nach Exact-Head-GREEN KIOSK-01 in Statusdokumenten als DONE und BSF-03A/#106 als NEXT markieren.**
- [ ] **Step 5: PR #141 auf Ready for Review stellen; nicht mergen/deployen.**

## Abschlussbericht

Der Abschlussbericht nennt Head-SHA, geaenderte Dateien, DB/RLS/Auth-Aenderungen, Rollenmatrix, Demo-Datensatzversion, Unit/Component/A11y/E2E, Security/Advisor/CI/Quality Gate, Dokumentation, `Merge: NEIN`, `Deploy: NEIN`, naechster Sprint `BSF-03A / #106`.
