# BSF-KIOSK-02 Internal Read Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Apply TDD before product changes and verification-before-completion before PASS/DONE claims.

**Goal:** Den bestehenden Demo-Kiosk additiv um einen serverseitig autorisierten internen Hybrid-Provider erweitern, ohne UI-Neubau oder zweiten Aggregationspfad.

**Architecture:** Interne Kiosk-Metriken werden serverseitig aus dem BSF-03A-Controlling-Vertrag erzeugt. Der Browser kennt nur `KioskDataProvider`. Projekt-/AP-/Tätigkeitsdomänen sind intern; Verfügbarkeit/Infrastruktur/Support bleiben klar als Demo markiert.

**Spec:** `docs/BSF-KIOSK-02-DESIGN.md`, Issue #136.

## Global Constraints

- Voraussetzung: BSF-KIOSK-01 und BSF-03A vollständig abgenommen.
- Kein neuer DB-/RLS-/Grant-/Permission-Vertrag.
- KIOSK-01-Rollenexklusivität bleibt unverändert: `kiosk` == ausschließlich `kiosk.view`; keine reguläre Rolle erhält `kiosk.view`.
- Kein Service Role.
- Kein direkter Supabase-Zugriff aus Kiosk-Komponenten.
- Kein zweiter Stunden-/Billable-Aggregator.
- Keine stille Demo-Fallback-Semantik für ausgefallene interne Quellen.
- Keine Personennamen oder Engineer-IDs im Kiosk.
- Kein kundenbezogenes Leistungsranking.
- Kein Merge/Deploy ohne separate Freigabe.

---

## Task 1: Kiosk-Contract additiv für Quellenarten erweitern

**Files:**

- Modify: `src/lib/kiosk/kiosk-contract.ts`
- Modify: `src/lib/kiosk/demo-kiosk-scenarios.ts`
- Modify: Kiosk Contract-/Provider-Tests

- [ ] Roten Test für `mode=demo|hybrid|internal` schreiben.
- [ ] Roten Test für `sourceKind=demo|internal|unavailable` schreiben.
- [ ] `observedAt: string | null` je Domäne ergänzen.
- [ ] KIOSK-01 Demo-Provider explizit auf `mode=demo`, `sourceKind=demo` halten.
- [ ] Bestehende Default/Empty/Unknown/Error-Tests ohne Semantikverlust grün halten.

**Commit-Ziel:** `feat(kiosk): Quellenstatus im Snapshot-Vertrag ergänzen`

---

## Task 2: BSF-03A Freshness-Vertrag nutzen

**Files:**

- Modify nur falls in BSF-03A noch nicht vorhanden: ProjectControlling Result/Tests
- Create: `src/lib/kiosk/internal-kiosk-snapshot.ts`
- Create: `src/__tests__/lib/internal-kiosk-snapshot.test.ts`

- [ ] Roten Test für fehlende Freshness im aktuellen BSF-03A-Result schreiben.
- [ ] `oldestPublishedAt` und `latestPublishedAt` additiv aus den `published_at`-Werten der tatsächlich verwendeten Project-/WorkPackage-/Activity-Projections ableiten; keine DB-Migration.
- [ ] Roten Mapper-Test schreiben: Controlling-Summary -> interne Projects/WorkPackages/Activities-Karten.
- [ ] Labels ausdrücklich auf „mit Leistung im Zeitraum“ begrenzen.
- [ ] Projekte: Projekt-/Customer-Anzahl aus Controlling-Summary.
- [ ] AP: WorkPackage-Anzahl + Kategorie-Vollständigkeitszustand.
- [ ] Activities: Count, total/billable/non-billable hours, Billable-Quote.
- [ ] Keine Eurobeträge und keine Detailzeilen in Kiosk-Snapshot übernehmen.
- [ ] Mapper-Test grün nachweisen.

**Commit-Ziel:** `feat(kiosk): internes Controlling auf Wallboard-Metriken abbilden`

---

## Task 3: Interne Kiosk Server Function TDD

**Files:**

- Create: `src/lib/kiosk-runtime/internal-kiosk.functions.ts`
- Create: `src/__tests__/backend/internal-kiosk.functions.test.ts`

**Server-Pfad:**

```text
readInternalKioskSnapshotFn
  -> requireSupabaseAuth
  -> project.controlling.view
  -> systemhouse scope
  -> ProjectControllingService(current month)
  -> mapInternalKioskSnapshot
```

- [ ] Unauthenticated DENY rot testen.
- [ ] Viewer/Engineer/Customer DENY rot testen.
- [ ] fremdes Systemhaus DENY rot testen.
- [ ] mehrere Systemhäuser ohne expliziten Scope fail-closed testen.
- [ ] genau ein zulässiges Systemhaus automatisch auflösbar testen.
- [ ] Initialer interner Datenfehler führt zu unavailable/unknown und nicht zu Demo-Fallback.
- [ ] Server Function minimal implementieren.
- [ ] Backend-/Security-Tests grün nachweisen.

**Commit-Ziel:** `feat(kiosk): internen Snapshot serverseitig absichern`

---

## Task 4: InternalReadKioskDataProvider

**Files:**

- Create: `src/lib/kiosk/internal-kiosk-provider.ts`
- Create: `src/__tests__/lib/internal-kiosk-provider.test.ts`

- [ ] Roten Provider-Test schreiben.
- [ ] Provider ruft ausschließlich die interne Server Function auf.
- [ ] Provider kennt keine Supabase-Client-Instanz.
- [ ] Provider liefert `mode=hybrid`.
- [ ] interne drei Domänen `sourceKind=internal` beziehungsweise `unavailable`.
- [ ] Demo-Domänen aus dem bestehenden Demo-Vertrag übernehmen und `sourceKind=demo` erhalten.
- [ ] Kein interner Fehler darf Demo-Werte als Ersatz für Projekte/AP/Tätigkeiten einsetzen.
- [ ] Provider-Test grün nachweisen.

