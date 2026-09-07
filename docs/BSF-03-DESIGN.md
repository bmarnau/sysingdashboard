# BSF-03 — Kundenverantwortung und „Meine Kunden“ — Designbaseline

Stand: 2026-09-07  
Status: **DESIGN / IMPLEMENTIERUNG NOCH NICHT FREIGEGEBEN**  
Issue: #105  
Voraussetzung: BSF-02 / BSF-02C DONE

## 1. Ziel

BSF-03 führt Kundenverantwortung als eigene fachliche Beziehung ein und stellt eine serverseitig abgesicherte Kundensicht bereit:

`Meine Kunden → Kunde → Projekte → Arbeitspakete → Tätigkeiten`

Kundenverantwortung ist **keine neue globale Rolle** und **nicht AVKK-Verantwortung**.

Die fachliche Customer-Identität bleibt:

`(systemhouseId, customerId)`

## 2. Bestehende Grundlage

BSF-02/02C liefert bereits:

- `systemhouse_membership` als technische Systemhauszugehörigkeit,
- `customer_access` als technischen Customer-Zugriff mit `read | write`,
- Shared Projections für Project / WorkPackage / Activity,
- serverseitigen User-JWT-Read-/Publish-Pfad,
- Customer-/Systemhouse-RLS,
- fail-closed Cross-Customer-/Cross-Systemhouse-Grenzen.

Diese Strukturen werden **nicht** durch Kundenverantwortung ersetzt.

Verbindliche Trennung:

```text
systemhouse_membership    = technische Zugehörigkeit
customer_access           = technischer Read-/Write-Grant
customer_responsibility   = fachliche Verantwortungsbeziehung
AVKK responsibility       = eigener AVKK-Fachkontext
```

## 3. Fachliche Regeln V1

- Interne Sysing-Rollen `systemadministrator`, `administrator`, `teamlead`, `projectmanager`, `engineer` können Kundenverantwortung tragen.
- `customer` und `viewer` können keine Kundenverantwortung tragen.
- Ein Benutzer kann für `0..n` Kunden verantwortlich sein.
- Ein Kunde besitzt in V1 `0..1` aktuell primär verantwortlichen Sysing-Benutzer.
- Historische Verantwortungen werden beendet, nicht gelöscht.
- Verantwortung allein erweitert **nur den Read-Scope**.
- Verantwortung allein erzeugt **kein** Project-/WorkPackage-/Activity-Write-Recht.
- Bestehende `customer_access`-Write-Grants und fachliche Permissions bleiben für Writes zwingend.
- Teamlead darf alle Kunden des eigenen aktiven Systemhouse-Scopes lesen und als Arbeits-/Filterscope auswählen; das ist keine Impersonation.
- Systemadministrator und Administrator erhalten denselben expliziten All-Customer-Read-Scope für Betrieb und Administration.

## 4. Neue atomare Permissions

BSF-03 führt zwei eigene Permissions ein. Bestehende AVKK- oder User-Management-Permissions werden nicht umgedeutet.

### `customer.scope.all`

Bedeutung: alle Kunden innerhalb eines **aktiven eigenen Systemhouse-Scopes lesen**.

V1-Rollen:

- systemadministrator
- administrator
- teamlead

Nicht enthalten:

- projectmanager
- engineer
- customer
- viewer

Diese Permission ist ausdrücklich nur Read-Scope und erzeugt keine Schreibrechte.

### `customer.responsibility.manage`

Bedeutung: primäre Kundenverantwortung zuweisen, wechseln oder beenden.

V1-Rollen:

- systemadministrator
- administrator

Bewusste V1-Entscheidung: Teamlead erhält zunächst **kein** Vergaberecht. Damit bleibt die erste Implementierung least-privilege und nutzt die bereits bestehende administrative Personen-/Rollen-Sicht. Eine spätere Freigabe für Teamlead ist eine reine, explizite RBAC-Entscheidung und erfordert keine Änderung des fachlichen Responsibility-Modells.

`avkk.responsibility.assign` wird nicht wiederverwendet.

