# INT-CONTRACT-01 - Anforderungen an das externe Datenteam

Status: **DRAFT / CONTRACT REQUIREMENTS**  
Dokumentversion: **0.1.0-draft**  
Datum: **2026-09-11**  
Verwandtes TDF-Dokument: `TDF-Operatives-Management-Wallboard_0.7.0-draft.md`  
Verwandter Contract: `wallboard-management-data.schema.json` Version `0.1.0-draft`  
Issue: #125  
Parent-Idee: #123  
Draft PR: #124

## 1. Zweck

Dieses Dokument beschreibt verbindlich fuer den Draft, **welche Daten das externe Datenteam liefern soll, wie die liefernden Agenten/Collector arbeiten sollen und welche messbare Datenqualitaet erwartet wird**.

Es ist ein frueher Liefervertrag fuer die Parallelisierung. Es ist **keine Freigabe fuer produktive Runtime-, Datenbank-, Authentisierungs- oder Transportimplementierung im Sysing Dashboard**. Die aktive BSF-Sprintreihenfolge bleibt unveraendert.

## 2. Rollen- und Verantwortungsgrenze

### 2.1 Externes Datenteam

Das externe Datenteam ist verantwortlich fuer:

- lesenden Zugriff auf die freigegebenen Quellsysteme,
- Beschaffung der vereinbarten Quelldaten,
- nachvollziehbare Abbildung der Quelldaten auf den JSON-Vertrag,
- stabile Source-IDs und konsistente Referenzen,
- korrekte Zeitstempel und Source-Status,
- technische und fachliche Vorvalidierung vor Auslieferung,
- Wiederholbarkeit und Idempotenz der Lieferung,
- nachvollziehbare Fehlerkennzeichnung,
- Mapping-/Provenienz-Dokumentation,
- Testdaten und Abnahmenachweise,
- Betrieb und Ueberwachung der eigenen Collector-Komponenten.

### 2.2 Sysing Dashboard

Das Sysing Dashboard ist verantwortlich fuer:

- Definition und Versionierung des JSON-Vertrags,
- Consumer-seitige Schema- und Scope-Validierung,
- spaeteren Provider Adapter,
- spaetere Persistenz/Projektion,
- RBAC/RLS/Least Privilege,
- Freshness- und Teilfehlerbehandlung,
- Management-Wallboard-Darstellung,
- spaeteres Runtime-Monitoring und Audit.

Die externe Lieferseite darf keine internen Supabase-/Azure-SQL-Tabellen oder andere interne Persistenzdetails als Voraussetzung benoetigen.

## 3. Agenten-/Collector-Anforderung

Der Begriff `Agent` bezeichnet in diesem Vertrag primaer einen **deterministischen, nachvollziehbaren Read-Collector**.

### 3.1 Erlaubtes Verhalten

Ein Agent/Collector darf:

- Daten aus der freigegebenen Quelle lesen,
- definierte Felder normalisieren,
- Werte nach dokumentierten Regeln aggregieren,
- bekannte Statuswerte nach versionierten Mapping-Regeln abbilden,
- Zeitstempel und Source-Status erzeugen,
- Payloads gegen das vorgegebene JSON Schema pruefen,
- bei transienten Fehlern kontrolliert wiederholen,
- eigene Betriebs- und Validierungsmetriken erzeugen.

### 3.2 Nicht erlaubtes Verhalten

Ein Agent/Collector darf nicht:

- fehlende Werte erfinden,
- Inhalte halluzinieren oder schaetzen,
- Statuswerte ohne dokumentierte Mapping-Regel ableiten,
- produktive Secrets in Payloads oder Logs schreiben,
- unnoetige personenbezogene Inhalte uebermitteln,
- Mailbody, Betreff, Sender oder Empfaenger an das Wallboard liefern,
- Urlaubsgruende, Diagnosen oder Namen in der Abwesenheitsaggregation liefern,
- interne Sysing-Datenbank-IDs erzeugen oder voraussetzen,
- Teilfehler als scheinbar gueltige leere Daten tarnen.

### 3.3 Einsatz generativer KI

Fuer Contract `0.1.0-draft` ist **kein LLM erforderlich**.

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
- providerneutraler `scope.systemhouseId`,
- `completeness.snapshotComplete`,
- `completeness.missingDomains`,
- `sourceStatus` je beteiligter Quelle,
- `data` mit den gelieferten Domaenen.

Zeitangaben muessen als RFC-3339/ISO-8601 `date-time` mit explizitem Offset, bevorzugt UTC (`Z`), geliefert werden.

