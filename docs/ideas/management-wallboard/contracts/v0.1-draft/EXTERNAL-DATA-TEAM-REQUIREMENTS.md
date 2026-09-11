# INT-CONTRACT-01 - Anforderungen an das externe Datenteam

Status: **DRAFT / CONTRACT REQUIREMENTS**  
Dokumentversion: **0.1.0-draft**  
Datum: 2026-09-11  
Verwandtes TDF-Dokument: `TDF-Operatives-Management-Wallboard_0.6.0-draft.md`  
Verwandter Contract: `wallboard-management-data.schema.json` Version `0.1.0-draft`  
Issue: #125  
Parent-Idee: #123

## 1. Zweck

Dieses Dokument beschreibt, **welche Daten das externe Datenteam liefern soll, wie die liefernden Agenten/Collector arbeiten sollen und welche messbare Datenqualitaet erwartet wird**.

Es ist ein frueher Liefervertrag fuer die Parallelisierung. Es ist **keine Freigabe fuer produktive Runtime-, Datenbank-, Authentisierungs- oder Transportimplementierung im Sysing Dashboard**.

Die aktive BSF-Sprintreihenfolge bleibt unveraendert.

## 2. Rollen- und Verantwortungsgrenze

### Externes Datenteam

Das externe Datenteam ist verantwortlich fuer:

- lesenden Zugriff auf SharePoint, PRTG und Exchange Online,
- Beschaffung der vereinbarten Quelldaten,
- nachvollziehbare Abbildung der Quelldaten auf den JSON-Vertrag,
- stabile Source-IDs,
- korrekte Zeitstempel und Source-Status,
- technische und fachliche Vorvalidierung vor Auslieferung,
- Wiederholbarkeit und Idempotenz der Lieferung,
- nachvollziehbare Fehlerkennzeichnung,
- Testdaten und Abnahmenachweise.

### Sysing Dashboard

Das Sysing Dashboard ist verantwortlich fuer:

- Definition und Versionierung des JSON-Vertrags,
- Consumer-seitige Schema- und Scope-Validierung,
- spaeteren Provider Adapter,
- spaetere Persistenz/Projektion,
- RBAC/RLS/Least Privilege,
- Freshness- und Teilfehlerbehandlung,
- Management-Wallboard-Darstellung.

Die externe Lieferseite darf keine internen Supabase-/Azure-SQL-Tabellen oder andere interne Persistenzdetails als Voraussetzung benoetigen.

## 3. Agenten-/Collector-Anforderung

Der Begriff `Agent` bezeichnet in diesem Vertrag primaer einen **deterministischen, nachvollziehbaren Read-Collector**.

### 3.1 Erlaubtes Verhalten

Ein Agent/Collector darf:

- Daten aus der freigegebenen Quelle lesen,
- definierte Felder normalisieren,
- Werte aggregieren,
- bekannte Statuswerte mappen,
- Zeitstempel und Source-Status erzeugen,
- Payloads gegen das vorgegebene JSON Schema pruefen,
- bei transienten Fehlern kontrolliert wiederholen.

### 3.2 Nicht erlaubtes Verhalten

Ein Agent/Collector darf nicht:

- fehlende Werte erfinden,
- Inhalte halluzinieren oder schaetzen,
- Statuswerte ohne dokumentierte Mapping-Regel ableiten,
- produktive Secrets in Payloads oder Logs schreiben,
- unnoetige personenbezogene Inhalte uebermitteln,
- Mailbody, Betreff, Sender oder Empfaenger an das Wallboard liefern,
- Urlaubsgruende, Diagnosen oder Namen in der Abwesenheitsaggregation liefern,
- interne Sysing-Datenbank-IDs erzeugen oder voraussetzen.

### 3.3 Einsatz generativer KI

Fuer den Contract `0.1.0-draft` ist **kein LLM erforderlich**.

Falls das externe Team intern generative KI einsetzen moechte, gilt:

- kein KI-generierter Wert darf ungeprueft als Quelldatum geliefert werden,
- jede gelieferte Zahl und jeder Status muss deterministisch auf eine reale Quelle zurueckfuehrbar sein,
- KI darf nicht fehlende Daten ergaenzen,
- KI-Inferenz muss vor produktiver Nutzung separat freigegeben und dokumentiert werden,
- der JSON-Vertrag bleibt unabhaengig von der eingesetzten Agenten-/KI-Technologie.

## 4. Gemeinsame Lieferanforderungen

Jede Lieferung muss dem Contract `0.1.0-draft` entsprechen.

Pflichtmerkmale:

- `schemaVersion = 0.1.0-draft`,
- eindeutige `deliveryId`,
- `deliveryType = snapshot`,
- `generatedAt`,
- `observedAt`,
- Producer-Angabe,
- providerneutraler `systemhouseId`,
- `snapshotComplete`,
- `missingDomains`,
- Source-Status je beteiligter Quelle,
- Datenobjekt mit den gelieferten Domaenen.

