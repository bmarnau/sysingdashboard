# BSF-03A — Projektmanager-Leistungssicht / Controlling

Stand: 2026-09-14
Status: PLANUNG / IMPLEMENTIERUNGSVERTRAG
Issue: #106
Vorgänger: BSF-KIOSK-01 / #135
Nachfolger: BSF-KIOSK-02 / #136

## 1. Ziel

BSF-03A liefert eine ausschließlich lesende, serverseitig abgesicherte Leistungssicht für Projektmanager und berechtigte Leitungsrollen.

Die Sicht beantwortet für einen zulässigen Zeitraum und Scope:

- welche Tätigkeiten erbracht wurden,
- für welchen Kunden,
- für welches Projekt und Arbeitspaket,
- mit welcher Arbeitspaket-Kategorie,
- wie viele Stunden angefallen sind,
- welche Stunden abrechenbar beziehungsweise nicht abrechenbar sind,
- welche reproduzierbaren Summen und Zeitverläufe daraus entstehen.

BSF-03A führt keine Abrechnungsfreigabe, keine Finalisierung und keine Änderung fachlicher Leistungsdaten ein.

## 2. Ist-Analyse

Die aktuelle Shared Projection enthält bereits:

- `shared_project_projection`,
- `shared_work_package_projection`,
- `shared_activity_projection`,
- Customer-/Systemhouse-Scope,
- `activity_date`,
- `duration_hours`,
- `billable`,
- `billing_status`,
- RLS auf aktive Membership, Customer Access und `dashboard.view`.

Die lokale `WorkPackage`-Domäne enthält seit BSF-03D `categoryKey?: string | null`.

Noch nicht vorhanden ist die durchgängige Übertragung dieses Kategorie-Schlüssels in die Shared Projection. `SharedWorkPackageProjection`, die Publish-Payloads, die Datenbanktabelle und `SharedWorkPackageRecord` enthalten den Schlüssel heute nicht.

Eine stabile Project-Responsibility-Beziehung existiert ebenfalls noch nicht. Das lokale Feld `Project.lead` ist ein Anzeige-/Legacy-Feld und keine sichere Benutzeridentität.

## 3. Architekturentscheidung

Der BSF-03A-Datenpfad lautet:

```text
Projektcontrolling UI
  -> Server Function
      -> project.controlling.view
      -> ProjectControllingService
          -> ProjectControllingRepository
              -> Supabase Adapter mit User-JWT
                  -> Customer Access + bestehende Shared-Projection-RLS
```

Verbindlich:

- kein Service-Role-Normalpfad,
- keine direkte Browser-Aggregation aus ungesicherten Rohdaten,
- Fachaggregation providerneutral,
- Supabase nur im Adapter,
- dieselbe Architektur bleibt später auf Azure SQL übertragbar,
- keine Lovable-Cloud-only Laufzeitabhängigkeit.

## 4. Neue atomare Permission

BSF-03A führt die Permission ein:

```text
project.controlling.view
```

Sie wird vergeben an:

- Systemadministrator,
- Administrator,
- Teamlead,
- Projektmanager.

Sie wird nicht vergeben an:

- Engineer,
- Viewer,
- Customer.

Begründung:

- `project.edit` ist eine Schreibberechtigung und darf nicht als Leseberechtigung zweckentfremdet werden.
- `avkk.management.view` gehört fachlich zu AVKK und darf nicht als allgemeines Controlling-Recht missbraucht werden.
- `dashboard.view` ist zu breit und würde Viewer/Customer nicht sauber ausschließen.

Die Permission wird synchron in Datenbank, Frontend-RBAC, Backend-RBAC und RBAC-Dokumentation geführt.

## 5. V1-Autorisierungsgrenze

BSF-03A V1 verwendet folgende serverseitige Schnittmenge:

```text
aktives Konto
AND project.controlling.view
AND aktive Systemhouse Membership
AND aktiver Customer Access >= read
AND bestehende Shared-Projection-RLS
```