## 5. Fachliche Daten - SharePoint

### 5.1 Projekte

Je Projekt mindestens:

- stabile `sourceId`,
- `title`,
- `status`,
- `trafficLight`,
- `lastChangedAt`.

Qualitaetsanforderungen:

- `sourceId` ist innerhalb der Quelle dauerhaft stabil,
- Titel ist nicht leer,
- Status stammt aus einer dokumentierten Quell-/Mapping-Regel,
- Ampelfarbe wird nicht frei interpretiert,
- `lastChangedAt` entspricht dem letzten relevanten Quellstand,
- keine Dubletten derselben `sourceId` innerhalb eines Snapshots.

### 5.2 Arbeitspakete

Je Arbeitspaket mindestens:

- stabile `sourceId`,
- `projectSourceId`,
- `title`,
- `status`,
- `trafficLight`,
- `lastChangedAt`.

Zusaetzlich gilt:

- `projectSourceId` zeigt auf das fachlich zugehoerige Projekt,
- bei einem Vollsnapshot ist die Referenz im selben Snapshot oder als vertraglich bekannte externe Referenz dokumentiert,
- keine stillen Umhaengungen zwischen Projekten,
- Status-/Ampel-Mapping folgt der dokumentierten Regel.

### 5.3 Taetigkeiten

Je Taetigkeit mindestens:

- stabile `sourceId`,
- `workPackageSourceId`,
- `title`,
- `status`,
- `trafficLight`,
- `lastChangedAt`.

Zusaetzlich gilt:

- `workPackageSourceId` ist fachlich korrekt,
- keine Dubletten,
- keine stillen Zuordnungswechsel,
- nur fuer das Wallboard erforderliche Informationen,
- keine personenbezogenen Leistungsbewertungen.

### 5.4 Urlaub / Abwesenheit

Geliefert werden ausschliesslich aggregierte Werte:

- `employeesOnLeaveThisWeek`,
- `employeesStartingLeaveNextWeek`,
- `observedAt`.

Verboten sind Namen, Personalnummern, E-Mail-Adressen, Urlaubs-/Krankheitsgruende, Diagnosen und Freitexte aus Abwesenheitsantraegen.

Die fachliche Definition von `employeesStartingLeaveNextWeek` wird vor Contract 1.0 gemeinsam festgelegt. Bis dahin muss die verwendete Berechnungsregel im Mapping-Dokument des externen Teams explizit beschrieben werden.

## 6. Fachliche Daten - PRTG

Geliefert werden mindestens:

- `ok`,
- `warning`,
- `critical`,
- `total`,
- `observedAt`.

Qualitaetsanforderungen:

- alle Zaehler sind nichtnegativ,
- `total` entspricht dem nachvollziehbaren Gesamtbestand des vereinbarten Sensorscopes,
- Zuordnung von PRTG-Status zu `ok` / `warning` / `critical` ist dokumentiert,
- pausierte, unbekannte oder nicht erreichbare Sensoren werden nicht still als `ok` gewertet,
- nicht sauber abbildbare Sonderzustaende werden transparent als `delayed`, `stale` oder `error` markiert.

Pilotziel fuer die Abfragefrequenz: etwa **2 Minuten**. Das ist ein Planungswert und wird vor produktiver Abnahme anhand Last, API-Limits und Betriebsanforderungen bestaetigt.

## 7. Fachliche Daten - Exchange Online

Geliefert werden ausschliesslich Mengenwerte:

- `total`,
- `today`,
- `yesterday`,
- `older`,
- `observedAt`.

Nicht geliefert werden duerfen Betreff, Mailbody, Absender, Empfaenger, Attachment-Namen/-Inhalte, Inhaltsklassifikationen oder KI-bewertete Dringlichkeit.

Die Zaehllogik muss dokumentieren:

- welches Postfach,
- welcher Ordner,
- welche Zeitzone fuer Tagesgrenzen,
- ob gelesene und ungelesene Nachrichten gemeinsam gezaehlt werden,
- Definition von `older`.

Fuer einen Vollsnapshot muessen die Altersklassen fachlich konsistent sein. Abweichungen sind als Datenqualitaetsfehler zu melden und nicht still zu korrigieren.

## 8. Datenqualitaetsziele

