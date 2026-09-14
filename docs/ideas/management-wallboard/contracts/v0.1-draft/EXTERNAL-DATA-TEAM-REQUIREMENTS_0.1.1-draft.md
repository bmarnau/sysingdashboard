# INT-CONTRACT-01 - Anforderungen an das externe Datenteam

Status: **DRAFT / CONTRACT REQUIREMENTS**  
Dokumentversion: **0.1.1-draft**  
JSON-Schema/Contract-Paket: **0.1.0-draft (unveraendert)**  
Bezug: **TDF Management-Wallboard 0.7.1-draft**  
Datum: **2026-09-11**  
Issue: #125  
Parent-Idee: #123  
Draft PR: #124

## 1. Zweck

Dieses Dokument beschreibt, welche Daten das externe Datenteam liefern soll, wie die liefernden Agenten/Collector arbeiten sollen und welche messbare Datenqualitaet erwartet wird.

Der Patch `0.1.1-draft` entstand im TDF-Abschlusscheck. Er korrigiert Accessibility-/Dokumentmetadaten und aendert **nicht** das JSON-Schema oder die Contract-Semantik `0.1.0-draft`.

Die aktive BSF-Sprintreihenfolge bleibt unveraendert. Dieses Dokument ist keine Freigabe fuer produktive Runtime-, DB-, Authentisierungs- oder Transportimplementierung.

## 2. Verantwortungsgrenze

### Externes Datenteam

Verantwortlich fuer:

- read-only Zugriff auf freigegebene SharePoint-, PRTG- und Exchange-Online-Quellen,
- Beschaffung der vereinbarten Daten,
- deterministische Normalisierung und Aggregation,
- stabile Source-IDs und konsistente Referenzen,
- korrekte Zeitstempel, Source-Status und Freshness,
- dokumentiertes Mapping und Provenienz,
- technische und fachliche Vorvalidierung,
- Retry-/Idempotenzverhalten,
- nachvollziehbare Fehlerkennzeichnung,
- Testdaten und Abnahmenachweise,
- Betrieb und Monitoring der eigenen Collector-Komponenten.

### Sysing Dashboard

Verantwortlich fuer:

- Definition und Versionierung des Contract-Pakets,
- Consumer-seitige Schema-/Scope-Validierung,
- spaeteren Provider Adapter,
- spaetere Persistenz/Projektion,
- RBAC/RLS/Least Privilege,
- Freshness-/Teilfehlerbehandlung,
- Management-Wallboard-Darstellung,
- spaeteres Runtime-Monitoring und Audit.

Das externe Team benoetigt keine Kenntnis interner Supabase-/Azure-SQL-Tabellen oder interner Datenbank-IDs.

## 3. Agenten-/Collector-Anforderung

Der Begriff `Agent` bezeichnet im Draft primaer einen **deterministischen Read-Collector**.

### 3.1 Erlaubt

Ein Agent/Collector darf:

- Daten aus freigegebenen Quellen lesen,
- definierte Felder normalisieren,
- Werte nach dokumentierten Regeln aggregieren,
- Statuswerte nach versionierten Mapping-Regeln abbilden,
- Zeitstempel und Source-Status erzeugen,
- Payloads gegen das JSON Schema validieren,
- transiente Fehler kontrolliert wiederholen,
- eigene Betriebs-/Validierungsmetriken erzeugen.

### 3.2 Nicht erlaubt

Ein Agent/Collector darf nicht:

- fehlende Werte erfinden oder schaetzen,
- Inhalte halluzinieren,
- Statuswerte ohne dokumentierte Mapping-Regel ableiten,
- produktive Secrets in Payloads oder Logs schreiben,
- unnoetige personenbezogene Inhalte uebermitteln,
- Mailbody, Betreff, Sender oder Empfaenger liefern,
- Urlaubs-/Krankheitsgruende, Diagnosen oder Namen liefern,
- interne Sysing-Datenbank-IDs voraussetzen,
- Teilfehler als scheinbar gueltige leere Daten tarnen.

### 3.3 Generative KI