## 5. Datenmodell `customer_responsibility`

Vorgesehene additive Tabelle:

```text
id                  uuid PK
systemhouse_id      uuid NOT NULL
customer_id         uuid NOT NULL
user_id             uuid NOT NULL
valid_from          timestamptz NOT NULL
valid_to            timestamptz NULL
assigned_by         uuid NOT NULL
ended_by            uuid NULL
created_at          timestamptz NOT NULL
updated_at          timestamptz NOT NULL
```

Constraints / Beziehungen:

- Composite-FK `(customer_id, systemhouse_id) → customer(id, systemhouse_id)`.
- `user_id`, `assigned_by`, `ended_by` referenzieren `profiles`.
- `valid_to IS NULL OR valid_to > valid_from`.
- partieller Unique-Index auf `(systemhouse_id, customer_id)` für `valid_to IS NULL` erzwingt maximal eine aktuelle Verantwortung je Kunde.
- kein Hard Delete im normalen Pfad.

Historie entsteht durch:

1. aktuelle Beziehung mit `valid_to` beenden,
2. neue Beziehung als neue Zeile anlegen.

Die V1-Eindeutigkeit liegt damit nur im partiellen Index; eine spätere fachlich beschlossene Mehrfachverantwortung kann durch Änderung dieses Index-/Beziehungscontracts ergänzt werden, ohne Customer-Identität oder technische Access-Grants umzubauen.

## 6. Write-Contract für Verantwortung

Vorgesehene transaktionale RPC:

`public.bsf03_set_customer_responsibility(systemhouse_id, customer_id, responsible_user_id nullable)`

Eigenschaften:

- `SECURITY INVOKER`,
- `search_path = public`,
- Actor ausschließlich aus `auth.uid()`,
- `customer.responsibility.manage` zwingend,
- Actor muss aktiv sein,
- Zielkunde muss im exakten Systemhouse-/Customer-Scope liegen,
- Zielperson muss aktiv sein,
- Zielperson muss aktive Membership im gleichen Systemhouse besitzen,
- Zielperson muss mindestens eine zulässige interne Sysing-Rolle besitzen,
- `viewer` und `customer` als Ziel fail-closed,
- gleicher Zielbenutzer wie aktuell → idempotenter No-op,
- Wechsel: alte aktive Beziehung beenden + neue Zeile in **einer Transaktion**,
- `responsible_user_id = NULL` beendet die aktuelle Verantwortung ohne Ersatz,
- kein Service-Role-Normalpfad.

Die Tabelle erhält nur die minimal nötigen Grants und RLS. Direkte DML darf den RPC-Vertrag nicht umgehen; Trigger/Constraints müssen Identität, Historie und zulässige Änderungen zusätzlich absichern.

## 7. Effektiver Customer-Read-Scope

Neue serverseitige Semantik:

`has_customer_read_scope(userId, systemhouseId, customerId)`

Read ist nur erlaubt, wenn:

1. Konto aktiv,
2. aktive Membership im exakten Systemhouse,
3. und mindestens **eine** der folgenden Bedingungen gilt:
   - gültiger `customer_access` mit `read` oder `write`,
   - aktive eigene `customer_responsibility`,
   - `customer.scope.all`.

Zusätzlich bleibt für die App-Sicht `dashboard.view` erforderlich.

Dieser Helper ersetzt ausschließlich den **Read-Scope** in:

- `customer` SELECT,
- `shared_project_projection` SELECT,
- `shared_work_package_projection` SELECT,
- `shared_activity_projection` SELECT,
- serverseitigem Shared-Customer-Read-Guard.

Write-Pfade bleiben unverändert an `has_customer_access(..., 'write')` plus fachliche Permissions gebunden.

## 8. RLS-/Grant-Prinzip

- RLS auf `customer_responsibility` sofort aktiv.
- `PUBLIC` / `anon`: keine Tabellenprivilegien, keine RPC-Ausführung.
- `authenticated`: nur explizit erforderliche Rechte.
- kein DELETE-Grant / keine DELETE-Policy.
- Responsibility-SELECT nur für:
  - eigene Responsibility,
  - Benutzer mit bestehendem technischem Customer-Read-Scope,
  - `customer.scope.all`,
  - `customer.responsibility.manage`.