Zeitangaben muessen als RFC-3339/ISO-8601 `date-time` mit explizitem Offset, bevorzugt UTC (`Z`), geliefert werden.

## 5. Domaene SharePoint - Projekte

Je Projekt mindestens:

- stabile `sourceId`,
- `title`,
- `status`,
- `trafficLight`,
- `lastChangedAt`.

Qualitaetsanforderungen:

- `sourceId` muss innerhalb der Quelle dauerhaft stabil sein,
- Titel darf nicht leer sein,
- Status muss aus einer dokumentierten Quell-/Mapping-Regel stammen,
- Ampelfarbe darf nicht frei interpretiert werden; die Mapping-Regel muss versioniert dokumentiert sein,
- `lastChangedAt` muss dem letzten relevanten Quellstand entsprechen,
- keine Dubletten derselben `sourceId` innerhalb eines Snapshots.

## 6. Domaene SharePoint - Arbeitspakete

Je Arbeitspaket mindestens:

- stabile `sourceId`,
- `projectSourceId`,
- `title`,
- `status`,
- `trafficLight`,
- `lastChangedAt`.

Zusatzanforderungen:

- `projectSourceId` muss auf das fachlich zugehoerige Projekt zeigen,
- bei einem vollstaendigen Snapshot muss die referenzierte Projekt-ID im selben Snapshot vorhanden oder als vertraglich bekannte externe Referenz dokumentiert sein,
- keine stillen Umhaengungen zwischen Projekten,
- Status-/Ampel-Mapping muss der dokumentierten Regel entsprechen.

## 7. Domaene SharePoint - Taetigkeiten

Je Taetigkeit mindestens:

- stabile `sourceId`,
- `workPackageSourceId`,
- `title`,
- `status`,
- `trafficLight`,
- `lastChangedAt`.

Zusatzanforderungen:

- `workPackageSourceId` muss fachlich korrekt sein,
- keine Dubletten,
- keine stillen Zuordnungswechsel,
- nur fuer das Wallboard erforderliche Informationen liefern,
- keine personenbezogenen Leistungsbewertungen ableiten.

## 8. Domaene SharePoint - Urlaub / Abwesenheit

Geliefert werden ausschliesslich aggregierte Werte:

- `employeesOnLeaveThisWeek`,
- `employeesStartingLeaveNextWeek`,
- `observedAt`.

Verboten sind:

- Namen,
- Personalnummern,
- E-Mail-Adressen,
- konkrete Urlaubsgruende,
- Krankheitsgruende,
- Diagnosen,
- Freitext aus Abwesenheitsantraegen.

Die fachliche Definition von `employeesStartingLeaveNextWeek` ist vor Contract 1.0 gemeinsam festzulegen. Bis dahin muss die verwendete Berechnungsregel im Mapping-Dokument des externen Teams explizit beschrieben werden.

## 9. Domaene PRTG - Infrastruktur

Geliefert werden mindestens:

- `ok`,
- `warning`,
- `critical`,
- `total`,
- `observedAt`.

Qualitaetsanforderungen:

- alle Zaehler sind nichtnegativ,
- `total` muss fuer Contract 0.1 dem nachvollziehbaren Gesamtbestand des verwendeten Sensorscopes entsprechen,
- Zuordnung von PRTG-Status zu `ok`/`warning`/`critical` muss dokumentiert sein,
- pausierte, unbekannte oder nicht erreichbare Sensoren duerfen nicht still als `ok` gewertet werden,
- falls diese Zustaende nicht sauber in V0.1 abbildbar sind, muss die Quelle als `delayed`, `stale` oder `error` markiert und die Mapping-Luecke dokumentiert werden.

Pilotziel fuer die Abfragefrequenz: etwa **2 Minuten**. Diese Frequenz ist Planungswert und wird vor produktiver Abnahme anhand Last, API-Limits und Betriebsanforderungen bestaetigt.

## 10. Domaene Exchange Online - Support-Postfach

Geliefert werden ausschliesslich Mengenwerte:

- `total`,
- `today`,
- `yesterday`,
- `older`,
- `observedAt`.

Nicht geliefert werden duerfen:

- Betreff,
- Mailbody,
- Absender,
- Empfaenger,
- Attachment-Namen oder -Inhalte,
- Klassifikationen aus Mailinhalten,
- KI-bewertete Dringlichkeit.

Die Zaehllogik muss fuer V0.1 dokumentieren:

- welches Postfach,
- welcher Ordner,
- welche Zeitzone fuer Tagesgrenzen,
- ob gelesene und ungelesene Nachrichten gemeinsam gezaehlt werden,
- Definition von `older`.

