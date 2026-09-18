# Sysing Dashboard — Lovable-Promptplan BSF-03A

Stand: 2026-09-18
Status: L2-ANALYSE AUSGEFÜHRT / EXACT-HEAD-PREVIEW BLOCKED
Issue: #106
Golden Dataset: #142 / `docs/GOLDEN-DATASET-STRATEGY.md`
Design: `docs/BSF-03A-DESIGN.md`
Implementation Plan: `docs/superpowers/plans/2026-09-14-bsf-03a-project-controlling.md`
Golden Foundation Plan: `docs/superpowers/plans/2026-09-15-golden-dataset-foundation.md`

Aktueller Ausführungsstand: Der L2-Precheck wurde analyse-only ausgeführt. Der erreichbare Lovable-Stand wich vom aktuellen GitHub-PR-Head ab; deshalb wurden keine Lovable-Codeänderungen übernommen. Ein späterer read-only Branch-/Head-Recheck war wegen ausgeschöpfter Lovable-Credits nicht ausführbar. L2/L3-Exact-Head-Preview bleibt vor FINAL DONE offen.

## 1. Zweck

Lovable wird in BSF-03A nur dort eingesetzt, wo seine Supabase-/Preview-Nähe einen klaren Vorteil bringt:

1. kontrollierter Live-Precheck und DB-Migrationspfad,
2. später gezielter UI-/Preview-Pass,
3. kurzer Abschluss-/Driftcheck.

Providerneutrale Fachlogik, Golden-Dataset-Vertrag, Testverträge und Security-Grenzen werden vorher im Repository festgelegt.

Der Goldene Datensatz ist für Lovable **Eingabe- und Prüfvertrag**, nicht frei editierbare Beispieldatenquelle. Lovable darf Golden Expected Results nicht selbständig an Implementierungsergebnisse anpassen.

## 2. Harte Leitplanken

Für jeden BSF-03A-Lauf gelten:

- zuerst analysieren,
- dann nur im freigegebenen Scope umsetzen,
- danach testen,
- dokumentieren,
- mit strukturiertem Abschlussbericht enden,
- vor jeder Supabase-Aktion den Projektbezug gegen `supabase/config.toml` verifizieren,
- erwarteter Sysingdashboard-Projektbezug: `zffimqwnrsuzuozsgnlc`,
- bei anderem Supabase-Projekt: `BLOCKED`, keine DB-Änderung und kein Advisor als Sysingdashboard-Nachweis werten,
- kein Service-Role-Normalpfad,
- keine produktiven Secrets,
- kein Project.lead als Sicherheitsidentität,
- keine Project-Responsibility-Tabelle vorziehen,
- keine Personendirectory nur für diesen Sprint,
- keine Änderung von `billable` oder `billingStatus` durch das Controlling,
- keine Finalisierung,
- keine Eurobeträge erfinden,
- kein MCP/Graph/SharePoint/Agent,
- Golden Dataset ausschließlich synthetisch und mit fester Referenzzeit,
- keine automatische Neuschreibung von Golden Expected Results bei Testfehlern,
- kein Merge,
- kein Deploy.

`previewAuthStorage.ts` darf nicht neu eingeführt werden. Änderungen an `src/integrations/supabase/client.ts` sind für BSF-03A nicht vorgesehen und müssen bei Auftreten als Governance-Drift behandelt werden.

## 3. Golden-Dataset-Vorbedingung

Bevor Lovable L1 fachlich eingreift, muss repository-seitig GDS-01 V1 mindestens in folgender Form vorhanden sein:

```text
schemaVersion = sysing.golden.v1
datasetVersion = 1.0.0
referenceTime = 2026-09-14T00:00:00Z
synthetic = true
```

Verbindliche Golden-V1-Grundsumme für BSF-03A:

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

Wenn Golden-Dateien fehlen, ungültig sind oder die unabhängige Expected-Result-Prüfung nicht PASS ist, meldet Lovable `BLOCKED` und ändert weder DB noch Fachsemantik.

## 4. Prompt 03A-L1 — Live-Precheck, Golden-Vertrag und kontrollierte DB-Grundlage

