# BSF-03E P3b operative AP-Arbeitssicht – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Berechtigte Team-/Projektleitungen können dieselbe autorisierte AP-Grundmenge nach Kunde, Verantwortlichem oder Fälligkeit betrachten und unabhängig sortieren und filtern.

**Architecture:** Die bestehende Route `/verantwortungen` erhält neben der Personensicht einen Bereich „Arbeitspakete“. Ein sessiongebundener Hook ruft ausschließlich `readWorkPackageWorkViewFn({ data: {} })` auf; Darstellung und Auswahl verwenden den bestehenden providerneutralen Read Contract. Der Server bestimmt die Referenzzeit und den realen RBAC/RLS-Scope vor jeder Gruppierung.

**Tech Stack:** React 19, TanStack Start/Router, vorhandene Radix-Tabs, Tailwind, Vitest/Testing Library, Playwright/Axe. Keine neuen Produktabhängigkeiten.

**Spec:** Issue [#63](https://github.com/bmarnau/sysingdashboard/issues/63), Abschnitte „P3b – AP-Arbeitssichten“ und „P3b-E2E-/Abnahmekriterien“; `docs/BSF-03E-DESIGN.md`; bestehende Verträge in `src/lib/avkk/work-package-work-view.types.ts`.

**Basis:** GitHub `main@b5acf3d9349bfb132a1a3615878024955d2a4385`. Post-Merge CI `37183668646` und Security `37183668658`: PASS am 04.10.2026. P3b-1-Hardening PR #170 ist integriert.

## Global Constraints

- Eine serverseitig autorisierte AP-Grundmenge; keine neuen Tabellen, RPCs, Rollen, RLS-Regeln, Responsibility-Quellen oder Persistenzpfade.
- `OVERDUE | TODAY | FUTURE | NO_DUE_DATE` und `asOfDate` stammen aus dem vorhandenen Server-/Domain-Vertrag mit `Europe/Berlin`.
- `UNASSIGNED` bleibt sichtbar; Deputies erscheinen zusätzlich zur primären Verantwortung und erzeugen keine AP-Duplikate.
- Gruppierung und Sortierung sind unabhängig; ausschließlich explizite Filter reduzieren die sichtbare Menge.
- Der Request akzeptiert keinen Browser-Scope, keine Browser-Referenzzeit und keine Client-Rolle. URL-Parameter werden nicht zur Autorisierung verwendet.
- Bei Session-/Permission-Wechsel, Refresh und Fehlern werden alte AP-Daten unmittelbar ausgeblendet; späte Antworten früherer Requests werden ignoriert.
- Die bestehende Personensicht bleibt erreichbar und ist die Standardansicht. AP-Sicht ist lesend; P2 bleibt die Schreibgrenze.
- Keine Gesundheitsdaten, produktiven Secrets oder technisch angezeigten Personen-UUIDs.
- Version des UI-Kandidaten: `1.68.0`. Kein Merge oder Deploy durch diesen Umsetzungsschnitt.

## Review Focus

- Gleichnamige Kunden/Owner: Gruppen verwenden stabile Identitäten statt Anzeigenamen; zwei unterschiedliche IDs bleiben zwei Gruppen.
- Wechsel des angemeldeten Benutzers oder Entzug der Permission: keine alten AP-Zeilen und kein Erfolg einer veralteten Antwort.
- Fehlgeschlagener Refresh: generischer Error-State ohne vorherige Daten oder Rohfehler/technische IDs; erneuter Versuch möglich.
- Filterwechsel bei bestehender Gruppierung/Sortierung: Zustand bleibt unabhängig; Reset stellt die ganze autorisierte Grundmenge wieder her.
- Mobile Ansicht und lange Titel: kein horizontaler Dokument-Overflow; alle Labels, Gruppen und AP-Felder bleiben erreichbar.

## Task 1: Identitätsbasierte Gruppen und sessiongebundener Read-Hook

**Files:**

- Modify: `src/lib/avkk/work-package-work-view.ts`
- Modify: `src/lib/avkk/work-package-work-view.types.ts`
- Create: `src/hooks/useWorkPackageWorkView.ts`
- Modify: `src/hooks/useCurrentUser.ts` (Generationsschutz und unmittelbare Identitätsinvalidierung als Voraussetzung der bestehenden Sessiongrenze)
- Test: `src/__tests__/lib/avkk/work-package-work-view.test.ts`
- Test: `src/__tests__/hooks/useWorkPackageWorkView.test.tsx`
- Test: `src/__tests__/hooks/current-user-work-view-session.test.tsx` (echte Profil-/AP-Hooks, nur externe Reads simuliert)

**Interfaces:**

- Consumes: `readWorkPackageWorkViewFn({ data: {} }): Promise<WorkPackageWorkViewRow[]>`, `useCurrentUser()`, `useRefreshSignal()`, `can(user, "avkk.management.view")`.
- Produces: `useWorkPackageWorkView(): { rows: readonly WorkPackageWorkViewRow[]; loading: boolean; error: string | null; refresh: () => void }`.
- `WorkPackageWorkViewGroup` erhält additiv `label: string`; `key` ist Customer-Scope, Owner-ID/`UNASSIGNED` oder DueGroup. Sortierung nutzt Labels und stabile Schlüssel als Tie-Breaker.

- [x] RED: unterschiedliche Kunden-/Personen-IDs mit demselben Namen ergeben zwei Gruppen; stabile AP-IDs bleiben genau einmal vorhanden.
- [x] RED: Hook-Success, DENY ohne Request, Sessionwechsel mit später Altantwort, Permission-Entzug, Refresh-Fehler und erneuter Versuch werden beobachtbar geprüft.
- [x] GREEN: minimale Identitätskorrektur und Hook implementieren; keine browserseitigen Scope-Parameter senden.
- [x] Verify: `bun run test src/__tests__/lib/avkk/work-package-work-view.test.ts src/__tests__/hooks/useWorkPackageWorkView.test.tsx`; Expected: alle PASS.
- [x] Review-Fix 10.10.2026: fünf tatsächliche Auth-/Profil-Races mit unveränderten Produktionshooks RED nachgewiesen. `useCurrentUser` invalidiert die publizierte Identität vor jedem Read und verwirft ältere Session-/Profilantworten über eine Aufrufgeneration.
- [x] Verify: `npm test -- src/__tests__/hooks/current-user-work-view-session.test.tsx`; 5/5 PASS. Ein serverseitiger Rollenentzug ohne beobachtetes Ereignis oder Refresh bleibt ein eigener Revalidierungsvertrag.

## Task 2: AP-Arbeitssicht in der bestehenden Verantwortungsroute

**Files:**

- Create: `src/components/avkk/work/WorkPackageWorkView.tsx`
- Create: `src/components/avkk/work/WorkPackageWorkViewControls.tsx`
- Create: `src/components/avkk/work/WorkPackageWorkViewGroups.tsx`
- Modify: `src/routes/_authenticated/verantwortungen.tsx`
- Test: `src/__tests__/components/avkk/work-package-work-view.test.tsx`

**Interfaces:**

- Consumes: Task-1-Hook, `selectWorkPackageWorkView(rows, selection)` und vorhandene Tabs/PermissionGate.
- Produces: `WorkPackageWorkView()` mit Kunden-/Owner-/Due-Gruppierung, Sortierung nach Fälligkeit/Titel/Kunde/Owner und Richtung, expliziten Text-/Kunden-/Owner-/Status-/Due-Filtern und Reset.
- Gruppen rendern jede stabile AP-ID einmal; Titel, Kunde, Status, Datum, Owner und Deputies sind ausgeschrieben. Keine Browserberechnung von DueGroup/Heute.

- [x] RED: derselbe AP-ID-Satz bei allen drei Gruppierungen; Deputy verursacht keine zweite Zeile, `UNASSIGNED` sichtbar.
- [x] RED: unabhängige Sortierung/Filter, Filter-Reset, Loading-, leere Grundmenge, leeres Filterergebnis und Error-State; Refresh-Aktion erreichbar.
- [x] GREEN: bedienbare, responsive Steuerelemente und AP-Karten implementieren; Route um „Personen“/„Arbeitspakete“ erweitern.
- [x] Verify: `bun run test src/__tests__/components/avkk/work-package-work-view.test.tsx`; Expected: alle PASS.

## Task 3: Browserabnahme und dauerhafte Dokumentation

**Files:**

- Create: `e2e/fixtures/work-package-work-view-e2e.ts`
- Create: `e2e/specs/avkk/work-package-work-view.spec.ts`
- Modify: `CHANGELOG.md`, `roadmap.md`, `docs/PROJECT-STATUS.yaml`, `docs/CURRENT-STATUS.md`, `docs/BSF-CURRENT-PRIORITIES.md`, `docs/ENTWICKLUNGSTAGEBUCH.md`, `src/lib/help-avkk-topics.ts`
- Create: `docs/BSF-03E-P3B-UI-VERIFICATION-2026-10-04.md`

**Interfaces:**

- Consumes: bestehende E2E-Auth-Fixture und synthetische ServerFn-Grenze; keine echte Supabase-Instanz.
- Produces: Browsernachweis und aktueller, ohne Chat ausführbarer Status-/Abnahmebericht. E2E-Mocks belegen UI-Verhalten; reale Autorisierung wird zusätzlich durch die unveränderten Backend-/Adapter-/DB-Verträge belegt.

- [x] RED/GREEN: Teamlead und Projektmanager können alle Gruppierungen bedienen; stabile AP-ID-Menge bleibt identisch; Filter/Sortierung und Reload geprüft.
- [x] Verify: Engineer/Viewer/Customer sowie serverseitiges DENY trotz erlaubter Browserrolle sehen keine AP-Daten. Manipulierte URL/LocalStorage erweitern die Menge nicht; Request enthält keine Scope-/Rollen-/Zeitparameter.
- [x] Verify: alle vier festen Due-Gruppen, Owner/Deputy/UNASSIGNED, Empty/Error/Retry; 1280/640/390 Pixel ohne Overflow; Axe ohne Verstöße.
- [x] Dokumentation: Version `1.68.0`, P3b-Kandidat und verbleibende P5-Gates ausdrücklich ausweisen. BSF-03E nicht pauschal DONE setzen; Lovable/Windows-Abnahme nur mit aktueller Evidenz behaupten.
- [x] Verify: `bun run test`, Typecheck, Lint, Prettier, Docs-/Manifest-/RBAC-/Golden-/Security-Checks, Build und gezielte Playwright-Suite. Expected: PASS; Umgebungsblocker mit konkreten Belegen getrennt ausweisen.
- [ ] Final: unabhängige Branch-Review, Draft-PR vom geprüften `main` und Exact-Head-CI/Security abwarten. Signaturstatus ausdrücklich prüfen; kein Merge/Deploy.

## Definition of Done dieses Schnitts

P3b-UI ist als Kandidat überprüfbar, wenn Task 1–3 mit Evidenz abgeschlossen sind, Dokumentation den tatsächlichen Stand wiedergibt und ein Draft-PR die Änderungen enthält. P5/BSF-03E-Gesamtabnahme und die lokale Windows-/Lovable-Synchronisation bleiben getrennte, noch nachzuweisende Gates.
