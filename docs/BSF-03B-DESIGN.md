# BSF-03B — Teamlead-Leistungsnachweis V1

Stand: 2026-09-14
Status: PLANUNG / IMPLEMENTIERUNGSVERTRAG
Issue: #107
Vorgänger: BSF-KIOSK-02 / #136
Nachfolger: BSF-03E / #63

## 1. Ziel

BSF-03B liefert einen kontrollierten Teamlead-Prozess für die Prüfung und Finalisierung eines kundenbezogenen Leistungsnachweises für einen festen Zeitraum.

Version 1 ist ausdrücklich **Leistungsnachweis, keine Rechnung**.

Der Prozess umfasst:

1. Systemhaus, Kunde und Zeitraum wählen,
2. alle relevanten Tätigkeiten im zulässigen Scope prüfen,
3. abrechenbare und nicht abrechenbare Tätigkeiten gemeinsam sehen,
4. Abrechenbarkeit vor Finalisierung kontrolliert übersteuern,
5. abrechenbare Stunden reproduzierbar summieren,
6. finalen Snapshot unveränderbar speichern,
7. doppelte Verwendung einer Tätigkeit verhindern,
8. Korrekturen ausschließlich über einen Ersatznachweis durchführen,
9. kundenbezogenen PDF-/CSV-/JSON-Leistungsnachweis aus dem finalen Snapshot erzeugen.

## 2. Vorrang gegenüber älteren Planungsständen

Dieses Dokument und das neuere C-02-Konzept in `docs/BSF-CONCEPT-REGISTER.md` haben für BSF-03B V1 Vorrang vor widersprechenden Teilen von `docs/BSF-KUNDENABRECHNUNG.md` vom 20.08.2026.

Insbesondere gehören **nicht** zu V1:

- Stundensätze,
- Eurobeträge,
- Netto/Brutto,
- Umsatzsteuer,
- Rechnungsnummern,
- Zahlungsziele,
- allgemeines Teamlead-Editing fremder operativer Tätigkeiten.

Der ältere Entwurf bleibt historische Planungsquelle, ist aber in diesen Punkten nicht mehr die operative V1-Spezifikation.

## 3. Fachliche Trennung

Drei Zustände sind strikt getrennt:

### 3.1 Operative Tätigkeit

Quelle: `shared_activity_projection`.

Sie bleibt unter den bestehenden BSF-02C-Ownership-Regeln. Eine fremde Tätigkeit kann weiterhin nur vom ursprünglichen Publisher über den vorhandenen Publish-Pfad fortgeschrieben werden.

### 3.2 Billing-Review

Der Teamlead darf **nicht** die fremde Shared-Activity-Zeile verändern. Stattdessen wird ein revisionsgebundenes Review-Overlay geführt:

```text
source billable
+ optionales Teamlead-Override für exakt source_revision/source_hash
= effectiveBillable für den Leistungsnachweis
```

### 3.3 Finaler Leistungsnachweis

Die Finalisierung erzeugt einen eigenen unveränderbaren Snapshot. Spätere Änderungen an der Quelltätigkeit oder am Review-Overlay verändern diesen Snapshot nicht.

## 4. Berechtigung

Neue atomare Permission:

```text
performance.statement.manage
```

Fachlich zugeordnet an:

- `teamlead`.

Technische Besonderheit:

- `systemadministrator` besitzt aufgrund des bestehenden globalen All-Permissions-Modells ebenfalls diese Permission als technisch nachvollziehbarer Break-glass-Pfad.

Nicht zugeordnet an:

- `administrator`,
- `projectmanager`,
- `engineer`,
- `viewer`,
- `customer`.

Damit bleibt die vom Nutzer festgelegte Fachregel erhalten: **Abrechnungsvorbereitung und Finalisierung sind Teamlead-Aufgabe**. Ein Systemadministrator ist keine reguläre fachliche Abrechnungsrolle; jede Nutzung bleibt auditierbar.

`activity.edit`, `project.controlling.view` und `avkk.management.view` werden nicht als Ersatz für diese Permission verwendet.

## 5. Scope

Jede Review-/Finalisierungsaktion verlangt serverseitig:

```text
aktives Konto
AND performance.statement.manage
AND aktive Systemhouse Membership
AND aktiver Customer Access >= read
AND Customer gehört zum Systemhouse
```

Cross-Systemhouse und Cross-Customer bleiben DENY.

Customer Identity ist immer:

```text
(systemhouseId, customerId)
```

Kundenname, Projektname, AP-Name oder Activity-Titel sind niemals Autorisierungsmerkmale.

## 6. Zeitraum

V1 verwendet inklusive ISO-Datumsgrenzen:

```text
periodStart <= activity_date <= periodEnd
```

Regeln:

- `periodStart` und `periodEnd` sind erforderlich,
- `periodStart <= periodEnd`,
- maximal 366 Kalendertage,
- Activity-Zeit ist für die Periodenzuordnung nicht relevant, weil die Shared Projection `activity_date` als `date` führt,
- Finalisierungszeitstempel werden als `timestamptz` gespeichert.

## 7. Review-Menge

Die Prüfsicht zeigt alle aktiven, RLS-/Scope-konformen Activities des Kunden im Zeitraum sowie ihren Leistungsnachweisstatus.

Jede Zeile wird klassifiziert:

```text
reviewable
legacy_finalized
claimed_by_statement
```

### `reviewable`

- noch nicht durch einen aktiven BSF-03B-Leistungsnachweis beansprucht,
- Quell-`billingStatus` ist nicht `abgerechnet`.

### `legacy_finalized`

- Quell-`billingStatus = abgerechnet`,
- keine neue BSF-03B-Claim-Semantik wird nachträglich erfunden.

Diese Zeile bleibt sichtbar, wird aber nicht in einen neuen Leistungsnachweis aufgenommen.

### `claimed_by_statement`

- Activity besitzt bereits einen aktiven Claim eines finalisierten Leistungsnachweises.

Eine neue Finalisierung für einen Zeitraum mit solchen Zeilen wird nicht still teilfinalisiert. Der Benutzer wird auf den Ersatzworkflow verwiesen.

## 8. Billing-Review-Overlay

Neue Tabelle:

```text
customer_activity_billable_override
```

Fachschlüssel:

```text
(systemhouse_id, customer_id, activity_source_id, source_revision)
```

Mindestens gespeichert:

- `systemhouse_id`,
- `customer_id`,
- `activity_source_id`,
- `source_revision`,
- `source_hash`,
- `source_billable`,
- `effective_billable`,
- `changed_by`,
- `changed_at`.

Regeln:

- kein DELETE im normalen Benutzerpfad,
- erneute Entscheidung = UPDATE desselben revisionsgebundenen Overrides,
- ändert sich `source_revision` oder `source_hash`, gilt das alte Override nicht für die neue Revision,
- ein altes Override bleibt historisch/auditierbar,
- `effectiveBillable = current override ?? source billable`,
- kein Override ändert `shared_activity_projection.billable` oder `billing_status`.

Die UI zeigt ein stale Override sichtbar an, falls für eine ältere Source Revision ein Review existiert.

## 9. Review-Fingerprint gegen TOCTOU

Zwischen Prüfsicht und Finalisierung können sich Activities ändern. Deshalb erhält jeder Review-Stand einen deterministischen Fingerprint.

Kanonische Zeile, UTF-8:

```text
activity_source_id|source_revision|source_hash|activity_date|duration_hours|billing_status|effective_billable
```

Die Zeilen werden nach `activity_source_id` aufsteigend sortiert und mit `\n` verbunden. Darüber wird SHA-256 gebildet.

```text
reviewFingerprint = sha256(canonicalReviewRows)
```

Die Finalisierung sendet diesen Fingerprint mit. Die Datenbank berechnet den aktuellen Fingerprint erneut.

Mismatch:

```text
Daten haben sich seit der Prüfung geändert. Prüfsicht neu laden.
```

Kein Snapshot wird erzeugt.

Damit finalisiert der Teamlead exakt den Stand, den er geprüft hat.

## 10. Persistenzmodell finaler Leistungsnachweise

### 10.1 `customer_performance_statement`

Header eines unveränderbaren Snapshots.

Mindestens:

- `id uuid`,
- `series_id uuid`,
- `version integer`,
- `systemhouse_id uuid`,
- `customer_id uuid`,
- `customer_name_snapshot text`,
- `period_start date`,
- `period_end date`,
- `status text` mit `finalized | superseded`,
- `replaces_statement_id uuid NULL`,
- `superseded_by_statement_id uuid NULL`,
- `finalized_by uuid`,
- `finalized_at timestamptz`,
- `source_oldest_published_at timestamptz NULL`,
- `source_latest_published_at timestamptz NULL`,
- `review_fingerprint text`,
- `snapshot_hash text`,
- `item_count integer`,
- `billable_item_count integer`,
- `billable_hours numeric(12,2)`,
- `non_billable_hours numeric(12,2)`.

Inhaltsdaten des Snapshots sind nach Insert unveränderbar. `status` und `superseded_by_statement_id` dürfen nur durch den internen Ersatzworkflow fortgeschrieben werden.

### 10.2 `customer_performance_statement_item`

Snapshot je Activity.

Mindestens:

- `statement_id`,
- `position`,
- `activity_source_id`,
- `source_revision`,
- `source_hash`,
- `source_published_at`,
- `source_engineer_id` intern für Provenienz,
- `activity_date`,
- `title_snapshot`,
- `duration_hours`,
- `source_billable`,
- `effective_billable`,
- `billing_status_snapshot`,
- `project_source_id_snapshot`,
- `project_name_snapshot`,
- `work_package_source_id_snapshot`,
- `work_package_title_snapshot`,
- `category_key_snapshot`,
- `category_label_snapshot`.

Keine Zeile wird nachträglich editiert oder gelöscht.

## 11. Claim gegen Doppelverwendung

Neue Tabelle:

```text
customer_performance_activity_claim
```

Primärschlüssel:

```text
(systemhouse_id, customer_id, activity_source_id)
```

Sie zeigt, welcher **aktuell aktive** finale Leistungsnachweis die Activity beansprucht.

Regeln:

- jeder reviewable Snapshot-Item wird beim Finalisieren geclaimt, unabhängig davon, ob es effektiv billable oder non-billable ist,
- dadurch ist auch die Entscheidung „nicht abrechenbar“ Bestandteil des finalisierten Prüfstands,
- Unique-/PK-Konflikt verhindert Doppelverwendung unter Race Conditions,
- ein normaler zweiter Leistungsnachweis überspringt geclaimte Zeilen niemals still,
- bei Ersatz werden Claims innerhalb derselben Transaktion vom alten auf den neuen Snapshot übertragen beziehungsweise entsprechend dem neuen aktuellen Satz neu aufgebaut.

## 12. Atomare Finalisierung ohne exponierten SECURITY-DEFINER-RPC

Finalisierung wird **nicht** über einen für `authenticated` direkt ausführbaren SECURITY-DEFINER-RPC umgesetzt.

Stattdessen wird eine schmale Request-Tabelle verwendet:

```text
customer_performance_statement_request
```

Der Browser ruft eine TanStack Server Function auf. Diese schreibt mit demselben User-JWT genau einen Request.

Request enthält mindestens:

- `id` als Idempotency-Key,
- `systemhouse_id`,
- `customer_id`,
- `period_start`,
- `period_end`,
- `action = finalize | replace`,
- `replaces_statement_id NULL|uuid`,
- `expected_review_fingerprint`,
- `requested_by`,
- `requested_at`,
- `result_statement_id`.

Ein **nicht direkt ausführbarer** interner `BEFORE INSERT`-Trigger verarbeitet den Request atomar.

Die Triggerfunktion darf `SECURITY DEFINER` sein, wenn zwingend:

- `search_path = ''`,
- alle Objekte voll schemaqualifiziert,
- `REVOKE ALL ... FROM PUBLIC, anon, authenticated`,
- ausschließlich als Trigger aufrufbar,
- explizite Prüfung von `auth.uid()`, aktivem Konto, Permission, Membership und Customer Access,
- keine dynamischen SQL-Fragmente aus Benutzereingaben,
- vollständige Scope-Checks vor jeder Snapshot-Erzeugung.

Damit bleiben Statement/Header/Items/Claims ohne direkte Client-DML-Rechte; gleichzeitig bleibt die Finalisierung atomar und es entsteht keine neue exponierte SECURITY-DEFINER-Warnung als gewollter Normalpfad.

