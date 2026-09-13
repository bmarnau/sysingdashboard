# BSF-03 P5 Kundenverantwortung verwalten Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine getrennte, systemhausweit nutzbare Verwaltungsoberfläche für Customer Responsibility bereitstellen, in der Systemadministrator, Administrator und Teamlead Verantwortliche datensparsam anzeigen, zuweisen, wechseln und beenden können, ohne dadurch operativen Customer Access zu erhalten.

**Architecture:** „Meine Kunden“ bleibt unverändert die persönliche fail-closed Arbeitssicht. P5 erhält einen eigenen providerneutralen Management-Port, serverseitige TanStack-Serverfunktionen und einen Supabase-Adapter im User-JWT. Breite Fremdleserechte auf `profiles`, `user_roles`, `systemhouse_membership` und `customer` werden nicht eingeführt; minimale Managementdaten werden über eng begrenzte RPCs geliefert. Schreibvorgänge laufen über SECURITY-INVOKER-RPCs und die bestehenden RLS-/Trigger-Grenzen; ein Verantwortungswechsel ist atomar `alte Verantwortung beenden -> neue Verantwortung anlegen`.

**Tech Stack:** React 19, TanStack Router/React Start, TypeScript, Supabase/PostgreSQL 17, RLS/RBAC, Vitest, Playwright, Bun, GitHub Actions.

**Spec:** `docs/BSF-03-CUSTOMER-RESPONSIBILITY-DESIGN.md`, `docs/BSF-03-RESPONSIBILITY-MANAGEMENT-READ-CONTRACT-2026-09-13.md`, GitHub Issue #105 sowie die am 2026-09-13 bestätigte Entscheidung: Manager dürfen Customer Responsibility für alle Kunden ihres eigenen Systemhauses verwalten, auch ohne eigenen `customer_access`; dadurch entsteht kein operativer Kundendatenzugriff.

## Global Constraints

- GitHub `main` ist Source of Truth; Ausgangscommit für P5 ist `844739aa066c0d6b56425bc74b1c5fa5bafa1cda`.
- Arbeitsbranch: `feat/bsf03-p5-responsibility-management`; keine direkten Änderungen auf `main`.
- `systemhouse_membership`, `customer_access` und `customer_responsibility` bleiben getrennte Beziehungen.
- `customer.responsibility.manage` bleibt ausschließlich bei `systemadministrator`, `administrator`, `teamlead`.
- Zulässige Zielrollen bleiben `systemadministrator`, `administrator`, `teamlead`, `projectmanager`, `engineer`; `viewer` und `customer` bleiben ausgeschlossen.
- Verantwortung erzeugt niemals `customer_access`, globale Rollen oder operative Projekt-/Arbeitspaket-/Tätigkeitsrechte.
- Keine breiten Fremdleserechte auf `profiles`, `user_roles`, `systemhouse_membership` oder `customer`.
- Keine Service Role im Browser oder regulären User-Pfad.
- Datenminimierung: Kandidaten liefern nur stabile User-ID und Anzeigename; Managementübersicht nur Customer-ID/-Name/-Status und aktuelle Responsibility-Metadaten. Keine E-Mail, Telefonnummer, MFA-Daten oder sonstige Profilfelder.
- Cross-Systemhouse, Cross-Customer und IDOR/BOLA bleiben fail-closed.
- Neue SECURITY-DEFINER-Logik nur als nicht exponierter interner Read-Helper mit `search_path = ''`, explizitem `auth.uid()`-/Permission-Check und explizit eingeschränkten EXECUTE-Rechten.
- Öffentliche Mutations-RPCs bleiben SECURITY INVOKER und stützen sich zusätzlich auf bestehende RLS-Policies und `customer_responsibility_target_guard`.
- Keine produktiven Schlüssel, Tokens, Passwörter oder Service-Role-Keys in Code, Tests, Prompts oder Dokumentation.
- TDD: Produktionscode erst nach einem Test, der wegen der noch fehlenden Funktion korrekt rot ist.
- Keine manuelle Bearbeitung von `src/routeTree.gen.ts`; TanStack-Generator/Build erzeugt Änderungen.
- Supabase-Migrationsdatei nicht frei benennen: vor der Implementierung mit der im Projekt verfügbaren Supabase-CLI bzw. Lovable-Migrationsfunktion erzeugen; den dabei tatsächlich erzeugten Pfad verwenden.