Fuer Contract `0.1.0-draft` ist kein LLM erforderlich. Falls intern generative KI eingesetzt wird, muss jeder gelieferte Wert weiterhin auf reale Quelldaten oder eine dokumentierte deterministische Aggregationsregel zurueckfuehrbar sein. KI darf fehlende Daten nicht ergaenzen.

## 4. Gemeinsamer JSON-Envelope

Jede Lieferung entspricht dem Contract `0.1.0-draft` und enthaelt mindestens:

- `schemaVersion = 0.1.0-draft`,
- `deliveryId`,
- `deliveryType = snapshot`,
- `generatedAt`,
- `observedAt`,
- `producer`,
- `scope.systemhouseId`,
- `completeness.snapshotComplete`,
- `completeness.missingDomains`,
- `sourceStatus`,
- `data`.

Zeitangaben verwenden RFC 3339 / ISO 8601 mit explizitem Offset, bevorzugt UTC (`Z`).

## 5. SharePoint-Daten

### 5.1 Projekte

Je Projekt mindestens:

- stabile `sourceId`,
- `title`,
- `status`,
- `trafficLight`,
- `lastChangedAt`.

Anforderungen: eindeutige/stabile IDs, nichtleere Titel, dokumentiertes Status-/Ampel-Mapping, korrekter `lastChangedAt`, keine Dubletten.

### 5.2 Arbeitspakete

Je Arbeitspaket mindestens:

- stabile `sourceId`,
- `projectSourceId`,
- `title`,
- `status`,
- `trafficLight`,
- `lastChangedAt`.

`projectSourceId` muss fachlich korrekt sein. Stille Umhaengungen sind unzulaessig.

### 5.3 Taetigkeiten

Je Taetigkeit mindestens:

- stabile `sourceId`,
- `workPackageSourceId`,
- `title`,
- `status`,
- `trafficLight`,
- `lastChangedAt`.

`workPackageSourceId` muss fachlich korrekt sein. Keine Dubletten, keine stillen Zuordnungswechsel, keine personenbezogenen Leistungsbewertungen.

### 5.4 Urlaub / Abwesenheit

Ausschliesslich aggregiert:

- `employeesOnLeaveThisWeek`,
- `employeesStartingLeaveNextWeek`,
- `observedAt`.

Verboten: Namen, Personalnummern, E-Mail-Adressen, Urlaubs-/Krankheitsgruende, Diagnosen und Freitexte. Die genaue Definition von `employeesStartingLeaveNextWeek` wird vor Contract 1.0 gemeinsam festgelegt und bis dahin im Mapping-Dokument beschrieben.

## 6. PRTG-Infrastruktur

Mindestens:

- `ok`,
- `warning`,
- `critical`,
- `total`,
- `observedAt`.

Anforderungen:

- keine negativen Zaehler,
- `total` entspricht dem vereinbarten Sensorscope,
- PRTG-Statusmapping ist dokumentiert,
- paused/unknown/unreachable werden nicht still als `ok` gezaehlt,
- nicht sauber abbildbare Sonderzustaende werden transparent als `delayed`, `stale` oder `error` markiert.

Pilotziel Abfragefrequenz: etwa **2 Minuten**, vor Produktivabnahme zu bestaetigen.

## 7. Exchange Online - Support-Postfach

Ausschliesslich Mengenwerte:

- `total`,
- `today`,
- `yesterday`,
- `older`,
- `observedAt`.

Nicht erlaubt: Betreff, Mailbody, Absender, Empfaenger, Attachment-Namen/-Inhalte, Inhaltsklassifikationen oder KI-bewertete Dringlichkeit.

Zu dokumentieren sind Postfach, Ordner, Zeitzone der Tagesgrenzen, Umgang mit gelesen/ungelesen und Definition von `older`.

## 8. Datenqualitaetsziele