**Commit-Ziel:** `feat(kiosk): internen Hybrid-Provider ergänzen`

---

## Task 5: Route und UI für Hybridmodus

**Files:**

- Modify: `src/routes/_authenticated/kiosk.tsx`
- Modify: `src/components/kiosk/KioskView.tsx`
- Modify: `src/components/kiosk/KioskDomainCard.tsx`
- Modify: Kiosk Component Tests

- [ ] Roten Test für `mode=demo|internal` schreiben.
- [ ] technische `kiosk`-Session + `mode=demo` bleibt KIOSK-01-Vertrag.
- [ ] normale Session + `mode=internal` darf bis zur Child-Route gelangen; interne Daten bleiben serverseitig an `project.controlling.view` gebunden.
- [ ] technische `kiosk`-Session + manipuliertes `mode=internal` -> DENY/unavailable, kein Demo-Fallback.
- [ ] `mode=internal` nur mit internem Provider verdrahten.
- [ ] Keine automatische Demo-Umschaltung bei internem Fehler.
- [ ] Header `HYBRID — INTERNE DATEN + DEMO-DATEN` darstellen.
- [ ] Jede Domäne mit INTERN/DEMO/NICHT VERFÜGBAR kennzeichnen.
- [ ] internen Zeitraum sichtbar anzeigen.
- [ ] Datenstand aus Source-Freshness darstellen.
- [ ] Link auf `/projektcontrolling` nur für `project.controlling.view` anbieten.
- [ ] KIOSK-01 Demo-Szenarien unverändert nutzbar halten.
- [ ] Component Tests grün nachweisen.

**Commit-Ziel:** `feat(kiosk): Hybridmodus in bestehender Wallboard-UI darstellen`

---

## Task 6: Security, E2E und Accessibility

**Files:**

- Create: `e2e/specs/kiosk/kiosk-internal.spec.ts`
- Create: `e2e/specs/security/kiosk-internal-scope.spec.ts`
- Modify: `src/__tests__/a11y/kiosk.test.tsx`

- [ ] Demo-Modus weiterhin für technische `kiosk`-Session mit ausschließlich `kiosk.view` testen.
- [ ] Reguläre Rolle ohne `kiosk.view` bleibt im Default-/Demo-Pfad außerhalb des Kiosk.
- [ ] Interner Modus für Projektmanager/Teamlead/Admin mit `project.controlling.view` testen.
- [ ] technisches Kiosk-Konto im Internal-Modus -> DENY testen.
- [ ] Viewer/Engineer/Customer internal -> DENY testen.
- [ ] fremdes Systemhaus/Customer -> keine Daten testen.
- [ ] Hybridkennzeichnung testen.
- [ ] interner Fehler -> unavailable, kein Demo-Ersatz testen.
- [ ] A11y für Quellenbadges und Unknown-Zustände testen.
- [ ] Last-good-Refresh-Verhalten mit interner Quelle testen.

**Commit-Ziel:** `test(kiosk): internen Hybridmodus und Scope absichern`

---

## Task 7: Gezielter Lovable Preview-Pass

**Files:**

- Nur Kiosk-Präsentationskomponenten.

- [ ] Prompt aus `docs/LOVABLE-PROMPT-PLAN-KIOSK-02.md` verwenden.
- [ ] 1920x1080 und 1366x768 prüfen.
- [ ] Demo/Internal/Unavailable-Badges auf Entfernung lesbar prüfen.
- [ ] Keine Daten-/Auth-/Provideränderung zulassen.
- [ ] Drift auf `client.ts`, Preview-Auth, Migrationen prüfen.
- [ ] Targeted Tests erneut grün nachweisen.

**Commit-Ziel:** `style(kiosk): Hybrid-Quellenstatus verfeinern`

---

## Task 8: Dokumentation und vollständige Gates

**Files:**

- Create: `docs/BSF-KIOSK-02-CLOSURE-2026-09-14.md`
- Modify: `docs/ENTWICKLUNGSTAGEBUCH.md`
- Modify: `docs/CURRENT-STATUS.md`
- Modify: `docs/PROJECT-STATUS.yaml`
- Modify: `docs/BSF-CURRENT-PRIORITIES.md`
- Modify: technischer Prüfbericht
- Modify: `CHANGELOG.md`

- [ ] Keine DB-Migration für KIOSK-02 bestätigen.
- [ ] Security/RBAC-Scope dokumentieren.
- [ ] KIOSK-01 Demo-Regression nachweisen.
- [ ] BSF-03A Controlling-Regression nachweisen.
- [ ] vollständige Repository-CI inklusive E2E/A11y/Technical Debt/Quality Gate nachweisen.
- [ ] Exact-Head Security + CI verifizieren.
- [ ] Kein Merge/Deploy ohne Freigabe.

**Abschlussbericht:**

```text
BSF-KIOSK-02 STATUS
HEAD
DEMO-PROVIDER REGRESSION
INTERNAL-PROVIDER
HYBRID-QUELLENSTATUS
PERMISSION/SCOPE
DB/RLS/AUTH geändert JA/NEIN
IDOR/BOLA
A11y/E2E
Security/CI/Quality Gate
Dokumentation
MERGE = NEIN bis Freigabe
DEPLOY = NEIN
NÄCHSTER SPRINT = BSF-03B / #107
```