| Kriterium | Ziel fuer 0.1-Draft |
| --- | ---: |
| JSON syntaktisch gueltig | 100 % |
| Schema-valid bei als lieferfaehig markierten Payloads | 100 % |
| Pflichtfelder vorhanden | 100 % |
| `deliveryId` formal gueltig und eindeutig | 100 % |
| Source-IDs innerhalb einer Domaene eindeutig | 100 % |
| Referenzen Projekt -> AP -> Taetigkeit korrekt | 100 % bei Vollsnapshot |
| Zeitstempel formal gueltig | 100 % |
| negative Zaehler | 0 % zulassen |
| verbotene Mail-/Abwesenheitsdetails | 0 % |
| unmarkierte Teilfehler | 0 % |
| erfundene/geschaetzte Werte | 0 % |

Diese Werte sind Contract-Qualitaetsziele, keine Aussage ueber die urspruengliche Fachsystemqualitaet. Wenn eine Quelle unvollstaendig oder fehlerhaft ist, muss dies transparent gekennzeichnet werden.

## 9. Freshness- und Aktualitaetsanforderungen

Jede Quelle liefert `observedAt` und `sourceStatus.state` aus `ok`, `delayed`, `stale`, `error`.

Vorgeschlagene Pilot-SLOs zur Abstimmung:

| Domaene | Ziel-Aktualisierung | Stale-Pruefung ab |
| --- | ---: | ---: |
| Projekte/AP/Taetigkeiten | <= 10 Minuten | > 30 Minuten |
| Urlaub/Abwesenheit | <= 60 Minuten | > 4 Stunden |
| PRTG | ca. 2 Minuten | > 6 Minuten |
| Support-Postfach | <= 5 Minuten | > 15 Minuten |

Diese Schwellen sind **0.1-Draft-Planungswerte**. Ein `ok`-Status ist unzulaessig, wenn der Datenstand bereits oberhalb der vereinbarten Stale-Schwelle liegt.

## 10. Vollstaendigkeit und Teilfehler

### 10.1 Vollsnapshot

Bei `snapshotComplete = true` gilt:

- alle vertraglich erwarteten Domaenen sind vorhanden,
- `missingDomains` ist leer,
- fehlende Domaenen werden nicht als leere, angeblich aktuelle Datenmenge getarnt.

### 10.2 Teilsnapshot / Teilfehler

Bei `snapshotComplete = false` gilt:

- mindestens eine Domaene steht in `missingDomains`,
- die betroffene Quelle ist als `delayed`, `stale` oder `error` gekennzeichnet,
- fehlende Daten duerfen consumer-seitig nicht als Loeschung interpretiert werden,
- intakte Domaenen duerfen weiterhin geliefert werden.

## 11. Idempotenz und Wiederholung

Fuer Contract 0.1 gilt:

- ein technischer Retry derselben fachlichen Lieferung verwendet dieselbe `deliveryId`,
- veraenderte Nutzdaten erfordern eine neue `deliveryId`,
- derselbe `deliveryId` darf nicht mit unterschiedlichen Payload-Inhalten wiederverwendet werden,
- Retrys duerfen keine fachlichen Dubletten erzeugen.

Die spaetere Consumer-Implementierung wird diese Regeln in BSF-05 technisch pruefen bzw. erzwingen.

## 12. Mapping- und Provenienz-Nachweis

Das externe Team pflegt fuer jede Domaene ein versioniertes Mapping-Dokument mit mindestens:

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

## 13. Fehlerbehandlung

Agenten/Collector muessen mindestens unterscheiden koennen:

- Quelle nicht erreichbar,
- Authentisierung/Autorisierung fehlgeschlagen,
- API-Limit/Throttling,
- unerwartetes Quellformat,
- Mapping nicht moeglich,
- Schema-Validierung fehlgeschlagen,
- fachliche Konsistenzpruefung fehlgeschlagen,
- Daten zu alt.

Fehlertexte im Payload muessen kurz und nicht sensibel sein. Tokens, komplette Stacktraces, interne URLs mit Secrets oder personenbezogene Inhalte gehoeren nicht in den Payload.

## 14. Logging und Nachvollziehbarkeit

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

## 15. Sicherheitsanforderungen

- Least Privilege auf Quellsystemen,
- nach Moeglichkeit read-only Berechtigungen,
- keine produktiven Secrets im Repository,
- keine Secrets in JSON-Beispielen,
- keine Service-Role des Sysing Dashboards fuer die Datenerfassung,
- Transportauthentisierung wird spaeter separat festgelegt,
- Rotation und Revocation von Zugangsdaten muessen betrieblich moeglich sein,
- Agenten muessen ohne unkontrollierten Internetabfluss betrieben werden koennen, wenn Unternehmensdaten verarbeitet werden.