Fuer einen als vollstaendig markierten Snapshot muessen die Altersklassen fachlich konsistent sein. Abweichungen sind als Datenqualitaetsfehler zu melden und nicht still zu korrigieren.

## 11. Datenqualitaetsziele

Folgende Mindestqualitaet wird fuer die Contract-Abnahme angestrebt:

| Kriterium | Ziel fuer 0.1-Draft |
| --- | --- |
| JSON syntaktisch gueltig | 100 % |
| Schema-Validierung | 100 % fuer als lieferfaehig markierte Payloads |
| Pflichtfelder vorhanden | 100 % |
| `deliveryId` formal gueltig und eindeutig | 100 % |
| Source-IDs innerhalb einer Domaene eindeutig | 100 % |
| Referenzen Projekt -> AP -> Taetigkeit fachlich korrekt | 100 % bei Vollsnapshot |
| Zeitstempel formal gueltig | 100 % |
| Negative Zaehler | 0 % zulassen |
| Verbotene Mailinhalte | 0 % |
| Verbotene personenbezogene Abwesenheitsdetails | 0 % |
| Unmarkierte Teilfehler | 0 % |
| Erfundene/geschaetzte Werte | 0 % |

Diese Werte sind Contract-Qualitaetsziele, keine Aussage ueber die Qualitaet der urspruenglichen Fachsystemdaten. Wenn eine Quelle unvollstaendig oder fehlerhaft ist, muss dies transparent gekennzeichnet werden.

## 12. Freshness- und Aktualitaetsanforderungen

Jede Quelle muss `observedAt` und einen `sourceStatus.state` aus `ok`, `delayed`, `stale`, `error` liefern.

Vorgeschlagene Pilot-SLOs zur Abstimmung:

| Domaene | Ziel-Aktualisierung | ab wann mindestens `stale` pruefen |
| --- | ---: | ---: |
| Projekte/AP/Taetigkeiten | <= 10 Minuten | > 30 Minuten |
| Urlaub/Abwesenheit | <= 60 Minuten | > 4 Stunden |
| PRTG | ca. 2 Minuten | > 6 Minuten |
| Support-Postfach | <= 5 Minuten | > 15 Minuten |

Diese Schwellen sind **0.1-Draft-Planungswerte** und werden mit dem externen Team sowie dem Management vor Contract 1.0 finalisiert.

Ein `ok`-Status darf nicht gesetzt werden, wenn der zugrunde liegende Datenstand bereits oberhalb der vereinbarten Stale-Schwelle liegt.

## 13. Vollstaendigkeit und Teilfehler

### Vollsnapshot

Bei `snapshotComplete = true` gilt:

- alle vertraglich erwarteten Domaenen sind vorhanden,
- `missingDomains` ist leer,
- fehlende Domaenen duerfen nicht als leere, angeblich aktuelle Datenmenge getarnt werden.

### Teilsnapshot / Teilfehler

Bei `snapshotComplete = false` gilt:

- mindestens eine Domaene steht in `missingDomains`,
- betroffene Quelle ist ueber `sourceStatus` als `delayed`, `stale` oder `error` gekennzeichnet,
- fehlende Daten duerfen consumer-seitig nicht als Loeschung interpretiert werden,
- intakte Domaenen duerfen weiterhin geliefert werden.

## 14. Idempotenz und Wiederholung

Fuer Contract 0.1 gilt:

- ein technischer Retry derselben fachlichen Lieferung verwendet dieselbe `deliveryId`,
- veraenderte Nutzdaten erfordern eine neue `deliveryId`,
- derselbe `deliveryId` darf nicht mit unterschiedlichen Payload-Inhalten erneut verwendet werden,
- der Producer muss Retrys so gestalten, dass keine fachlichen Dubletten entstehen.

Die spaetere Consumer-Implementierung wird diese Regeln in BSF-05 technisch erzwingen bzw. pruefen.

## 15. Mapping- und Provenienz-Nachweis

Das externe Team muss fuer jede Domaene ein Mapping-Dokument pflegen.

Mindestens:

- Quellsystem,
- Quellobjekt/-liste/-endpoint,
- Quellfeld,
- Zielfeld im JSON-Vertrag,
- Transformation,
- Status-/Ampelregel,
- Aggregationsregel,
- Zeitzone,
- bekannte Ausnahmen,
- Owner der Mapping-Regel,
- Versionsstand.

Jeder gelieferte Wert muss auf eine reale Quelle oder eine dokumentierte deterministische Aggregationsregel zurueckfuehrbar sein.

## 16. Fehlerbehandlung

Agenten/Collector muessen Fehler unterscheiden koennen:

- Quelle nicht erreichbar,
- Authentisierung/Autorisierung fehlgeschlagen,
- API-Limit/Throttling,
- unerwartetes Quellformat,
- Mapping nicht moeglich,
- Schema-Validierung fehlgeschlagen,
- fachliche Konsistenzpruefung fehlgeschlagen,
- Daten zu alt.