```text
SYSING DASHBOARD — BSF-03A / L1
LIVE-PRECHECK + GOLDEN DATASET + KATEGORIE-/PERMISSION-GRUNDLAGE

VERBINDLICHE BASIS
1. Lies docs/BSF-03A-DESIGN.md vollständig.
2. Lies docs/GOLDEN-DATASET-STRATEGY.md vollständig.
3. Lies docs/superpowers/plans/2026-09-15-golden-dataset-foundation.md.
4. Lies docs/superpowers/plans/2026-09-14-bsf-03a-project-controlling.md.
5. Prüfe aktuellen Git-Branch, Head und Main-Baseline.
6. Analysiere zuerst read-only; keine Änderung vor abgeschlossenem Precheck.

PHASE 0 — PROJEKTKONTEXT-GATE
- Lies supabase/config.toml.
- Erwarteter Sysingdashboard-Projektbezug ist zffimqwnrsuzuozsgnlc.
- Verifiziere den tatsächlich verbundenen Supabase-Projektbezug eindeutig.
- Wenn die verbundene Projekt-ID nicht zffimqwnrsuzuozsgnlc ist oder keine eindeutig davon abgeleitete freigegebene Staging-Umgebung vorliegt:
  STATUS = BLOCKED
  DB_GEAENDERT = NEIN
  keine Migration anwenden
  keinen Advisor dieses Fremdprojekts als Sysingdashboard-Nachweis werten
  Auftrag beenden.

PHASE A — GOLDEN DATASET PRECHECK
Prüfe repository-seitig:
- docs/examples/golden-dataset/v1/manifest.json,
- schemaVersion=sysing.golden.v1,
- datasetVersion=1.0.0,
- synthetic=true,
- referenceTime=2026-09-14T00:00:00Z,
- bun run golden-dataset:check bzw. den im Plan definierten Golden-Validator,
- unabhängige Expected Results für Project Controlling.

Verbindliche Grundwerte:
- 8 Activities,
- 2 Customers,
- 3 Projects,
- 5 WorkPackages,
- 25.0 totalHours,
- 20.0 billableHours,
- 5.0 nonBillableHours,
- 80.0 % billableQuote.

Wenn Golden-Check oder unabhängige Expected Results nicht PASS sind:
STATUS = BLOCKED
keine DB-Änderung.

Golden Expected Results niemals automatisch an Codeergebnisse anpassen.

PHASE B — READ-ONLY LIVE-PRECHECK
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

PHASE C — TESTARTEFAKT ZUERST
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

PHASE D — MINIMALE MIGRATION
Nur wenn 0, A, B und C klar sind:
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

PHASE E — REAL TEST
- BSF-03A SQL-Test vollständig real ausführen,
- Null-Residuen bestätigen,
- bestehende BSF-02C SQL-Regressionssuite vollständig ausführen,
- offiziellen Supabase Security Advisor read-only auf dem verifizierten Sysingdashboard-/Staging-Kontext ausführen.

ZULÄSSIGE SECURITY-BASELINE
Historisch dokumentierte SEC-01-Warnungen getrennt von neuen BSF-03A-Findings behandeln. Neue unerklärte WARN/ERROR/CRITICAL/HIGH sind nicht akzeptabel.

PHASE F — REPOSITORY / GOLDEN REGRESSION
- Generated Types nur aktualisieren, wenn das real bestätigte Schema dies erfordert.
- Keine Preview-Auth-Sonderlogik.
- Führe Golden-Dataset-Validator erneut aus.
- Führe den BSF-03A-Fachtest gegen expected/project-controlling.json aus.
- Golden Expected Results nur nach separatem fachlichem Review ändern, niemals als Reaktion auf einen roten Produktionscode-Test.
- Dokumentiere exakte Migration, Tests, Golden-Version und Advisor-Ergebnis.

ABNAHMEKRITERIEN
- korrekter Supabase-Projektkontext verifiziert,
- GitHub und Live-Schema konsistent,
- Golden Dataset V1 valide,
- Permission exakt wie Design,
- Kategorien rückwärtskompatibel publizierbar,
- SECURITY INVOKER unverändert,
- BSF-02C Regression PASS,
- Golden Project Controlling Regression PASS,
- keine Residuen,
- keine neue unerklärte Security-Warnung.

ABSCHLUSSBERICHT
- PRECHECK
- SUPABASE_EXPECTED_PROJECT_ID
- SUPABASE_CONNECTED_PROJECT_ID
- SUPABASE_CONTEXT_PASS JA/NEIN
- GOLDEN_SCHEMA_VERSION
- GOLDEN_DATASET_VERSION
- GOLDEN_CHECK
- GOLDEN_PROJECT_CONTROLLING
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

## 5. Prompt 03A-L2 — Controlling UI/Preview-Pass

Diesen Prompt erst verwenden, nachdem Golden V1, Domain-Service, Server Function, Adapter und targeted Tests repository-seitig vorhanden sind.

```text
SYSING DASHBOARD — BSF-03A / L2
PROJEKTCONTROLLING UI / PREVIEW MIT GOLDEN V1