---

## File Map

**Neu:**

- `src/lib/customer-data/customer-responsibility-management.ts` — providerneutrale Typen, Port und reine Normalisierungs-/Service-Logik.
- `src/lib/customer-data-runtime/customer-responsibility-management.functions.ts` — authentifizierte Serverfunktionsgrenze.
- `src/integrations/supabase/customer-responsibility-management-adapter.ts` — User-JWT-Supabase-Provider; ausschließlich neue Management-RPCs und eigene Memberships.
- `src/components/customers/CustomerResponsibilityManagementView.tsx` — reine Darstellung und Aktionen der getrennten Managementsicht.
- `src/routes/_authenticated/kundenverantwortung/index.tsx` — Route und UI-State-Orchestrierung.
- `src/__tests__/lib/customer-responsibility-management.test.ts` — Fachlogiktests.
- `src/__tests__/security/customer-responsibility-management-functions.test.ts` — statische/runtime Security-Vertragsprüfungen.
- `e2e/fixtures/customer-responsibility-management-e2e.ts` — synthetische P5-Servergrenze für reproduzierbare UI-/Security-E2E.
- `e2e/specs/security/customer-responsibility-management.spec.ts` — P5 UI/RBAC/IDOR/Accessibility-E2E.
- `supabase/tests/bsf-03-p5-responsibility-management.sql` — reproduzierbare R19–R31 Datenbank-/Security-Negativtests.
- `supabase/migrations/<von Supabase erzeugter Name>` — Migration für private Read-Helper, öffentliche schmale Read-RPCs und atomare SECURITY-INVOKER-Mutationen; Dateiname wird ausschließlich vom Migrationswerkzeug erzeugt.

**Ändern:**

- `src/routes/_authenticated/dashboard.tsx` — separater Link „Kundenverantwortung“ nur unter `PermissionGate permission="customer.responsibility.manage"`.
- `src/integrations/supabase/types.ts` — ausschließlich generierte Typen für die neuen RPC-Signaturen.
- `docs/BSF-03-RESPONSIBILITY-MANAGEMENT-READ-CONTRACT-2026-09-13.md` — BLOCKED-Befund in den freigegebenen P5-Vertrag überführen.
- `docs/BSF-03-CUSTOMER-RESPONSIBILITY-DESIGN.md` — bestätigte systemhausweite Managementregel ergänzen.
- `docs/ENTWICKLUNGSTAGEBUCH.md`, `docs/CURRENT-STATUS.md`, `docs/PROJECT-STATUS.yaml`, `docs/BSF-CURRENT-PRIORITIES.md`, `docs/SPRINT-PLAN-MVP-BSF.md`, `CHANGELOG.md` — Abschluss-/Versionssync erst nach vollständiger P5-Abnahme.

---

### Task 1: Datenbankvertrag zuerst rot testen

**Files:**
- Create: `supabase/tests/bsf-03-p5-responsibility-management.sql`
- Read: `supabase/tests/bsf-03-customer-responsibility-rls.sql`
- Read: aktuelle BSF-03-Migrationen

**Interfaces:**
- Consumes: bestehende `customer_responsibility`, `can_manage_customer_responsibility`, `customer_responsibility_target_guard` und `customer.responsibility.manage`.
- Produces: R19–R31 als ausführbarer Vertrag für alle späteren DB-Änderungen.

- [ ] **Step 1: R19–R31 als fail-fast SQL-Tests schreiben**

Mindestens folgende Fälle als einzelne Assertions mit synthetischen `@example.invalid`-Daten und vollständigem `BEGIN/ROLLBACK` abbilden:

```text
R19 teamlead im eigenen Systemhouse -> Managementübersicht enthält auch Kunden ohne eigenen customer_access
R20 manager ohne Membership im Ziel-Systemhouse -> Übersicht/Kandidaten DENY bzw. leer
R21 engineer/viewer/customer ohne customer.responsibility.manage -> Management-Read DENY bzw. leer
R22 Kandidatenliste enthält nur aktive Memberships im angefragten Systemhouse
R23 viewer und customer erscheinen nie als Kandidaten
R24 Kandidaten-Rückgabe enthält keine email/phone/mfa/profile_image-Felder
R25 Cross-Systemhouse Customer/Responsibility wird nicht geliefert
R26 assign ohne eigenen customer_access, aber mit manage+Membership -> PASS
R27 assign ungültiger Zielperson -> DENY und vorheriger aktiver Verantwortlicher bleibt unverändert
R28 replace A -> B -> genau eine aktive Responsibility, A historisch ended, B aktiv
R29 replace A -> A -> idempotent, keine zusätzliche Historienzeile
R30 end -> aktive Responsibility beendet, Historie bleibt; wiederholtes end bleibt sicher
R31 parallele/zweite aktive Responsibility -> Unique-/Transaktionsschutz verhindert Doppelbelegung
```

- [ ] **Step 2: Test gegen den aktuellen Vor-P5-Zustand ausführen und RED belegen**

Erwartung: R19/R20/R24/R26–R30 schlagen wegen fehlender Management-RPCs korrekt fehl; bestehende RLS-Grundtests bleiben unverändert grün. Den exakten Testweg anhand der vorhandenen Supabase-/Repository-Hilfe ermitteln; keine CLI-Syntax raten.

- [ ] **Step 3: RED-Nachweis dokumentieren**

Im Abschlussbericht dieses Tasks festhalten: fehlende RPC-Namen, erwartete Fehlerursache, keine DB-Änderung bis hierhin.

- [ ] **Step 4: Commit**

```bash
git add supabase/tests/bsf-03-p5-responsibility-management.sql
git commit -m "test(bsf03): P5 Responsibility-Management-Vertrag festlegen"
```

---

### Task 2: Minimalen DB-Read- und Mutationsvertrag implementieren

**Files:**
- Create: tatsächliche, vom Supabase-Migrationswerkzeug erzeugte Migration für `bsf03_p5_responsibility_management`
- Modify/generated later: `src/integrations/supabase/types.ts`
- Test: `supabase/tests/bsf-03-p5-responsibility-management.sql`

**Interfaces:**
- Produces RPCs:
  - `customer_responsibility_management_overview(_systemhouse_id uuid)`
  - `customer_responsibility_management_candidates(_systemhouse_id uuid)`
  - `set_customer_responsibility(_systemhouse_id uuid, _customer_id uuid, _target_user_id uuid)`
  - `end_customer_responsibility(_systemhouse_id uuid, _customer_id uuid)`

Read shapes:

```ts
interface ResponsibilityManagementRow {
  customer_id: string;
  customer_name: string;
  customer_status: string;
  responsibility_id: string | null;
  responsible_user_id: string | null;
  responsible_display_name: string | null;
  responsible_since: string | null;
}

interface ResponsibilityCandidateRow {
  user_id: string;
  display_name: string;
}
```

- [ ] **Step 1: Migration ausschließlich über das vorhandene Migrationswerkzeug anlegen**

Name: `bsf03_p5_responsibility_management`. Den erzeugten Dateipfad übernehmen; keinen Timestamp manuell erfinden.

- [ ] **Step 2: Nicht exponierten Read-Helper schaffen**

`private`-Schema nur anlegen, wenn es in der Ziel-DB noch nicht existiert. Rechte deny-by-default setzen. Interne Read-Funktionen laufen `SECURITY DEFINER SET search_path TO ''` und prüfen innerhalb der Funktion anhand `auth.uid()`:

```sql
IF auth.uid() IS NULL
   OR NOT public.can_manage_customer_responsibility(auth.uid(), _systemhouse_id) THEN
  RAISE EXCEPTION 'customer_responsibility_management_denied'
    USING ERRCODE = '42501';
END IF;
```

Die Übersicht darf aus `public.customer`, `public.customer_responsibility` und für den aktuellen Holder ausschließlich dem Anzeigenamen aus `public.profiles` lesen. Die Kandidatenfunktion darf nur aktive Konten + aktive Membership im selben Systemhouse + zulässige interne Rollen berücksichtigen. Keine Profilfelder außer `id`/Anzeigename zurückgeben.

- [ ] **Step 3: Öffentliche schmale Read-RPCs ergänzen**