## 16. Producer-Preflight vor jeder Testlieferung

Vor jeder Lieferung prueft das externe Team mindestens:

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

## 17. Abnahmepaket des externen Teams

Fuer die gemeinsame C1/C2-Abnahme liefert das externe Team:

- mindestens einen realitaetsnahen, datenschutzkonformen Vollsnapshot,
- mindestens einen Teilfehler-Snapshot,
- mindestens einen absichtlich ungueltigen Payload fuer Negativtests,
- Mapping-Dokument je Quelle,
- dokumentierte Freshness-/Polling-Einstellungen,
- Ergebnis der eigenen Schema-Validierung,
- Liste bekannter Mapping-Luecken,
- Ansprechpartner/Owner fuer jede Datenquelle.

## 18. Abnahmekriterien

Die Lieferfaehigkeit gilt fuer den Draft als nachgewiesen, wenn:

- positive Beispiele gegen das Schema PASS sind,
- negative Beispiele reproduzierbar FAIL sind,
- keine verbotenen Inhalte enthalten sind,
- Voll-/Teilfehler semantisch korrekt behandelt werden,
- IDs stabil und Referenzen konsistent sind,
- Source-Status und Zeitstempel belastbar sind,
- Mapping und Aggregationen nachvollziehbar dokumentiert sind,
- keine generierten/erfundenen Werte auftreten,
- Retry-/Idempotenz-Regeln eingehalten werden,
- offene Punkte transparent dokumentiert sind.

## 19. Noch offene gemeinsame Entscheidungen

Vor Contract 1.0 sind mindestens zu klaeren:

- finale SharePoint-Feldliste und Statusmapping,
- genaue Definition der Urlaubskennzahl fuer die Folgewoche,
- PRTG-Scope und Behandlung von paused/unknown/down,
- Exchange-Ordner, Zeitzone und Altersgrenzen,
- finale Freshness-SLOs,
- Payload-Groesse und Batching,
- produktiver Transport,
- Authentisierung zwischen den Teams,
- Acknowledgement-/Retry-Protokoll,
- Delta-Semantik,
- Betriebsmonitoring und Alarmierung.

## 20. Versionierungsregel

Dieses Dokument ist Teil des Contract-Pakets `0.1.0-draft` und wird gemeinsam mit diesem versioniert.

- redaktionelle Korrektur ohne Vertragswirkung -> Patch,
- neue optionale Felder oder kompatible Anforderungen -> Minor,
- inkompatible Vertragsaenderung nach 1.0 -> Major,
- publizierte Contract-Versionen werden nicht still ueberschrieben,
- jede Aenderung wird im Contract-`CHANGELOG.md` dokumentiert.

Das uebergeordnete TDF-Managementdokument besitzt einen eigenen Versionszyklus. Aktueller Managementstand ist `0.7.0-draft`; die Contract-Version bleibt unabhaengig `0.1.0-draft`.

## 21. Nicht-Auswirkungsregel

INT-CONTRACT-01 bleibt eine parallele Vertragsvorbereitung. Dieser Draft erzeugt insbesondere **keine**:

- DB-Migration,
- RLS-/Grant-/Function-Aenderung,
- Runtime-Schnittstelle,
- neue Rolle oder Session-Ausnahme,
- Lovable-Runtime-Abhaengigkeit,
- produktive Secret-Verwendung,
- Aenderung an BSF-03 oder der bestehenden Sprintreihenfolge.

## 22. TDF-Abschlusscheck 0.1.0-draft

| Pruefpunkt | Status |
| --- | --- |
| Zweck/Scope klar | PASS |
| Verantwortungsgrenze klar | PASS |
| Datenbereiche beschrieben | PASS |
| Qualitaetsziele messbar | PASS |
| Datenschutzminimierung | PASS mit offenen Fachdefinitionen |
| Security-Leitplanken | PASS mit spaeterer Transportentscheidung |
| Versionierung getrennt/nachvollziehbar | PASS |
| BSF-03/04/05 nicht vorweggenommen | PASS |
| Produktive Implementierung freigegeben | NEIN |

**Empfohlener naechster Schritt:** Contract-Paket intern maschinenvalidieren und anschliessend dem externen Datenteam fuer C2/Feldreview uebergeben.

_AI-Transparenz: Inhalt und Struktur wurden mit ChatGPT/OpenAI unter fachlicher Steuerung durch Bernd Marnau erstellt. Verwendete Visualisierungen sind KI-generierte Konzeptdarstellungen und keine Produktabbildungen._