VERBINDLICHE BASIS
- Lies docs/BSF-03A-DESIGN.md.
- Lies docs/GOLDEN-DATASET-STRATEGY.md.
- Lies beide Implementation Plans.
- Prüfe Branch, Head und git diff.
- Analysiere zuerst die bereits implementierten ProjectControlling-Komponenten und Tests.
- Prüfe Golden Dataset V1 und expected/project-controlling.json read-only.

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
- Golden Expected Results nicht ändern.
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

Verwende Golden V1 gezielt für reproduzierbare Preview-Fälle:
- Gesamt: 25.0 / 20.0 / 5.0 / 80 %,
- Customer A: 15.0 / 12.0 / 3.0 / 80 %,
- Customer B: 10.0 / 8.0 / 2.0 / 80 %,
- Regelbetrieb: 6.0 h,
- Keine Kategorie: 3.0 h,
- Inaktiv: 1.0 h,
- Legacy/not observed: 5.0 h,
- Unknown: 10.0 h.

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
- Golden Project Controlling Regression,
- Controlling Component Tests,
- A11y,
- Controlling E2E,
- Security-E2E für manipulierte Scope-IDs,
- TypeScript,
- ESLint,
- Prettier.

PHASE D — DOKUMENTATION
Nur tatsächliche Änderungen dokumentieren. Golden-Version im Test-/Abnahmenachweis nennen. Kein DONE vor vollständiger GitHub-CI.

ABNAHMEKRITERIEN
- Golden-Grundwerte exakt sichtbar/ableitbar,
- Filter eindeutig und kaskadiert,
- Summen/Trend lesbar,
- Unknown/Legacy nicht verschleiert,
- keine Schreibaktion,
- keine Security-/Architekturdrift,
- Golden Expected Results unverändert,
- targeted Tests PASS.

ABSCHLUSSBERICHT
- ANALYSEERGEBNIS
- HEAD
- GOLDEN_SCHEMA_VERSION
- GOLDEN_DATASET_VERSION
- GOLDEN_CHECK
- DATEIEN_GEAENDERT
- UI_AENDERUNGEN
- FACHLOGIK_GEAENDERT JA/NEIN
- GOLDEN_EXPECTED_RESULTS_GEAENDERT JA/NEIN
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

## 6. Prompt 03A-L3 — Abschluss-/Driftprüfung