Öffentliche Wrapper bleiben `SECURITY INVOKER`; `PUBLIC`/`anon` EXECUTE entziehen, `authenticated` explizit erlauben. Das private Schema bleibt aus der Data-API-Expose-Liste heraus.

- [ ] **Step 4: Atomare SECURITY-INVOKER-Mutation `set_customer_responsibility` implementieren**

Semantik:

```text
1. auth.uid + can_manage_customer_responsibility prüfen
2. aktuelle aktive Responsibility für exakt (systemhouse_id, customer_id) lesen
3. falls target bereits aktuell -> bestehende ID zurückgeben, keine Historienzeile erzeugen
4. sonst aktuelle aktive Zeile auf ended + valid_to=now() setzen
5. neue aktive Zeile mit target anlegen
6. Target-Guard validiert aktive Zielperson/Rolle/Membership
7. schlägt INSERT fehl, rollt die gesamte Funktion inkl. Schritt 4 zurück
```

Die Funktion ist SECURITY INVOKER, damit Manager-Write-RLS und bestehende Trigger wirksam bleiben.

- [ ] **Step 5: `end_customer_responsibility` implementieren**

Explizite Manage-/Membership-Prüfung, exakt den aktuellen aktiven Datensatz beenden, bei bereits unzugeordnetem Customer idempotent `false`/kein Datensatz statt künstlicher Historie.

- [ ] **Step 6: R19–R31 ausführen und GREEN belegen**

Zusätzlich bestehende `supabase/tests/bsf-03-customer-responsibility-rls.sql` vollständig ausführen; keine Regression R00a–R18/R15b.

- [ ] **Step 7: Security Advisor read-only ausführen**

Zulässig bleibt nur die bereits akzeptierte SEC-01-Baseline. Jede neue Warnung durch P5 blockiert den Task.

- [ ] **Step 8: Types generieren und Commit**

`src/integrations/supabase/types.ts` ausschließlich aus der bestätigten DB-Signatur generieren, dann:

```bash
git add supabase/migrations supabase/tests src/integrations/supabase/types.ts
git commit -m "feat(bsf03): sicheren P5 Responsibility-Management-Vertrag ergänzen"
```

---

### Task 3: Providerneutrale Fachlogik und Supabase-Adapter TDD

**Files:**
- Create: `src/lib/customer-data/customer-responsibility-management.ts`
- Create: `src/integrations/supabase/customer-responsibility-management-adapter.ts`
- Create: `src/__tests__/lib/customer-responsibility-management.test.ts`

**Interfaces:**

```ts
export interface ManageableSystemhouse {
  systemhouseId: string;
  name: string;
}

export interface ResponsibilityManagementCustomer {
  systemhouseId: string;
  customerId: string;
  name: string;
  status: string;
  responsibility: null | {
    id: string;
    userId: string;
    displayName: string;
    responsibleSince: string;
  };
}

export interface ResponsibilityCandidate {
  userId: string;
  displayName: string;
}

export interface CustomerResponsibilityManagementRepository {
  listManageableSystemhouses(userId: string): Promise<ManageableSystemhouse[]>;
  listCustomers(systemhouseId: string): Promise<ResponsibilityManagementCustomer[]>;
  listCandidates(systemhouseId: string): Promise<ResponsibilityCandidate[]>;
  setResponsibility(input: {systemhouseId: string; customerId: string; targetUserId: string}): Promise<string>;
  endResponsibility(input: {systemhouseId: string; customerId: string}): Promise<boolean>;
}
```

- [ ] **Step 1: Fachtests RED schreiben**

Tests müssen Sortierung, Null-Responsibility, doppelte Kandidaten-Deduplizierung, leere Zustände und Fehlerweitergabe abbilden. Keine Supabase-Mocks in der reinen Fachlogik.

- [ ] **Step 2: Tests ausführen und erwartetes RED prüfen**

```bash
bunx vitest run src/__tests__/lib/customer-responsibility-management.test.ts
```

Erwartung: FAIL, weil Modul/Exports fehlen.

- [ ] **Step 3: Minimalen providerneutralen Port und reine Helfer implementieren**

Keine Supabase-/React-Imports in `customer-responsibility-management.ts`.

- [ ] **Step 4: Supabase-Adapter implementieren**

