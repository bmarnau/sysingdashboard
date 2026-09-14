# Sysing Dashboard — Lovable-Promptplan BSF-03A

Stand: 2026-09-14
Status: PLANUNG / NICHT AUSGEFÜHRT
Issue: #106
Design: `docs/BSF-03A-DESIGN.md`
Implementation Plan: `docs/superpowers/plans/2026-09-14-bsf-03a-project-controlling.md`

## 1. Zweck

Lovable wird in BSF-03A nur dort eingesetzt, wo seine Supabase-/Preview-Nähe einen klaren Vorteil bringt:

1. kontrollierter Live-Precheck und DB-Migrationspfad,
2. später gezielter UI-/Preview-Pass.

Providerneutrale Fachlogik, Testverträge und Security-Grenzen werden vorher im Repository festgelegt.

## 2. Harte Leitplanken

Für jeden BSF-03A-Lauf gelten:

- zuerst analysieren,
- dann nur im freigegebenen Scope umsetzen,
- danach testen,
- dokumentieren,
- mit strukturiertem Abschlussbericht enden,
- kein Service-Role-Normalpfad,
- keine produktiven Secrets,
- kein Project.lead als Sicherheitsidentität,
- keine Project-Responsibility-Tabelle vorziehen,
- keine Personendirectory nur für diesen Sprint,
- keine Änderung von `billable` oder `billingStatus` durch das Controlling,
- keine Finalisierung,
- keine Eurobeträge erfinden,
- kein MCP/Graph/SharePoint/Agent,
- kein Merge,
- kein Deploy.

`previewAuthStorage.ts` darf nicht neu eingeführt werden. Änderungen an `src/integrations/supabase/client.ts` sind für BSF-03A nicht vorgesehen und müssen bei Auftreten als Governance-Drift behandelt werden.

## 3. Prompt 03A-L1 — Live-Precheck und kontrollierte DB-Grundlage