```text
SYSING DASHBOARD — BSF-03A / L3 ABSCHLUSSPRÜFUNG

Arbeite primär read-only.

1. Prüfe exakten Head und gesamten Diff gegen aktuelle Main-Baseline.
2. Prüfe den Supabase-Projektbezug erneut gegen supabase/config.toml; falscher Kontext => BLOCKED.
3. Prüfe Golden Dataset: sysing.golden.v1 / 1.0.0 / synthetic=true / Referenzzeit 2026-09-14T00:00:00Z.
4. Führe Golden Validator und unabhängige Expected-Result-Prüfung aus.
5. Prüfe Project Controlling gegen Golden-Grundsumme 25.0 / 20.0 / 5.0 / 80 % und alle Kategorie-Fälle.
6. Prüfe, dass project.controlling.view exakt den vier vorgesehenen Rollen zugeordnet ist.
7. Prüfe, dass Project.lead nirgends als Autorisierungsmerkmal verwendet wird.
8. Prüfe category_key/category_observed End-to-End.
9. Prüfe BSF-02C RPC weiterhin SECURITY INVOKER.
10. Prüfe keine neue Service-Role-/Auth-Sonderlogik.
11. Prüfe keine Project-Responsibility-/Personendirectory-Vorwegnahme.
12. Prüfe keine schreibenden Billing-/Finalisierungsaktionen.
13. Prüfe, dass Golden Expected Results nicht zur Anpassung an Produktionscode verändert wurden; jede Änderung benötigt dokumentierten fachlichen Reviewgrund und Dataset-Versionierung.
14. Führe targeted Tests erneut aus.
15. Führe keine kosmetische Änderung ohne reproduzierten Befund aus.
16. Dokumentiere jeden Befund.
17. Kein Merge. Kein Deploy.

ABSCHLUSSBERICHT
- HEAD
- SUPABASE_CONTEXT_PASS JA/NEIN
- GOLDEN_SCHEMA_VERSION
- GOLDEN_DATASET_VERSION
- GOLDEN_CHECK PASS/FAIL
- GOLDEN_PROJECT_CONTROLLING PASS/FAIL
- GOLDEN_EXPECTED_RESULTS_DRIFT JA/NEIN
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

## 7. Credit-Regel

- GDS-01-Kern wird repository-seitig ohne Lovable umgesetzt.
- L1 ist der wichtigste Lovable-Lauf, weil korrekter Live-Supabase-Precheck und kontrollierte Migration plattformnah sind.
- L2 nur nach fertig implementiertem Golden-/Domain-/Serverpfad und nur für UI/Preview.
- L3 ist ein kurzer Drift-/Abschlusscheck.
- Keine Credits für Golden-Fixture-Erstellung, Git-/Prettier-/kleine CI-Fehler verbrauchen, die lokal oder über Codex besser lösbar sind.

## 8. Abbruchregeln

Lovable meldet `BLOCKED` statt selbständig den Scope zu erweitern, wenn:

- der verbundene Supabase-Kontext nicht eindeutig `zffimqwnrsuzuozsgnlc` bzw. eine freigegebene Ableitung davon ist,
- Golden Dataset oder Expected Results fehlen/ungültig sind,
- ein Golden-Test nur durch Änderung der Expected Results statt durch fachlich korrekte Implementierung grün würde,
- Project Responsibility vor BSF-03E benötigt scheint,
- eine neue Personendirectory-Funktion nötig scheint,
- Service Role im Normalpfad nötig scheint,
- neue externe Datenquelle nötig scheint,
- neue Billing-/Finalisierungslogik nötig scheint,
- neue monetäre Daten nötig scheinen,
- bestehende RLS-/Customer-Access-Grenzen gelockert werden müssten,
- eine Security-Definer-RPC für den normalen Controlling-Pfad nötig scheint.

## 9. TIECS / finaler Exact-Head-Wiederanlauf

Für den verbleibenden Lovable-Nachweis gilt ab jetzt ein tool-unabhängiger
Wiederanlauf. Historische SHAs in älteren Kommentaren sind nur Evidenz ihres
damaligen Zeitpunkts.

Unmittelbar vor dem nächsten Lovable-Lauf muss der aktuelle Head von PR #144 aus
GitHub ermittelt werden. **Dieser aktuelle PR-Head ist EXPECTED_HEAD.** Der
Prompt darf keinen älteren SHA als Sollzustand übernehmen.

\`\`\`text
SYSING DASHBOARD — BSF-03A FINAL EXACT-HEAD RECOVERY + READ-ONLY PREVIEW

SOURCE OF TRUTH
GitHub: bmarnau/sysingdashboard
PR: #144
Branch: feat/bsf-03a-project-controlling

PHASE 0 — RESOLVE EXPECTED HEAD
1. Ermittle read-only den aktuellen Head von GitHub PR #144.
2. Setze exakt diesen SHA als EXPECTED_HEAD.
3. Verwende keinen historischen SHA aus älteren Chats, Kommentaren oder
   Preview-Workspaces.
4. Kann der aktuelle PR-Head nicht eindeutig ermittelt werden: STATUS=BLOCKED.

HARTE REGELN
- Keine Datei ändern.
- Keine .lovable/plan.md schreiben oder aktualisieren.
- Keine DB-/Migration-/RLS-/Grant-/Function-/Auth-/RBAC-Änderung.
- Keine Supabase-Schreiboperation.
- Kein Commit.
- Kein Merge.
- Kein Deploy.
- Keine automatische Reparatur.
- Bei nicht erreichbarem EXPECTED_HEAD: STATUS=BLOCKED und sofort stoppen.

PHASE A — EXACT-HEAD REACHABILITY
- git status --porcelain
- git rev-parse HEAD
- git fetch --all --prune
- Feature-Branch und EXPECTED_HEAD prüfen.
- Arbeitsbaum nur dann auf den Feature-Head bringen, wenn dies ohne
  Dateiänderung, Merge oder Cherry-pick möglich ist.
- Danach erneut HEAD und sauberen Arbeitsbaum prüfen.

Nur fortfahren, wenn:
HEAD == EXPECTED_HEAD
und git status leer ist.

PHASE B — VERTRAGSDRIFT
Auf dem exakten Head prüfen:
- src/integrations/supabase/client.ts entspricht GitHub,
- src/integrations/supabase/previewAuthStorage.ts existiert NICHT,
- keine drizzle/-Artefakte aus dem alten Lovable-Pfad,
- keine unerwarteten lokalen Änderungen.

PHASE C — READ-ONLY PREVIEW
Route: /projektcontrolling

Prüfen:
- 1920x1080,
- 1366x768,
- keine Überlappung / kein Clipping / kein horizontaler Kern-Overflow,
- Filterhierarchie Zeitraum -> Systemhaus -> Kunde -> Projekt -> Arbeitspaket
  -> AP-Kategorie,
- Arbeitspaket erst nach eindeutigem Projekt aktiv,
- KPI-Hierarchie, Tagestrend und Drill-down lesbar,
- Legacy/Unknown/Unlinked-Zustände verständlich,
- Empty/Loading/Error nicht layoutgebrochen,
- keine Personennamen-/Engineer-Rangliste,
- keine Eurobeträge,
- keine neue Runtime-Exception,
- kein unerklärter Network-/ServerFn-Fehler im gültigen berechtigten Pfad.

PHASE D — ABSCHLUSSBERICHT
STATUS = PASS | BLOCKED | FAIL
EXPECTED_HEAD
ACTUAL_HEAD
GIT_STATUS_CLEAN = JA/NEIN
BRANCH_REACHABLE = JA/NEIN
CLIENT_TS_DRIFT = JA/NEIN
PREVIEW_AUTH_STORAGE_PRESENT = JA/NEIN
DRIZZLE_DRIFT_PRESENT = JA/NEIN
PREVIEW_1920x1080 = PASS/FAIL/BLOCKED
PREVIEW_1366x768 = PASS/FAIL/BLOCKED
FILTER_HIERARCHY = PASS/FAIL/BLOCKED
KPI_TREND_DRILLDOWN = PASS/FAIL/BLOCKED
RUNTIME_CONSOLE = PASS/FAIL/BLOCKED
FILES_CHANGED = NEIN
DB_CHANGED = NEIN
COMMIT = NEIN
MERGE = NEIN
DEPLOY = NEIN
\`\`\`

Bei einer erneuten tool-, credit-, quota- oder plattformbedingten Unterbrechung
wird keine fehlende Abnahme ersetzt. Stattdessen kann erneut ein TIECS
Maintenance Window für Git-, Doku-, Planungs-, CI-/Security- oder
Backlog-Hygiene genutzt werden.