- `listManageableSystemhouses`: nur eigene aktive Memberships + per RPC bestätigte Manage-Berechtigung.
- `listCustomers`: ausschließlich `customer_responsibility_management_overview`.
- `listCandidates`: ausschließlich `customer_responsibility_management_candidates`.
- Mutationen: ausschließlich `set_customer_responsibility` / `end_customer_responsibility`.
- Kein Service-Role-Client, kein direkter Fremdread aus `profiles`, `user_roles`, `systemhouse_membership` oder `customer`.

- [ ] **Step 5: GREEN + RBAC-Gate**

```bash
bunx vitest run src/__tests__/lib/customer-responsibility-management.test.ts
bun run rbac:check
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/customer-data/customer-responsibility-management.ts src/integrations/supabase/customer-responsibility-management-adapter.ts src/__tests__/lib/customer-responsibility-management.test.ts
git commit -m "feat(bsf03): providerneutralen Responsibility-Management-Service ergänzen"
```

---

### Task 4: Serverfunktionsgrenze TDD und Spoofing-Schutz

**Files:**
- Create: `src/lib/customer-data-runtime/customer-responsibility-management.functions.ts`
- Create: `src/__tests__/security/customer-responsibility-management-functions.test.ts`

**Interfaces:**
- `listResponsibilityManagementFn`
- `listResponsibilityCandidatesFn`
- `setCustomerResponsibilityFn`
- `endCustomerResponsibilityFn`

- [ ] **Step 1: Security-Tests RED schreiben**

Mindestens prüfen:

```text
- requireSupabaseAuth ist auf allen vier Serverfunktionen vorhanden
- userId/Rolle werden nie aus Client-Input übernommen
- systemhouseId/customerId/targetUserId werden mit z.string().uuid() validiert
- Permission/Scope wird serverseitig über User-JWT/DB-RPC erzwungen
- kein Admin-/Service-Role-Client importiert
- keine direkte profiles/user_roles-Fremdleseabfrage
- Fehler für fremde/nicht zulässige Scopes ist datenarm
```

- [ ] **Step 2: RED prüfen**

```bash
bunx vitest run src/__tests__/security/customer-responsibility-management-functions.test.ts
```

- [ ] **Step 3: Serverfunktionen minimal implementieren**

`requireSupabaseAuth` wiederverwenden. Nur validierte IDs aus `data`; Identität ausschließlich `context.userId`/User-JWT. Adapter dynamisch laden wie bei `my-customers.functions.ts`.

- [ ] **Step 4: GREEN + bestehende BSF-03 Securitytests**

```bash
bunx vitest run src/__tests__/security/customer-responsibility-management-functions.test.ts src/__tests__/security/my-customers-functions.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/customer-data-runtime/customer-responsibility-management.functions.ts src/__tests__/security/customer-responsibility-management-functions.test.ts
git commit -m "feat(bsf03): P5 Serverfunktionsgrenze absichern"
```

---

### Task 5: Getrennte Management-UI TDD/E2E

**Files:**
- Create: `src/components/customers/CustomerResponsibilityManagementView.tsx`
- Create: `src/routes/_authenticated/kundenverantwortung/index.tsx`
- Modify: `src/routes/_authenticated/dashboard.tsx`
- Generated: `src/routeTree.gen.ts`
- Create: `e2e/fixtures/customer-responsibility-management-e2e.ts`
- Create: `e2e/specs/security/customer-responsibility-management.spec.ts`

**Interfaces:**
- UI erhält nur `ManageableSystemhouse[]`, `ResponsibilityManagementCustomer[]`, `ResponsibilityCandidate[]` und Action-Callbacks.
- Keine operative Shared Projection in dieser Route.

- [ ] **Step 1: E2E zuerst RED schreiben**

Szenarien:

```text
E01 systemadministrator/admin/teamlead sieht Dashboard-Link „Kundenverantwortung“
E02 engineer/viewer/customer sieht keinen Link
E03 direkter URL-Aufruf ohne Manage-Recht zeigt generische Ablehnung/kein Datenleck
E04 Manager sieht alle Kunden seines Systemhauses auch ohne eigenen customer_access
E05 Manager sieht keine Kunden eines fremden Systemhauses
E06 unzugeordneter Kunde ist sichtbar und zuweisbar
E07 Kandidatenliste enthält Engineer/PM/Teamlead/Admin/SA, nie Viewer/Customer
E08 Wechsel A -> B aktualisiert UI; A bleibt nicht als aktiv sichtbar
E09 ungültiges Ziel führt zu Fehlermeldung, bisheriger Verantwortlicher bleibt sichtbar
E10 Beenden entfernt aktuelle Zuordnung, Kunde bleibt als „nicht zugeordnet“ verwaltbar
E11 Rollen-Preview/Spoofing allein verschafft keine Serverrechte
E12 keine E-Mail/Telefon/MFA-Daten im DOM/Response-Fixture
E13 Keyboard/Labels/Dialogfokus/ARIA für Auswahl und Bestätigung PASS
```

- [ ] **Step 2: RED ausführen**

```bash
bunx playwright test e2e/specs/security/customer-responsibility-management.spec.ts --project=chromium
```

Erwartung: Route/Link fehlen.

- [ ] **Step 3: UI minimal implementieren**

Layout:

```text
Kundenverantwortung
[Systemhaus-Auswahl, nur wenn >1]

Kunde                  Verantwortlich            seit         Aktion
Musterkunde GmbH       Sam Marnau                13.09.2026   Ändern | Beenden
Beispiel AG             Nicht zugeordnet          —            Zuweisen
```

Zuweisen/Ändern nutzt einen zugänglichen Dialog mit Kandidatenauswahl und expliziter Bestätigung. Beenden verlangt eine Bestätigung. Keine operative Kundendetail-/Projektansicht in diesem Bereich.

- [ ] **Step 4: Dashboard-Link mit PermissionGate ergänzen**

```tsx
<PermissionGate permission="customer.responsibility.manage">
  <Link to="/kundenverantwortung">Kundenverantwortung</Link>
</PermissionGate>
```

Dies ist nur UI-Komfort; Server-/DB-Prüfung bleibt autoritativ.

- [ ] **Step 5: E2E GREEN + Accessibility**

```bash
bunx playwright test e2e/specs/security/customer-responsibility-management.spec.ts --project=chromium
```

Danach die vorhandene Accessibility-Suite ausführen.

- [ ] **Step 6: Commit**

```bash
git add src/components/customers/CustomerResponsibilityManagementView.tsx src/routes/_authenticated/kundenverantwortung src/routes/_authenticated/dashboard.tsx src/routeTree.gen.ts e2e/fixtures/customer-responsibility-management-e2e.ts e2e/specs/security/customer-responsibility-management.spec.ts
git commit -m "feat(bsf03): Kundenverantwortung verwaltbar machen"
```

---

### Task 6: Vertrags- und Produktdokumentation synchronisieren

**Files:**
- Modify: `docs/BSF-03-RESPONSIBILITY-MANAGEMENT-READ-CONTRACT-2026-09-13.md`
- Modify: `docs/BSF-03-CUSTOMER-RESPONSIBILITY-DESIGN.md`
- Modify: `docs/ENTWICKLUNGSTAGEBUCH.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/CURRENT-STATUS.md`
- Modify: `docs/PROJECT-STATUS.yaml`
- Modify: `docs/BSF-CURRENT-PRIORITIES.md`
- Modify: `docs/SPRINT-PLAN-MVP-BSF.md`

- [ ] **Step 1: Read-Contract auf freigegebene Entscheidung aktualisieren**

Dokumentieren:

```text
- Manager darf systemhausweit Responsibilities verwalten, auch ohne customer_access.
- Dies öffnet keine operativen Customer-Daten.
- „Meine Kunden“ bleibt unverändert persönlich/fail-closed.
- Minimaler Read-Vertrag liefert nur Customer-Metadaten + Responsibility-Anzeigename bzw. Kandidaten-ID/-Anzeigename.
- Breite Self-only-RLS-Regeln bleiben unverändert.
- Mutationen sind atomar und RLS-/Trigger-gesichert.
```

- [ ] **Step 2: Version/Changelog nach tatsächlichem Featureumfang fortschreiben**

P5 ist eine sichtbare neue Managementfunktion; Minor-Version gemäß vorhandener Projektregel erhöhen. Keine Versionsnummer vor erfolgreicher Implementierung erfinden: obersten CHANGELOG-Eintrag und Projektmanifest synchron in demselben Commit setzen.