Wichtig: Es gibt in V1 noch keine unabhängige Project-Access-/Project-Responsibility-Tabelle.

Daher gilt:

- Customer Access ist die serverseitige Sicherheitsgrenze für die sichtbaren Kundenprojekte.
- Ein Projektfilter verengt Daten innerhalb eines bereits zulässigen Customer-Scope.
- Ein Projektfilter erweitert niemals den Customer-Scope.
- `Project.lead`, Projektname oder Anzeigename werden niemals zur Autorisierung benutzt.
- BSF-03A behauptet noch keine eigenständige Project-Responsibility-Autorisierung.
- BSF-03E kann später eine stabile Project Responsibility ergänzen und den Repository-Scope additiv verengen oder erweitern, ohne die Controlling-Fachlogik neu zu bauen.

Damit wird BSF-03E nicht vorgezogen und es entsteht keine Scheinsicherheit auf Basis eines Textfeldes.

## 6. Kategorie-Brücke zur Shared Projection

Damit AP-Kategorie eine echte Auswertungsdimension wird, muss BSF-03A den bereits vorhandenen BSF-03D-Vertrag minimal in die Shared Projection fortschreiben.

### 6.1 Datenbank

Additiv vorgesehen:

```text
shared_work_package_projection.category_key text NULL
shared_work_package_projection.category_observed boolean NOT NULL DEFAULT false
```

Zusätzlich ein geeigneter Scope-/Kategorie-Index für aktive Zeilen.

Kein Foreign Key auf `reference_value`.

Begründung:

- Kategorieidentität ist der stabile Key.
- Unbekannte historische Keys dürfen nicht still umgedeutet oder gelöscht werden.
- Inaktive Kategorien bleiben historisch verständlich.
- Ein harter FK würde Rollout-, Historien- und Unknown-Fälle unnötig koppeln.

### 6.2 Legacy-/Rollout-Semantik

`category_observed` trennt drei Fälle sauber:

```text
category_observed = false
  -> Kategorie wurde für diese Projection noch nicht mit dem neuen Vertrag publiziert.

category_observed = true AND category_key IS NULL
  -> explizit keine Kategorie.

category_observed = true AND category_key IS NOT NULL
  -> Kategorie-Key wurde explizit publiziert.
```

Dadurch werden alte Shared-Projection-Zeilen nicht fälschlich als „Keine Kategorie“ dargestellt.

### 6.3 Rückwärtskompatibler Publish

Der transaktionale BSF-02C-Publish bleibt `SECURITY INVOKER`.

Neue Clients senden `category_key` immer mit, auch wenn der Wert `null` ist.

Bei älteren Payloads ohne Feld gilt:

- Insert: `category_observed = false`,
- Update: bestehende Kategorie und `category_observed` bleiben unverändert.

Der neue Source Hash umfasst `categoryKey`, damit eine echte Kategorieänderung die Revision nachvollziehbar erhöht.

## 7. Kategorieauflösung

Controlling speichert und filtert nach stabilem Key, nicht nach Label.

Darstellung:

```text
observed=false                -> Kategorie nicht publiziert
observed=true, key=null       -> Keine Kategorie
Key aktiv und bekannt         -> aktuelles Label
Key inaktiv und bekannt       -> Label + „inaktiv“
Key unbekannt                 -> Unbekannte Kategorie (<key>)
```

Kein Silent Remap.

Kategorie bleibt unabhängig von:

- Billable,
- Priorität,
- Status,
- Billing Status.

## 8. Controlling-Filtervertrag

V1-Filter:

- Zeitraum von/bis,
- Systemhaus,
- Kunde,
- Projekt,
- Arbeitspaket,
- AP-Kategorie,
- abrechenbar / nicht abrechenbar.

Identitäten:

- Customer: `(systemhouseId, customerId)`,
- Project: zusätzlich `projectSourceId`,
- WorkPackage: zusätzlich `workPackageSourceId`,
- Kategorie: `(systemhouseId, categoryKey)`.