Fehlertexte im Payload muessen kurz und nicht sensibel sein. Tokens, interne URLs mit Secrets, komplette Stacktraces oder personenbezogene Inhalte gehoeren nicht in den Payload.

## 17. Logging und Nachvollziehbarkeit

Das externe Team muss intern nachvollziehen koennen:

- Start/Ende eines Collector-Laufs,
- beteiligte Quelle,
- erzeugte `deliveryId`,
- Schema-Version,
- Resultat der Validierung,
- Anzahl gelieferter Objekte pro Domaene,
- Source-Status,
- Fehlercode/Kategorie.

Logs muessen datensparsam sein. Produktive Secrets und unnoetige personenbezogene Inhalte duerfen nicht protokolliert werden.

## 18. Sicherheitsanforderungen

- Least Privilege auf Quellsystemen,
- nach Moeglichkeit read-only Berechtigungen,
- keine produktiven Secrets im Repository,
- keine Secrets in JSON-Beispielen,
- keine Service-Role des Sysing Dashboards fuer die Datenerfassung,
- Transportauthentisierung wird spaeter separat festgelegt,
- Rotation und Revocation von Zugangsdaten muessen betrieblich moeglich sein,
- Agenten muessen ohne unkontrollierten Internetabfluss betrieben werden koennen, wenn Unternehmensdaten verarbeitet werden.

## 19. Vorabtests des externen Teams

Vor jeder Testlieferung muss das externe Team mindestens pruefen:

1. JSON parsebar.
2. Schema-Version korrekt.
3. JSON Schema PASS.
4. Pflichtfelder vollstaendig.
5. Source-IDs eindeutig.
6. Referenzen konsistent.
7. Zeitstempel gueltig.
8. Zaehler nichtnegativ.
9. Vollstaendigkeitsstatus konsistent.
10. Keine verbotenen Inhalte/Secrets.
11. Freshness plausibel.
12. Mapping-Version dokumentiert.

## 20. Abnahmepaket des externen Teams

Fuer die gemeinsame C1/C2-Abnahme soll das externe Team liefern:

- mindestens einen realitaetsnahen, aber datenschutzkonformen Vollsnapshot,
- mindestens einen Teilfehler-Snapshot,
- mindestens einen absichtlich ungueltigen Payload fuer Negativtests,
- Mapping-Dokument je Quelle,
- dokumentierte Freshness-/Polling-Einstellungen,
- Ergebnis der eigenen Schema-Validierung,
- Liste bekannter Mapping-Luecken,
- Ansprechpartner/Owner fuer jede Datenquelle.

## 21. Abnahmekriterien fuer das Datenteam

Die Lieferfaehigkeit gilt fuer den Draft als nachgewiesen, wenn:

- positive Beispiele gegen das Schema PASS sind,
- negative Beispiele reproduzierbar FAIL sind,
- keine verbotenen Inhalte enthalten sind,
- Voll-/Teilfehler semantisch korrekt behandelt werden,
- IDs stabil und Referenzen konsistent sind,
- Source-Status und Zeitstempel belastbar sind,
- Mapping und Aggregationen nachvollziehbar dokumentiert sind,
- keine generierten/erfundenen Werte auftreten,
- Retry/Idempotenz-Regeln eingehalten werden,
- offene Punkte transparent dokumentiert sind.

## 22. Noch offene gemeinsame Entscheidungen

Vor Contract 1.0 sind mindestens zu klaeren:

- finale SharePoint-Feldliste und Statusmapping,
- genaue Definition der Urlaubskennzahl fuer die Folgewoche,
- PRTG-Scope und Behandlung von paused/unknown/down,
- Exchange-Ordner, Zeitzone und Altersgrenzen,
- finale Freshness-SLOs,
- Payload-Groesse und Batching,
- produktiver Transport,
- Authentisierung zwischen den Teams,
- Acknowledgement/Retry-Protokoll,
- Delta-Semantik,
- Betriebsmonitoring und Alarmierung.

## 23. Versionierungsregel

Dieses Dokument ist Teil des Contract-Pakets `0.1.0-draft` und wird gemeinsam mit diesem versioniert.

- redaktionelle Korrektur ohne Vertragswirkung -> Patch,
- neue optionale Felder oder neue kompatible Anforderungen -> Minor,
- inkompatible Vertragsaenderung nach 1.0 -> Major,
- bereits veroeffentlichte Contract-Versionen werden nicht still ueberschrieben,
- jede Aenderung wird im Contract-`CHANGELOG.md` dokumentiert.

Das uebergeordnete TDF-Managementdokument besitzt einen eigenen Versionszyklus und darf nicht mit der Contract-Version verwechselt werden.