## 13. Idempotenz

`customer_performance_statement_request.id` ist der Client-/Server-Idempotency-Key.

- erster erfolgreicher Insert erzeugt genau einen Snapshot,
- Wiederholung derselben Request-ID erzeugt keinen zweiten Snapshot,
- Server Function liest bei Duplicate-Key den bereits abgeschlossenen Request und gibt dessen `result_statement_id` zurück, sofern Actor und Scope identisch sind,
- eine Request-ID darf nie für anderen Customer/Zeitraum wiederverwendet werden.

## 14. Finalisierungsalgorithmus

Der interne Trigger arbeitet innerhalb einer Transaktion:

1. Actor und Scope prüfen.
2. Zeitraum validieren.
3. aktuellen Customer-Namen laden.
4. alle aktiven Activities im Customer-/Zeitraumscope laden.
5. `legacy_finalized` aussortieren, aber für Review-/Auditkontext zählen.
6. aktive Claims prüfen.
7. bei normaler Finalisierung: jeder aktive Claim im Zeitraum => Abbruch und Hinweis Ersatzworkflow.
8. aktuelle revisionsgebundene Overrides anwenden.
9. aktuellen Review-Fingerprint berechnen und mit erwartetem Fingerprint vergleichen.
10. mindestens eine reviewable Activity verlangen.
11. Header anlegen.
12. alle reviewable Activities als immutable Items snapshotten.
13. Claims anlegen.
14. Summen aus den gespeicherten Snapshot-Items bilden.
15. deterministischen Snapshot-Hash berechnen.
16. Audit schreiben.
17. `result_statement_id` in den Request schreiben.

Jeder Fehler rollt die gesamte Transaktion zurück.

## 15. Summen und Rundung

Die Shared Projection speichert `duration_hours` bereits als `numeric(10,2)`.

V1 übernimmt diesen Wert unverändert in den Snapshot und summiert Datenbank-seitig als `numeric`.

- keine erneute Minuten-/Stundenrundung pro Zeile,
- Ausgabe mit zwei Dezimalstellen,
- `billable_hours` = Summe `duration_hours` für `effective_billable=true`,
- `non_billable_hours` = Summe für `effective_billable=false`,
- keine Euroberechnung.

## 16. Freshness und Provenienz

Jeder Snapshot speichert:

- ältesten verwendeten `source_published_at`,
- jüngsten verwendeten `source_published_at`,
- Source Revision und Source Hash je Item,
- Review Fingerprint,
- Snapshot Hash.

Die UI zeigt den Datenstand vor Finalisierung sichtbar an.

V1 kann nicht beweisen, dass noch nie publizierte Activities eines anderen Publishers existieren. Deshalb darf der Leistungsnachweis nicht behaupten „global vollständig“. Er dokumentiert transparent den finalisierten Stand der zum Zeitpunkt der Prüfung vorhandenen Shared Projection.

Der Teamlead bestätigt vor Finalisierung den angezeigten Datenstand. Diese Bestätigung ist Bestandteil des Finalisierungsrequests/Audits.

## 17. Ersatz-/Korrekturworkflow

Ein finaler Snapshot wird niemals entsperrt oder inhaltlich überschrieben.

Korrektur:

```text
finalized v1
  -> Ersatz anfordern
      -> aktuelle Daten neu prüfen
      -> neuer Fingerprint
      -> replace-Request
          -> v1 status=superseded
          -> v2 finalized
          -> Claims atomar auf v2 umstellen
```

Regeln:

- gleicher `(systemhouseId, customerId)` und gleicher Zeitraum,
- `series_id` bleibt gleich,
- `version` wird um 1 erhöht,
- `replaces_statement_id` verweist auf direkte Vorgängerversion,
- alte Items bleiben unverändert,
- `superseded_by_statement_id` ist reine Lifecycle-Metadatenfortschreibung,
- kein DELETE historischer Snapshots,
- keine stille Korrektur.

V1 benötigt keinen separaten Storno-ohne-Ersatz-Pfad.

## 18. Quell-`billingStatus`

Das bestehende Quellfeld `billingStatus` bleibt historischer/operativer Source-Status.

