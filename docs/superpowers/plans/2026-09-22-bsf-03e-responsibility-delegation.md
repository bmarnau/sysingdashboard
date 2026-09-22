# BSF-03E – Implementation Plan

Stand: 2026-09-22  
Issue: #63  
Design: `docs/BSF-03E-DESIGN.md`

## Ziel

BSF-03E liefert eine mandantensichere Personensicht für Projekt-/Arbeitspaket-Verantwortungen sowie historisierte Owner-/Deputy-Operationen, ohne Gesundheitsdaten, ohne neue konkurrierende Responsibility-Domäne und ohne UI als Sicherheitsgrenze.

## Verbindliche Reihenfolge

`P0 Scope-Hardening -> P1 Read Model -> P2 atomare Mutationen -> P3 UI/E2E -> P4 optional Bulk -> P5 Abschluss`

Produktcode beginnt erst nach belegtem RED-Vertrag für P0.

---

## P0 – Scope-Hardening

### Task 0.1 – Ist-Vertrag als Tests einfrieren

Neu:

- `supabase/tests/bsf-03e-responsibility-scope.sql`
- `src/__tests__/security/bsf03e-scope-contract.test.ts`

Zuerst RED für:

- Cross-Systemhouse,
- Cross-Customer,
- IDOR/BOLA,
- ungescopte Legacy-Subjects,
- Activity/Measure als Delegationsziel,
- direkte Data-API-Umgehung.

### Task 0.2 – AVKK-Subject-Scope additiv erweitern

Migration nur über das vorhandene Supabase-Migrationswerkzeug erzeugen.

Ziel:

- `avkk_subject.systemhouse_id uuid`,
- `avkk_subject.customer_id uuid`,
- deterministischer Backfill über Shared Projection,
- mehrdeutige/nicht auflösbare Legacy-Sätze bleiben fail-closed,
- neue gescopte Eindeutigkeit erst nach erfolgreicher Validierung aktivieren.

Keine Namens- oder Titelzuordnung.

### Task 0.3 – Serverseitige Scope-Helper

Provider-/DB-Vertrag muss den tatsächlichen Subject-Scope aus Shared Projection / AVKK-Subject ermitteln.

Mindestens:

- Scope aus Ressource ableiten,
- Membership prüfen,
- Customer Access prüfen,
- Permissions prüfen,
- Zielperson im selben Systemhouse validieren.

Keine Client-Rolle und kein Role Preview als Autorisierungsquelle.

### Task 0.4 – RLS/ACL härten

- `avkk_subject`,
- `avkk_responsibility`,
- `avkk_responsibility_type`.

Direkte Writes müssen denselben realen Scope beachten wie spätere RPCs.

P0-Abnahme:

- SQL-Negativtests PASS,
- Schema Drift PASS,
- keine neuen Security-Advisor-Findings.

---

## P1 – Personensicht Read Model

### Task 1.1 – Providerneutraler Port

Neu bevorzugt:

- `src/lib/avkk/responsibility-management.ts`
- `src/lib/avkk/responsibility-management.types.ts`

Vertrag:

```ts
interface ResponsibilityPersonViewRow {
  responsibilityId: string;
  personId: string;
  displayName: string;
  role: "owner" | "deputy";
  subjectType: "project" | "workpackage";
  subjectId: string;
  title: string;
  systemhouseId: string;
  customerId: string;
  customerName: string;
  status: string;
  due: string | null;
  atRisk: boolean;
  riskReasons: string[];
  validFrom: string;
  validTo: string | null;
}
```

Keine Supabase-Imports in der Fachlogik.

### Task 1.2 – Supabase Adapter / Read RPC

Read liefert nur minimal erforderliche Daten.

Kein Zugriff auf:

- E-Mail,
- Telefon,
- MFA,
- vollständige Profile,
- Activities/Leistungszeilen.

### Task 1.3 – Read Tests

Mindestens:

- berechtigte Personensicht,
- leere Sicht,
- fremder Customer leer/DENY,
- fremdes Systemhouse leer/DENY,
- historische Verantwortung nicht als aktiv,
- technische UUID nie als Anzeigename.

---

## P2 – Atomare Responsibility-Mutationen

### Task 2.1 – DB-RED-Vertrag

Mindestens:

- Owner A -> B atomar,
- ungültiges B -> vollständiger Rollback,
- exakt ein aktiver Owner,
- mehrere Deputies zulässig,
- identischer Deputy nicht doppelt,
- End setzt `valid_to`,
- Responsibility Types bleiben vollständig,
- Cross-Scope-Zielperson DENY.

### Task 2.2 – SECURITY-INVOKER-Transaktions-RPC

Ein schmaler Mutationseinstieg im User-JWT.

Vorgesehene Operationen:

- transfer owner,
- add deputy,
- end responsibility.

Keine Service Role.

### Task 2.3 – Audit

Audit muss Actor, Subject, Responsibility und Operation enthalten.

Keine Gesundheitsdaten.

---

## P3 – UI und E2E

### Task 3.1 – Route / Personensicht

Neue, klar getrennte Managementsicht.

Elemente:

- Personenfilter,
- aktive Projekte,
- aktive Arbeitspakete,
- Status,
- Termin,
- Risiko,
- Rolle,
- Gültigkeit.

### Task 3.2 – Einzelaktionen

- Owner übertragen,
- Deputy ergänzen,
- Deputy/Responsibility beenden.

Keine Bulk-Aktion in P3.

### Task 3.3 – E2E

Mindestens:

- Teamlead/Projektmanager im zulässigen Scope,
- Engineer/Viewer/Customer DENY,
- URL-Tampering,
- Cross-Customer,
- Cross-Systemhouse,
- Role Preview,
- A11y,
- Hard Reload / Persistenz.

---

## P4 – Bulk optional

Erst nach vollständig grünem P0–P3.

Vor Umsetzung explizite Entscheidung:

- vollständig atomar oder
- pro Element transaktional mit explizitem Ergebnisprotokoll.

Kein stilles Teilresultat.

---

## P5 – Abschluss

- Unit/Component,
- RBAC,
- RLS,
- DB,
- Backend/API,
- E2E,
- Accessibility,
- Backup/Restore,
- Import/Export,
- Production Build,
- Schema Drift,
- Security Advisor,
- Technical Debt,
- Technical Report & Quality Gate.

Dokumente synchronisieren:

- `docs/PROJECT-STATUS.yaml`,
- `docs/CURRENT-STATUS.md`,
- `docs/BSF-CURRENT-PRIORITIES.md`,
- `docs/SPRINT-PLAN-MVP-BSF.md`,
- `docs/ENTWICKLUNGSTAGEBUCH.md`,
- `CHANGELOG.md`,
- Help/User Documentation,
- Closure Report.

## Branch-/Merge-Regel

Die aktuelle Designarbeit basiert bewusst auf `main@181b0a0...`.

Die eigentliche Implementierung darf erst starten, wenn der Vorgänger BSF-03B sauber in die Basis aufgenommen ist oder der Implementierungsbranch ausdrücklich auf dem finalen BSF-03B-Kandidaten basiert.

Kein Merge oder Deploy durch diesen Plan.