- Verantwortung darf niemals Cross-Systemhouse-/Cross-Customer-Zugriff erzeugen.
- Kenntnis einer Customer-ID reicht nie aus.

Aktuelle Supabase-Leitlinie bleibt berücksichtigt: Tabellen-Grants und RLS sind getrennte Schutzschichten; Data-API-Exposition wird weiterhin explizit und least-privilege behandelt.

## 9. Providerneutraler Runtime-Contract

Domain-/Runtime-Ebene kennt keine Supabase-RPC-Namen.

Vorgesehene Ports:

```text
CustomerScopeRepository
  listVisibleCustomers(userContext)
  readCustomerScope(systemhouseId, customerId)

CustomerResponsibilityRepository
  listResponsibilities(systemhouseId, customerIds)
  setPrimaryResponsibility(systemhouseId, customerId, userId | null)
```

Supabase bleibt eine konkrete Adapterimplementierung. Ein späterer Azure-SQL-/Entra-Provider muss denselben fachlichen Contract erfüllen können.

## 10. UI V1 — „Meine Kunden“

Der bestehende Dashboard-Tab-Ansatz wird beibehalten, die Implementierung aber in eigene Komponenten/Services ausgelagert; die bereits große `dashboard.tsx` erhält keine umfangreiche neue Fachlogik.

Vorgesehen:

- neuer Tab **Meine Kunden**,
- Liste aller serverseitig sichtbaren Kunden,
- Kennzeichnung:
  - Kundenstatus,
  - verantwortlicher Sysing,
  - eigener Scope: `Verantwortlich`, `Technischer Zugriff` oder `Alle Kunden`,
  - effektiver Zugriff: `Lesen` bzw. `Lesen + Schreiben`,
- Auswahl eines Kunden,
- Kundendetail aus dem Shared-Customer-Read-Pfad:
  - Projekte,
  - Arbeitspakete,
  - Tätigkeiten,
- keine lokale Filterung als Security Boundary,
- Editierfunktionen nur bei echtem `customer_access(write)` plus bestehender fachlicher Permission.

Verantwortungsverwaltung erscheint nur für `customer.responsibility.manage`.

## 11. Rollenwirkung V1

| Rolle | Verantwortung tragbar | Alle Kunden lesen | Verantwortung verwalten | Write durch Verantwortung |
|---|---:|---:|---:|---:|
| Systemadministrator | ja | ja | ja | nein |
| Administrator | ja | ja | ja | nein |
| Teamlead | ja | ja | nein | nein |
| Projektmanager | ja | nein | nein | nein |
| Engineer | ja | nein | nein | nein |
| Customer | nein | nein | nein | nein |
| Viewer | nein | nein | nein | nein |

Projektmanager/Engineer sehen ohne expliziten technischen Grant nur Kunden, für die sie aktuell verantwortlich sind. Bestehende technische `customer_access`-Grants bleiben unabhängig davon gültig.

## 12. Vorgesehene Testmatrix

DB-/RLS-/RPC-Tests müssen mindestens abdecken:

- T01 Tabelle/RLS vorhanden, deny-by-default.
- T02 PUBLIC/anon ohne Rechte.
- T03 authenticated ohne Membership/Access/Responsibility sieht keinen Customer.
- T04 gültiger `customer_access(read)` bleibt READ PASS.
- T05 gültiger `customer_access(write)` bleibt READ/WRITE PASS.
- T06 verantwortlicher Engineer ohne `customer_access` erhält READ.
- T07 Verantwortung allein erzeugt keinen WRITE.
- T08 Teamlead mit `customer.scope.all` liest Kunden des eigenen Systemhauses.
- T09 Teamlead Cross-Systemhouse DENY.
- T10 Projektmanager ohne Access/Responsibility DENY.
- T11 Viewer ohne Access DENY; Viewer bleibt Write DENY.
- T12 `dashboard.view` allein reicht nicht.
- T13 Administrator kann gültige Responsibility setzen.
- T14 Teamlead kann V1 keine Responsibility verwalten.
- T15 Engineer kann keine Responsibility verwalten.
- T16 Zielrolle Viewer DENY.
- T17 Zielrolle Customer DENY.
- T18 inaktives Zielkonto DENY.
- T19 fehlende/ungültige Ziel-Membership DENY.
- T20 Cross-Systemhouse-Zielperson DENY.
- T21 maximal eine aktive Responsibility pro Kunde.
- T22 Wechsel beendet alte Zeile und erhält Historie.
- T23 Unassign beendet aktive Zeile ohne Hard Delete.
- T24 gleicher Zielbenutzer ist idempotent.
- T25 fremde Customer-ID / IDOR DENY.
- T26 verantwortlicher Benutzer liest Project/WP/Activity desselben Kunden.
- T27 Verantwortung gewährt keine fremde Customer-Projektion.
- T28 Responsibility-DELETE nicht möglich.
- T29 RPC PUBLIC/anon DENY, authenticated gezielt ALLOW.
- T30 bestehende BSF-02C-Publish-/Atomicity-Regeln regressionsfrei.

Zusätzlich erforderlich:

- Frontend-/Backend-RBAC-Matrix synchron,
- Role Preview,
- Accessibility,
- Import/Export und Backup/Restore Regression,
- vollständige Security- und Exact-Head-CI,
- offizieller Supabase Security Advisor ohne neue BSF-03-Warnung.

## 13. Umsetzungsphasen und Lovable-Einsatz

### Phase A — DB/RBAC/RLS

Ein gezielter Lovable-Prompt ist vorgesehen für:

- additive Migration,
- neue Permissions in DB-`has_permission`,
- `customer_responsibility`,
- effektiven Read-Scope-Helper,
- Responsibility-Management-RPC,
- Grants/RLS/Trigger,
- persistentes DB-Testartefakt.

### Phase B — Runtime/UI

Danach außerhalb bzw. nur bei echtem Preview-Nutzen mit Lovable:

- providerneutrale Ports/Services,
- Supabase-Adapter,
- Server Functions,
- „Meine Kunden“-UI,
- Rollen-/Accessibility-/E2E-Abnahme,
- Hilfe/Benutzerhandbuch/technische Dokumentation.

Geplanter Lovable-Rahmen bleibt **1–2 Prompts**. Zum Designzeitpunkt BSF-03 verbraucht: **0**.

## 14. Nicht Bestandteil von BSF-03

- Vertretung / temporäre Stellvertretung → BSF-03E,
- AP-Kategorien → BSF-03D,
- Projektmanager-Controlling → BSF-03A,
- Teamlead-Leistungsnachweis → BSF-03B,
- Kunden-PDF → BSF-03C,
- vollständige zentrale/synchronisierte Datenstrategie → BSF-04,
- Mehrfachverantwortung pro Kunde in V1,
- produktive Microsoft-/Azure-/Agentenintegration.

## 15. Abnahmekriterien

BSF-03 ist erst DONE, wenn:

- Kundenverantwortung als eigene historische Beziehung umgesetzt ist,
- `Meine Kunden` serverseitig scoped funktioniert,
- Responsibility Read und technischer Write strikt getrennt sind,
- Teamlead-All-Customer-Read explizit und systemhouse-begrenzt ist,
- Viewer/Customer keine Responsibility erhalten können,
- Cross-Systemhouse/Cross-Customer/IDOR-Negativtests PASS,
- kein neuer Service-Role-Normalpfad entsteht,
- DB-/RLS-/RPC-Testmatrix PASS,
- offizieller Security Advisor ohne neue BSF-03-Warnung PASS,
- vollständige Exact-Head-CI inklusive E2E/Accessibility/Quality Gate PASS,
- Hilfe, Benutzerhandbuch, technische Dokumentation und tägliche Statusflächen synchron sind,
- Lovable-Promptbilanz fortgeschrieben ist.

Erst danach beginnt BSF-03D.