```text
SYSING DASHBOARD — BSF-03A / L1
LIVE-PRECHECK + KATEGORIE-/PERMISSION-GRUNDLAGE

VERBINDLICHE BASIS
1. Lies docs/BSF-03A-DESIGN.md vollständig.
2. Lies docs/superpowers/plans/2026-09-14-bsf-03a-project-controlling.md.
3. Prüfe aktuellen Git-Branch, Head und Main-Baseline.
4. Analysiere zuerst read-only; keine Änderung vor abgeschlossenem Precheck.

PHASE A — READ-ONLY PRECHECK
Prüfe live und repository-seitig mindestens:
- Spalten/Constraints/Indizes von shared_work_package_projection,
- Attribute von public.bsf02c_publish_shared_projection_snapshot,
- RPC bleibt SECURITY INVOKER / prosecdef=false,
- RLS/Grants der drei Shared-Projection-Tabellen,
- aktuelle has_permission-Rollenmatrix,
- reference_catalog workpackage.category und Systemhouse-Scope,
- aktuelle Migrationshistorie,
- ob category_key/category_observed bereits live existieren,
- ob project.controlling.view bereits existiert.

Melde DRIFT oder BLOCKED, wenn Live-Schema und GitHub-Migrationen nicht konsistent sind. Keine alte Migration nachträglich editieren.

PHASE B — TESTARTEFAKT ZUERST
Lege/ergänze supabase/tests/bsf03a-project-controlling.sql transaktional und fail-fast.
Mindestens testen:
- Permission allow: sysadmin/admin/teamlead/projectmanager,
- Permission deny: engineer/viewer/customer,
- category_key + category_observed vorhanden,
- Legacy-Payload ohne category_key bleibt rückwärtskompatibel,
- neue Payload category_key=null -> observed=true,
- neue Payload category_key=<key> -> observed=true + Key,
- Update alter Payload überschreibt vorhandene Kategorie nicht,
- Kategorieänderung erhöht Source Revision über neuen Hash,
- Cross-Systemhouse bleibt DENY,
- Publish-RPC bleibt SECURITY INVOKER,
- Atomic rollback unverändert.

PHASE C — MINIMALE MIGRATION
Nur wenn A und B klar sind:
- neue additive Migration,
- category_key nullable,
- category_observed NOT NULL DEFAULT false,
- geeigneter aktiver Scope-/Kategorie-Index,
- has_permission um project.controlling.view erweitern,
- bsf02c_publish_shared_projection_snapshot rückwärtskompatibel um Kategorie erweitern,
- keine neue Tabelle für Controlling,
- keine Project Responsibility,
- keine Service Role.

Alte Payload ohne category_key:
- Insert -> category_observed=false,
- Update -> bisherige category_key/category_observed unverändert.

Neue Payload enthält category_key immer explizit, auch null.

PHASE D — REAL TEST
- BSF-03A SQL-Test vollständig real ausführen,
- Null-Residuen bestätigen,
- bestehende BSF-02C SQL-Regressionssuite vollständig ausführen,
- offiziellen Supabase Security Advisor read-only ausführen.

ZULÄSSIGE SECURITY-BASELINE
Bekannte SEC-01-Warnungen getrennt von neuen BSF-03A-Findings behandeln. Neue unerklärte WARN/ERROR/CRITICAL sind nicht akzeptabel.

PHASE E — REPOSITORY
- Generated Types nur aktualisieren, wenn das real bestätigte Schema dies erfordert.
- Keine Preview-Auth-Sonderlogik.
- Dokumentiere exakte Migration, Tests und Advisor-Ergebnis.

ABNAHMEKRITERIEN
- GitHub und Live-Schema konsistent,
- Permission exakt wie Design,
- Kategorien rückwärtskompatibel publizierbar,
- SECURITY INVOKER unverändert,
- BSF-02C Regression PASS,
- keine Residuen,
- keine neue unerklärte Security-Warnung.

ABSCHLUSSBERICHT
- PRECHECK
- LIVE_SCHEMA
- MIGRATION_HISTORY
- DATEIEN_GEAENDERT
- DB_GEAENDERT JA/NEIN
- MIGRATION
- RPC_PROSECDEF
- PERMISSION_MATRIX
- TESTS mit Txx-Ergebnissen
- RESIDUEN
- BSF02C_REGRESSION
- SECURITY_ADVISOR
- CLIENT_TS_GEAENDERT JA/NEIN
- PREVIEW_AUTH_STORAGE_VORHANDEN JA/NEIN
- COMMIT
- MERGE = NEIN
- DEPLOY = NEIN
```

## 4. Prompt 03A-L2 — Controlling UI/Preview-Pass

Diesen Prompt erst verwenden, nachdem Domain-Service, Server Function, Adapter und targeted Tests repository-seitig vorhanden sind.

```text
SYSING DASHBOARD — BSF-03A / L2
PROJEKTCONTROLLING UI / PREVIEW

VERBINDLICHE BASIS
- Lies docs/BSF-03A-DESIGN.md.
- Lies den Implementation Plan.
- Prüfe Branch, Head und git diff.
- Analysiere zuerst die bereits implementierten ProjectControlling-Komponenten und Tests.

HARTE GRENZEN
- Keine DB-/Migration-/RLS-/Grant-/Function-Änderung in diesem Prompt.
- Keine Auth-/RBAC-Änderung.
- Keine Providerlogik in UI-Komponenten.
- Keine Änderung von billable/billingStatus.
- Keine Finalisierung.
- Keine Eurobeträge.
- Keine Personennamen-/Engineer-Rangliste.
- Kein Project.lead als Scope.
- Kein client.ts-Hack.
- Kein previewAuthStorage.ts.
- Kein Merge/Deploy.

PHASE A — ANALYSE
Prüfe:
- Route /projektcontrolling,
- Zeitraumfilter,
- Systemhaus/Kunde/Projekt/AP-Filterkaskade,
- Kategorie-Filter,
- Billable-Filter,
- KPI-Hierarchie,
- täglichen Stundenverlauf,
- Drill-down Kunde -> Projekt -> AP -> Tätigkeit,
- Legacy/None/Inactive/Unknown-Kategorie,
- Loading/Empty/Error/Too-many-results,
- responsive Darstellung.

PHASE B — UI-UMSETZUNG
Nur reine Präsentations-/Usability-Verbesserungen:
- klare Filterleiste,
- kompakte KPI-Karten,
- lesbarer Trend,
- zugänglicher Drill-down,
- große Tabellen mit sinnvoller Overflow-Behandlung,
- sichtbare Datenvollständigkeit.

PHASE C — TEST
Mindestens:
- Controlling Component Tests,
- A11y,
- Controlling E2E,
- Security-E2E für manipulierte Scope-IDs,
- TypeScript,
- ESLint,
- Prettier.

PHASE D — DOKUMENTATION
Nur tatsächliche Änderungen dokumentieren. Kein DONE vor vollständiger GitHub-CI.

ABNAHMEKRITERIEN
- Filter eindeutig und kaskadiert,
- Summen/Trend lesbar,
- Unknown/Legacy nicht verschleiert,
- keine Schreibaktion,
- keine Security-/Architekturdrift,
- targeted Tests PASS.

ABSCHLUSSBERICHT
- ANALYSEERGEBNIS
- HEAD
- DATEIEN_GEAENDERT
- UI_AENDERUNGEN
- FACHLOGIK_GEAENDERT JA/NEIN
- DB_RLS_AUTH_GEAENDERT JA/NEIN
- SCOPE_DRIFT JA/NEIN
- CLIENT_TS_GEAENDERT JA/NEIN
- PREVIEW_AUTH_STORAGE_VORHANDEN JA/NEIN
- TESTS
- PREVIEW
- OFFENE_PUNKTE
- COMMIT
- MERGE = NEIN
- DEPLOY = NEIN
```