BSF-03B verwendet **Claims** als maßgeblichen Zustand für „in einem neuen finalisierten Leistungsnachweis verwendet“.

Die Finalisierung schreibt **nicht** `billingStatus='abgerechnet'` in fremde Shared-Activity-Projections.

Damit bleiben Publisher-Ownership und Leistungsnachweis-Finalisierung getrennt.

## 19. Providerneutraler Servicevertrag

Vorgesehene Fachobjekte:

```text
PerformanceStatementReview
PerformanceStatementReviewRow
PerformanceStatementBillableOverride
PerformanceStatementSnapshot
PerformanceStatementSnapshotItem
PerformanceStatementSummary
PerformanceStatementFreshness
PerformanceStatementRepository
```

Providerneutrale Fachlogik kennt keine Supabase-Tabelle und keinen React-Typ.

## 20. UI

Vorgesehene Route:

```text
/leistungsnachweis
```

unter `_authenticated` mit `performance.statement.manage`.

Aufbau:

1. Kunde + Zeitraum,
2. Freshness-/Datenstand-Hinweis,
3. Prüftabelle mit allen sichtbaren Activities,
4. Status `prüfbar | legacy abgerechnet | bereits finalisiert`,
5. Source billable und effective billable,
6. Toggle nur für `reviewable`,
7. Summen billable/non-billable,
8. Finalisierungsdialog mit expliziter Bestätigung,
9. Historie der finalen/superseded Nachweise,
10. Exportaktionen am finalisierten Snapshot.

Keine allgemeine Activity-Bearbeitung in dieser Sicht.

## 21. Kundenfassung / Export

Die Kundenfassung wird **ausschließlich aus dem finalen Snapshot** erzeugt, nie aus Live-Daten.

Verbindliche Formate V1:

- PDF,
- CSV,
- JSON.

Die bestehende Reporting-Architektur aus ADR-0028 wird wiederverwendet.

Neue `ReportDefinition`:

```text
reportId: performance-statement
version: 1.0.0
documentId: SYSING-104
permission: performance.statement.manage
formats: pdf, csv, json
```

Kundenausgabe enthält mindestens:

- Überschrift `Leistungsnachweis`,
- Kunde,
- Zeitraum,
- Statement-Version/technische Referenz,
- Finalisierungsdatum,
- Datenstand,
- billable Tätigkeitszeilen,
- Datum,
- Leistungsbezeichnung,
- Projekt-/AP-Kontext soweit vorhanden,
- Dauer,
- Summe abrechenbare Stunden.

Kundenausgabe enthält **nicht**:

- Name des Leistungserbringers,
- Engineer-ID,
- interne DB-UUIDs,
- Source Hash/Revision,
- interne Auditdaten,
- nicht freigegebene interne Notizen,
- Stundensatz,
- Betrag,
- Umsatzsteuer-/Rechnungsdaten.

Non-billable Items bleiben im internen Snapshot/Audit erhalten, erscheinen aber standardmäßig nicht in der Kundenfassung.

## 22. Audit

Mindestens folgende Ereignisse werden im bestehenden append-only `public.audit_log` protokolliert:

```text
performance_statement.billable_override.insert
performance_statement.billable_override.update
performance_statement.finalized
performance_statement.replaced
```

Audit-Payload enthält nur notwendige technische Metadaten, keine Secrets und keine komplette Tätigkeitstexte-Kopie.

## 23. RLS / DML-Regeln

### Override-Tabelle

- SELECT/INSERT/UPDATE nur `performance.statement.manage` + Membership + Customer Access,
- kein DELETE für authenticated,
- Audit-Trigger auf INSERT/UPDATE.

### Request-Tabelle

- INSERT nur manage + Scope,
- SELECT nur eigener Request beziehungsweise berechtigter Scope,
- kein UPDATE/DELETE durch authenticated.

### Statement/Header/Items/Claims

- authenticated erhält SELECT im berechtigten Scope,
- **keine direkte INSERT/UPDATE/DELETE-Berechtigung**,
- Writes ausschließlich durch interne Triggerfunktion des Request-Workflows.

## 24. Security-Negativvertrag

Nachzuweisen:

- unauthenticated -> DENY,
- administrator -> DENY,
- projectmanager -> DENY,
- engineer -> DENY,
- viewer -> DENY,
- customer -> DENY,
- inaktives Konto -> DENY,
- fehlende Membership -> DENY,
- fehlender Customer Access -> DENY,
- fremdes Systemhaus -> DENY,
- fremder Customer -> DENY,
- manipulierte Activity Source ID -> keine fremden Daten,
- direkter DML-Versuch auf Statement/Items/Claims -> DENY,
- direkter Execute-Versuch auf interne Triggerfunktion -> DENY,
- stale Review Fingerprint -> Finalisierung rollt zurück,
- doppelter Claim -> Finalisierung rollt zurück,
- zweiter Finalisierungsversuch für bereits geclaimten Zeitraum -> Abbruch,
- Replacement darf nur direkten aktiven Vorgänger im gleichen Scope/Zeitraum ersetzen.

## 25. Import/Export/Backup

Die neuen Snapshot-, Request-, Override- und Claim-Daten sind zentrale Geschäftsdaten.

BSF-03B muss deshalb Auswirkungen auf:

- Backup/Restore,
- JSON-Gesamtexport/-import,
- Datenbank-Schema-Dokumentation

prüfen und entsprechend ergänzen.

Finalisierte Snapshots dürfen bei Restore nicht ihre Claim-/Versionsbeziehungen verlieren.

## 26. Aufbewahrung

V1 führt keinen automatischen Purge finalisierter oder superseded Leistungsnachweise ein.

Technisch gilt:

- kein Hard Delete über die Anwendung,
- Snapshot-/Auditdaten bleiben erhalten,
- eine organisatorisch/rechtlich definierte Lösch-/Aufbewahrungsfrist kann später als eigener Governance-/Retention-Vertrag ergänzt werden.

Es wird keine gesetzliche Aufbewahrungsfrist im Produktcode erfunden.

## 27. Nicht-Scope

Nicht Bestandteil von BSF-03B:

- Rechnungserstellung,
- Preise/Stundensätze/Beträge,
- Umsatzsteuer,
- Zahlungsverkehr,
- Buchhaltungsintegration,
- allgemeines Editieren fremder Tätigkeiten,
- Personensicht/Ranking,
- Project Responsibility/Vertretung,
- Kundenportal,
- Gesamt-Kunden-PDF aus BSF-03C,
- SharePoint/Graph/MCP/Agenten,
- automatische Finalisierung.

## 28. Abnahmekriterien

BSF-03B ist erst abnahmefähig, wenn:

1. `performance.statement.manage` nur Teamlead plus bestehendem Sysadmin-Break-glass zur Verfügung steht.
2. Teamlead fremde Shared-Activity-Zeilen nicht direkt ändern kann.
3. Billable-Override revisionsgebunden und auditiert ist.
4. Review Fingerprint Änderungen zwischen Review und Finalisierung erkennt.
5. Finalisierung atomar und fail-closed ist.
6. Statement/Items nach Finalisierung inhaltlich unveränderbar sind.
7. Claims Doppelverwendung unter Konkurrenz verhindern.
8. Non-billable Activities in der Prüfsicht und im internen Snapshot erhalten bleiben.
9. Kundenausgabe nur effektiv billable Items enthält.
10. Kundenfassung keinen Leistungserbringername/Engineer-ID enthält.
11. Keine Euro-/Rechnungslogik vorhanden ist.
12. Ersatzworkflow alten Snapshot erhält und neue Version erzeugt.
13. Cross-Systemhouse/Cross-Customer/IDOR/BOLA DENY nachgewiesen ist.
14. Interne Triggerfunktion nicht direkt durch authenticated ausführbar ist.
15. Export PDF/CSV/JSON aus exakt demselben finalen Snapshot reproduzierbar ist.
16. UI-/Export-Summen dem gespeicherten Snapshot entsprechen.
17. Backup/Restore-Beziehungen getestet sind.
18. Security Advisor keine neue unerklärte exponierte SECURITY-DEFINER-Warnung liefert.
19. E2E und Accessibility PASS sind.
20. vollständige CI inklusive Technical Debt und Technical Report & Quality Gate PASS ist.
21. Dokumentation und Abschlussbericht synchron sind.