Namen und Labels sind nie Identität.

Abhängige Filter werden fail-closed validiert:

- `customerId` nur zusammen mit `systemhouseId`,
- `projectSourceId` nur zusammen mit Systemhaus + Kunde,
- `workPackageSourceId` nur zusammen mit Systemhaus + Kunde,
- `categoryKey` nur innerhalb eines ausgewählten Systemhauses.

Unbekannte oder unzulässige Filterwerte führen nicht zu einer Scope-Erweiterung.

## 9. Zeitraum

Activity-Daten sind als `date` gespeichert. V1 verwendet deshalb inklusive ISO-Datumsgrenzen:

```text
from <= activity_date <= to
```

Verbindlich:

- beide Grenzen sind erforderlich,
- `from <= to`,
- maximal 366 Kalendertage pro Abfrage,
- UI-Default: aktueller Monat bis heute,
- keine Zeit-/Zeitzoneninterpretation auf einem reinen `date`-Feld.

## 10. Providerneutraler Ergebnisvertrag

Fachlich vorgesehen:

```text
ProjectControllingResult
  filters
  summary
  trend
  scopeOptions
  rows
  completeness
```

### 10.1 Summary

Mindestens:

- Gesamtstunden,
- abrechenbare Stunden,
- nicht abrechenbare Stunden,
- Billable-Quote,
- Anzahl Tätigkeiten,
- Anzahl Kunden,
- Anzahl Projekte,
- Anzahl Arbeitspakete.

Keine Eurobeträge in V1.

Begründung: Die Shared Activity Projection enthält bewusst keinen verlässlichen Preis-/Stundensatzvertrag. BSF-03A erfindet keine monetären Werte aus lokalen oder veralteten Daten.

### 10.2 Trend

Der Zeitverlauf basiert ausschließlich auf `activity_date` und Stunden.

V1 liefert tägliche Punkte:

- Gesamtstunden,
- billable Stunden,
- non-billable Stunden.

Leere Tage dürfen als `0` im Zeitverlauf dargestellt werden, weil hier die bekannte Abwesenheit von Activities innerhalb eines vollständig abgefragten Datumsbereichs gemeint ist. Das ist nicht mit unbekannten Kategorie-/Quelldaten zu verwechseln.

### 10.3 Detailzeile

Mindestens:

- Datum,
- Customer-ID + Customer-Name,
- Project Source ID + Projektname oder explizit „Ohne Projekt“,
- WorkPackage Source ID + Titel oder explizit „Ohne Arbeitspaket“,
- Kategoriezustand + Kategorie-Key/Label,
- Tätigkeitstitel,
- Stunden,
- `billable`,
- `billingStatus`.

Keine internen Datenbank-UUIDs im normalen UI.

## 11. Personenbezug

V1 zeigt keinen Namen des Leistungserbringers.

Gründe:

- Issue #106 verlangt keinen Personenfilter.
- `profiles` ist bewusst self-only abgesichert.
- Eine neue Personendirectory-/Security-Definer-Lösung nur für BSF-03A wäre unverhältnismäßig.
- BSF-03E ist der geplante Personensicht-/Responsibility-Sprint.
- Die spätere Kundenausgabe soll den Leistungserbringer ohnehin nicht automatisch nennen.

`engineer_id` bleibt intern für Datenintegrität vorhanden, wird aber nicht als rohe UUID im UI ausgegeben.

## 12. Ergebnisgröße und Fail-safe-Verhalten

V1 darf Summen nicht auf still abgeschnittenen Detailzeilen berechnen.

Der Provider liest daher maximal 5001 passende Activities.

```text
0..5000  -> reguläre Verarbeitung
5001     -> expliziter Fehler „Zeitraum oder Filter einschränken“
```

Keine stille Trunkierung.

Diese Grenze ist ein MVP-Schutz. Eine spätere serverseitige SQL-/OLAP-Aggregation kann in BSF-09 oder bei realem Skalierungsbedarf eingeführt werden, ohne den Fachvertrag zu ändern.