## 5. Prompt 03A-L3 — Abschluss-/Driftprüfung

```text
SYSING DASHBOARD — BSF-03A / L3 ABSCHLUSSPRÜFUNG

Arbeite primär read-only.

1. Prüfe exakten Head und gesamten Diff gegen aktuelle Main-Baseline.
2. Prüfe, dass project.controlling.view exakt den vier vorgesehenen Rollen zugeordnet ist.
3. Prüfe, dass Project.lead nirgends als Autorisierungsmerkmal verwendet wird.
4. Prüfe category_key/category_observed End-to-End.
5. Prüfe BSF-02C RPC weiterhin SECURITY INVOKER.
6. Prüfe keine neue Service-Role-/Auth-Sonderlogik.
7. Prüfe keine Project-Responsibility-/Personendirectory-Vorwegnahme.
8. Prüfe keine schreibenden Billing-/Finalisierungsaktionen.
9. Führe targeted Tests erneut aus.
10. Führe keine kosmetische Änderung ohne reproduzierten Befund aus.
11. Dokumentiere jeden Befund.
12. Kein Merge. Kein Deploy.

ABSCHLUSSBERICHT
- HEAD
- SCOPE_PASS JA/NEIN
- PERMISSION_PASS JA/NEIN
- CATEGORY_BRIDGE_PASS JA/NEIN
- RPC_SECURITY_INVOKER JA/NEIN
- IDOR_BOLA_PASS JA/NEIN
- DRIFT_FINDINGS
- TESTS
- DATEIEN_GEAENDERT
- READY_FOR_FULL_CI JA/NEIN
- MERGE = NEIN
- DEPLOY = NEIN
```

## 6. Credit-Regel

- L1 ist der wichtigste Lovable-Lauf, weil Live-Supabase-Precheck und kontrollierte Migration plattformnah sind.
- L2 nur nach fertig implementiertem Domain-/Serverpfad und nur für UI/Preview.
- L3 ist ein kurzer Drift-/Abschlusscheck.
- Keine Credits für Git-/Prettier-/kleine CI-Fehler verbrauchen, die lokal oder über Codex besser lösbar sind.

## 7. Abbruchregeln

Lovable meldet BLOCKED statt selbständig den Scope zu erweitern, wenn scheinbar benötigt werden:

- Project Responsibility vor BSF-03E,
- neue Personendirectory-Funktion,
- Service Role,
- neue externe Datenquelle,
- neue Billing-/Finalisierungslogik,
- neue monetäre Daten,
- Lockern bestehender RLS-/Customer-Access-Grenzen,
- Security-Definer-RPC für den normalen Controlling-Pfad.