| Kriterium                                      |         Ziel 0.1-Draft |
| ---------------------------------------------- | ---------------------: |
| JSON syntaktisch gueltig                       |                  100 % |
| Schema-valid bei lieferfaehigen Payloads       |                  100 % |
| Pflichtfelder vorhanden                        |                  100 % |
| `deliveryId` formal gueltig/eindeutig          |                  100 % |
| Source-IDs innerhalb einer Domaene eindeutig   |                  100 % |
| Projekt -> AP -> Taetigkeit Referenzen korrekt | 100 % bei Vollsnapshot |
| Zeitstempel formal gueltig                     |                  100 % |
| negative Zaehler                               |                    0 % |
| verbotene Mail-/Abwesenheitsdetails            |                    0 % |
| unmarkierte Teilfehler                         |                    0 % |
| erfundene/geschaetzte Werte                    |                    0 % |

Diese Ziele bewerten die Lieferung, nicht die Qualitaet des urspruenglichen Fachsystems. Quellmaengel muessen transparent gekennzeichnet werden.

## 9. Freshness

| Domaene                  | Ziel-Aktualisierung | Stale-Pruefung ab |
| ------------------------ | ------------------: | ----------------: |
| Projekte/AP/Taetigkeiten |       <= 10 Minuten |      > 30 Minuten |
| Urlaub/Abwesenheit       |       <= 60 Minuten |       > 4 Stunden |
| PRTG                     |       ca. 2 Minuten |       > 6 Minuten |
| Support-Postfach         |        <= 5 Minuten |      > 15 Minuten |

Diese Werte sind `0.1-draft`-Planungswerte und werden vor Contract 1.0 gemeinsam bestaetigt. Ein `ok`-Status ist unzulaessig, wenn der Datenstand bereits oberhalb der vereinbarten Stale-Schwelle liegt.

## 10. Vollstaendigkeit und Teilfehler

### Vollsnapshot

Bei `snapshotComplete = true`:

- alle erwarteten Domaenen vorhanden,
- `missingDomains` leer,
- keine fehlenden Domaenen als scheinbar leere aktuelle Daten tarnen.

### Teilsnapshot

Bei `snapshotComplete = false`:

- mindestens eine Domaene in `missingDomains`,
- betroffene Quelle als `delayed`, `stale` oder `error`,
- fehlende Daten sind consumer-seitig keine Loeschung,
- intakte Domaenen duerfen weiter geliefert werden.

## 11. Retry und Idempotenz

- technischer Retry derselben fachlichen Lieferung verwendet dieselbe `deliveryId`,
- geaenderte Nutzdaten erfordern eine neue `deliveryId`,
- dieselbe `deliveryId` darf nicht mit unterschiedlichem Payload wiederverwendet werden,
- Retrys duerfen keine fachlichen Dubletten erzeugen.

## 12. Mapping und Provenienz

Je Domaene wird ein versioniertes Mapping-Dokument gepflegt mit mindestens:

- Quellsystem,
- Quellobjekt/-liste/-endpoint,
- Quellfeld,
- Zielfeld,
- Transformation,
- Status-/Ampelregel,
- Aggregationsregel,
- Zeitzone,
- bekannte Ausnahmen,
- Owner,
- Versionsstand.

Jeder gelieferte Wert muss auf eine reale Quelle oder eine dokumentierte deterministische Aggregation zurueckfuehrbar sein.

## 13. Fehlerbehandlung

Mindestens zu unterscheiden:

- Quelle nicht erreichbar,
- Authentisierung/Autorisierung fehlgeschlagen,
- API-Limit/Throttling,
- unerwartetes Quellformat,
- Mapping nicht moeglich,
- Schema-Validierung fehlgeschlagen,
- fachliche Konsistenzpruefung fehlgeschlagen,
- Daten zu alt.

Fehlertexte im Payload muessen kurz und nicht sensibel sein. Tokens, Stacktraces, secret-bearing URLs oder personenbezogene Inhalte gehoeren nicht in den Payload.

## 14. Logging und Security

Intern nachvollziehbar sein muessen Start/Ende eines Laufs, Quelle, `deliveryId`, Schema-Version, Validierungsergebnis, Objektanzahl je Domaene, Source-Status und Fehlerkategorie.

Security-Leitplanken:

- Least Privilege,
- moeglichst read-only Quellberechtigungen,
- keine produktiven Secrets im Repository oder in Beispielen,
- keine Sysing-Service-Role zur Datenerfassung,
- Rotation/Revocation muss moeglich sein,
- kein unkontrollierter Internetabfluss bei Unternehmensdaten.