## 13. Drill-down

V1-Hierarchie:

```text
Kunde
  -> Projekt
      -> Arbeitspaket
          -> Tätigkeit
```

Unverlinkte Daten werden nicht verworfen:

```text
Kunde
  -> Ohne Projekt
      -> Ohne Arbeitspaket / unverlinktes Arbeitspaket
          -> Tätigkeit
```

Das UI darf fehlende Parent-Beziehungen nicht durch Namensheuristiken reparieren.

## 14. Billable-Semantik

Der Filter „abrechenbar / nicht abrechenbar“ verwendet ausschließlich das boolesche Feld `billable`.

`billingStatus` wird getrennt angezeigt und nicht zur stillen Ableitung von `billable` verwendet.

BSF-03A ändert weder Feld.

Die spätere kontrollierte Änderung vor Finalisierung gehört ausschließlich zu BSF-03B.

## 15. Scope-Optionen

Der Server liefert nur Optionen, die für den aktuellen Benutzer im bestehenden RLS-/Customer-Access-Scope sichtbar sind.

Mindestens:

- Systemhäuser,
- Kunden,
- Projekte,
- Arbeitspakete,
- Kategorie-Keys/Labels.

Downstream-Optionen werden nach der jeweils höheren Auswahl eingeschränkt. Ein manipuliertes Query-Argument kann dadurch keine zusätzliche Zeile sichtbar machen; die serverseitige Datenabfrage bleibt maßgeblich.

## 16. Route und UI

Vorgesehene Route:

```text
/projektcontrolling
```

Sie liegt unter `_authenticated`.

UI-Gate:

```text
project.controlling.view
```

Die UI besteht aus:

1. Zeitraum-/Scope-Filterleiste,
2. KPI-Zusammenfassung,
3. Stunden-Zeitverlauf,
4. hierarchischem Drill-down,
5. read-only Leistungszeilen,
6. sichtbarem Datenvollständigkeits-/Unknown-Hinweis.

BSF-03A erweitert nicht die bereits große `ProjectDetailView.tsx`. Das Controlling wird als eigener Bereich gebaut; bestehende Projektselektoren können fachlich wiederverwendet oder in kleinere providerneutrale Module extrahiert werden, wenn dies ohne Verhaltensänderung möglich ist.

## 17. Vorgesehene Module

Providerneutral:

```text
src/lib/project-controlling/project-controlling.ts
src/lib/project-controlling/project-controlling-contract.ts
```

Server/runtime:

```text
src/lib/project-controlling-runtime/project-controlling.functions.ts
```

Supabase-Adapter:

```text
src/integrations/supabase/project-controlling-adapter.ts
```

UI:

```text
src/components/project-controlling/ProjectControllingView.tsx
src/components/project-controlling/ProjectControllingFilters.tsx
src/components/project-controlling/ProjectControllingSummary.tsx
src/components/project-controlling/ProjectControllingDrilldown.tsx
src/routes/_authenticated/projektcontrolling.tsx
```

## 18. Security-Negativvertrag

Mindestens nachzuweisen:

- unauthenticated -> DENY,
- Viewer -> DENY,
- Customer -> DENY,
- Engineer -> DENY,
- inaktives Konto -> DENY,
- fehlende Membership -> DENY,
- fehlender Customer Access -> keine Daten,
- fremdes Systemhaus -> keine Daten,
- fremder Customer -> keine Daten,
- fremde Project Source ID -> keine Daten / generische Ablehnung,
- fremde WorkPackage Source ID -> keine Daten / generische Ablehnung,
- manipulierte Kategorie -> keine Scope-Erweiterung,
- direkte UI-Manipulation ändert keine Servergrenze.

Keine IDOR-/BOLA-Existenzhinweise in Fehlermeldungen.

## 19. Datenbankänderungen

BSF-03A benötigt nur folgende fachlich begründete DB-Anpassungen:

1. neue Permission in `has_permission`,
2. `category_key` + `category_observed` in Shared WorkPackage Projection,
3. Kategorieunterstützung im bestehenden transaktionalen Publish-RPC,
4. optionaler Scope-/Kategorie-Index.

Nicht benötigt:

- neue Controlling-Tabelle,
- neue Materialized View,
- Service-Role-RPC,
- neue Project-Responsibility-Tabelle,
- neue Personendirectory-Funktion,
- neue Billing-/Finalisierungsdatenbank.

DB-Änderungen folgen `docs/DATABASE-CHANGE-GOVERNANCE.md` und werden live/fail-fast transaktional getestet.

## 20. BSF-02C-Regression

Die Kategorie-Erweiterung darf den bestehenden Shared-Projection-Vertrag nicht beschädigen.

Nachzuweisen:

- Publish-RPC bleibt `SECURITY INVOKER`,
- bestehende Activity-only- und Structure-Modi bleiben unverändert autorisiert,
- Snapshot-Atomarität bleibt erhalten,
- Soft Withdraw bleibt unverändert,
- Source-Collision-/Parent-/Engineer-Regeln bleiben fail-closed,
- alte Payloads ohne `category_key` bleiben kompatibel,
- neue Payloads unterscheiden `nicht beobachtet` von `keine Kategorie`,
- bestehende BSF-02C-SQL-Regression vollständig PASS.

## 21. KIOSK-02-Anschluss

BSF-KIOSK-02 darf später dieselben Controlling-/Shared-Read-Verträge verwenden.

Es wird keine zweite Kiosk-Aggregationslogik gebaut.

KIOSK-02 kann aus BSF-03A mindestens übernehmen:

- zugelassene Kunden-/Projektzahlen,
- AP-Kategorie als Dimension,
- Stundenaggregate,
- Datenvollständigkeitszustände.

Der Kiosk bleibt trotzdem eine separate passive Präsentationsschicht.

## 22. Nicht-Scope

Nicht Bestandteil von BSF-03A:

- Änderung von `billable` oder `billingStatus`,
- Leistungsnachweis-Finalisierung,
- kaufmännische Rechnung,
- Kunden-PDF,
- Project Responsibility,
- Vertretungslogik,
- Personenranking,
- Mitarbeiterfilter,
- Eurobeträge,
- externe Datenquellen,
- MCP,
- NAVIS/Agenten,
- zentrale Datenmigration aus BSF-04.

## 23. Abnahmekriterien

BSF-03A ist erst abnahmefähig, wenn:

1. `project.controlling.view` auf allen RBAC-Ebenen konsistent ist.
2. Nur Systemadministrator, Administrator, Teamlead und Projektmanager die Sicht erhalten.
3. Customer-/Systemhouse-RLS und Customer Access serverseitig maßgeblich bleiben.
4. `Project.lead` nicht zur Autorisierung verwendet wird.
5. `categoryKey` durchgängig in die Shared Projection gelangt.
6. Legacy-, None-, Active-, Inactive- und Unknown-Kategorie unterscheidbar sind.
7. Zeitraum, Kunde, Projekt, AP, Kategorie und Billable filterbar sind.
8. Summen aus denselben gefilterten Zeilen reproduzierbar entstehen.
9. Keine stille Ergebnis-Trunkierung erfolgt.
10. Drill-down Kunde -> Projekt -> AP -> Tätigkeit funktioniert.
11. Cross-Systemhouse/Cross-Customer/IDOR/BOLA-Negativtests PASS sind.
12. Kein schreibender Leistungs-/Billing-/Finalisierungspfad existiert.
13. E2E und Accessibility PASS sind.
14. BSF-02C-Regression PASS ist.
15. Security Advisor keine neue unerklärte Warnung liefert.
16. Vollständige CI inklusive Technical Debt und Technical Report & Quality Gate PASS ist.
17. Dokumentation und Abschlussbericht synchron sind.