- [ ] **Step 3: Projekt-/Sprintstatus erst nach vollständigen Tests auf P5 abgeschlossen setzen**

BSF-03 erst dann auf DONE setzen, wenn Task 7 vollständig PASS ist. Vorher bleibt `in-progress`.

- [ ] **Step 4: Docs-Gates**

```bash
bun run docs:check
bun run project-status:check
bunx prettier --check docs CHANGELOG.md
```

- [ ] **Step 5: Commit**

```bash
git add docs CHANGELOG.md
git commit -m "docs(bsf03): P5 Responsibility-Management dokumentieren"
```

---

### Task 7: Vollständige Verifikation, Git-Hygiene und PR

**Files:** keine fachlichen Neuänderungen; nur Fixes für nachgewiesene Fehler und dann erneut vollständige Gates.

- [ ] **Step 1: Vollständige lokale/Agent-Gates ausführen**

Mindestens:

```bash
bunx prettier --check .
bun run lint
bun run typecheck
bun run rbac:check
bun run docs:check
bun run project-status:check
bun run test:backend
bun run test:api
bun run test:io
bun run test:backup:integrity
bun run build
bunx vitest run
bunx playwright test --project=chromium
```

Zusätzlich vorhandene Security-, Accessibility-, Technical-Debt- und Technical-Report-Gates ausführen.

- [ ] **Step 2: Supabase-Live-/Security-Abnahme**

- R19–R31 PASS und R00a–R18/R15b Regression PASS.
- offizieller Security Advisor PASS; keine neue P5-Warnung.
- keine neuen breiten Grants/Policies.
- kein `service_role` im Browser/Runtime-Pfad.

- [ ] **Step 3: Git-Hygiene**

```bash
git diff --check
git status
git diff main...HEAD --name-status
```

Prüfen: keine Debug-/Temp-/Secret-Dateien, keine unrelated Changes, keine Änderung der „Meine Kunden“-RLS-Sichtbarkeit, keine manuelle RouteTree-Drift.

- [ ] **Step 4: Draft-PR gegen aktuelles `main` öffnen**

PR-Body muss P5-Scope, DB-/Security-Vertrag, R19–R31, UI-Sicht, Datenminimierung, Version, ausgeführte Tests, bekannte Risiken und ausdrücklich `Deploy: NEIN` enthalten.

- [ ] **Step 5: Exact-Head-GitHub-Gates abwarten und auswerten**

Security + vollständige CI inkl. E2E, Accessibility, Technical Debt und Technical Report & Quality Gate müssen auf exakt demselben PR-Head PASS sein. Bei Fehlern: Root Cause -> kleinster Fix; Git/CI-Fehler bevorzugt mit Codex, falls Credits verfügbar, sonst projektweiter dokumentierter Fallback.

- [ ] **Step 6: Erst nach Exact-Head-PASS Merge-Freigabe**

Vor Merge Head-SHA, Diff, Behind/Ahead und Changed Files erneut prüfen. Kein Merge bei laufenden/fehlgeschlagenen Required Checks.

---

## Self-Review

- Spec coverage: systemhausweite Managerverwaltung ohne eigenen Customer Access, Datenminimierung, unveränderte „Meine Kunden“-Grenze, RBAC, RLS, Audit/Lifecycle, Cross-Systemhouse/IDOR, atomarer Wechsel, UI, E2E, Accessibility, Dokumentation und Abschlussgates sind jeweils einem Task zugeordnet.
- Placeholder scan: Der einzige absichtlich nicht vorbenannte Pfad ist die Supabase-Migration; dies folgt der verbindlichen Supabase-Regel, Migrationsdateinamen ausschließlich vom Migrationswerkzeug erzeugen zu lassen.
- Type consistency: `systemhouseId`, `customerId`, `userId/targetUserId`, `ResponsibilityManagementCustomer` und `ResponsibilityCandidate` sind in allen Tasks konsistent.
- Scope guard: Keine operative Kundendetailfunktion wird in die Managementroute verschoben; keine Abrechnung, AP-Kategorien oder BSF-03A/B/C/D/E-Funktion wird vorgezogen.