## 15. Producer-Preflight vor jeder Testlieferung

1. JSON parsebar.
2. `schemaVersion` korrekt.
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

## 16. Abnahmepaket

Das externe Team liefert fuer C1/C2:

- realitaetsnahen datenschutzkonformen Vollsnapshot,
- Teilfehler-Snapshot,
- absichtlich ungueltigen Payload fuer Negativtests,
- Mapping-Dokument je Quelle,
- Freshness-/Polling-Einstellungen,
- Ergebnis der eigenen Schema-Validierung,
- bekannte Mapping-Luecken,
- Owner je Datenquelle.

## 17. Reale C1-Validierung

Das Contract-Paket `0.1.0-draft` wurde im TDF-Abschlusscheck real gegen das Schema geprueft:

| Test                                  | Ergebnis               |
| ------------------------------------- | ---------------------- |
| Schema Draft 2020-12 strukturell      | PASS                   |
| `valid-full-snapshot.json`            | PASS                   |
| `valid-partial-source-error.json`     | PASS                   |
| `invalid-missing-schema-version.json` | erwartungsgemaess FAIL |

Damit ist die technische Grundtestbarkeit des Drafts nachgewiesen.

## 18. Offene Entscheidungen vor Contract 1.0

- finales SharePoint-Feld-/Statusmapping,
- Urlaubsdefinition Folgewoche,
- PRTG-Scope/Sonderzustaende,
- Exchange-Zaehllogik,
- finale Freshness-SLOs,
- Payload-Groesse/Batching,
- produktiver Transport/Authentisierung,
- Acknowledgement/Retry,
- Delta-Semantik,
- Betriebsmonitoring/Alarmierung,
- Persistenz-/Konfliktstrategie.

## 19. Versionierung

Die Lebenszyklen bleiben getrennt:

- Management-TDF: `0.7.1-draft`,
- Producer-Anforderung: `0.1.1-draft`,
- JSON Schema/Contract Package: `0.1.0-draft`.

`0.1.1-draft` ist ein Dokumentpatch wegen Accessibility-/TDF-Qualitaetskorrekturen. Es ist **keine** fachliche Schema-Version. Fachliche Vertragsaenderungen folgen der Contract-Evolution und werden im `CHANGELOG.md` dokumentiert.

## 20. TDF-Abschlusscheck 0.1.1-draft

| Pruefpunkt                             | Status                                                  |
| -------------------------------------- | ------------------------------------------------------- |
| Zweck / Scope                          | PASS                                                    |
| Verantwortungsgrenze                   | PASS                                                    |
| Datenbereiche                          | PASS                                                    |
| messbare Qualitaetsziele               | PASS                                                    |
| Datenschutzminimierung                 | PASS mit offenen Fachdefinitionen                       |
| Security-Leitplanken                   | PASS mit spaeter Transportentscheidung                  |
| Versionierung getrennt/nachvollziehbar | PASS                                                    |
| BSF-03/04/05 nicht vorweggenommen      | PASS                                                    |
| Machine-readable Contract Validation   | PASS                                                    |
| DOCX Accessibility                     | PASS - 0 High / 0 Medium / 0 Low                        |
| PDF/Layout                             | PASS - 10 Seiten, keine leeren Seiten/Clipping/Overlaps |
| produktive Implementierung freigegeben | NEIN                                                    |

**TDF-Gesamtergebnis:** PASS MIT BEWUSST OFFENEN C2-/TRANSPORTENTSCHEIDUNGEN.

Naechster regulärer Schritt: C2 mit dem externen Datenteam - reale Felder, Mapping, Freshness und offene Fachdefinitionen abstimmen.

Detaillierter Nachweis: `../../TDF-CHECK-2026-09-11.md`.

_AI-Transparenz: Inhalt, Struktur und Visualisierung wurden mit ChatGPT/OpenAI unter fachlicher Steuerung durch Bernd Marnau erstellt. KI-generierte Visualisierungen sind Konzeptbilder und keine Produktabbildungen._
