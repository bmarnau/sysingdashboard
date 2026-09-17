# Sysing Dashboard — Goldener Datensatz

Stand: 2026-09-15  
Status: **VERBINDLICHE PLANUNG / QUERSCHNITTSVERTRAG**  
Issue: #142  
Ausgangspunkt: `docs/examples/kiosk-demo-dataset-v1.json`

## 1. Zweck

Der **Goldene Datensatz (Golden Dataset)** ist die versionierte, vollständig synthetische und deterministische fachliche Referenzbasis des Sysing Dashboards.

Er dient nicht nur zur Demonstration, sondern als stabiler Prüf- und Abnahmevertrag für Fachlogik, Aggregationen, Import-/Exportpfade, Reporting und spätere Providerwechsel.

Der Goldene Datensatz beantwortet reproduzierbar:

- welche fachlichen Eingabedaten gelten,
- welche Identitäten und Beziehungen gelten,
- welche Missing-/Unknown-/Legacy-Zustände gelten,
- welche fachlichen Ergebnisse daraus exakt entstehen müssen.

Er ist **keine produktive Datenquelle**.

## 2. Abgrenzung: Golden Dataset, Demo und Produktivdaten

Verbindliche Trennung:

```text
Golden Dataset
  -> fachliche Referenzobjekte
  -> Expected Results
  -> Test-/Abnahmefixtures
  -> Demo-/Schulungsableitungen

Produktivdaten
  -> Supabase bzw. spätere Provider
  -> niemals Bestandteil des Golden Dataset
```

Der bestehende Kiosk-Demodatensatz ist ein wertvoller **Ausgangskandidat**, aber nicht automatisch der vollständige Goldene Datensatz.

Für KIOSK-01 bleibt `docs/examples/kiosk-demo-dataset-v1.json` unverändert der dort freigegebene Demo-/Referenzvertrag. GDS-01 erweitert diesen Gedanken ab BSF-03A um kanonische Fachobjekte und explizite Expected Results. KIOSK-01 wird dadurch nicht rückwirkend erweitert oder blockiert.

## 3. Verbindliche Grundregeln

1. **Nur synthetische Daten.** Keine produktiven Kunden-, Personen-, E-Mail-, Host-, IP-, Token-, Secret- oder sonstigen Realidentitäten.
2. **Stabile IDs und Keys.** Referenzobjekte erhalten feste synthetische Identitäten; Anzeigenamen sind nie Identität.
3. **Feste Zeitbasis.** Kein `now()`, keine Zufallszeit, keine vom Ausführungstag abhängigen Werte. Referenzzeit V1: `2026-09-14T00:00:00Z`.
4. **Versionierter Vertrag.** V1 verwendet `schemaVersion = sysing.golden.v1` und `datasetVersion = 1.0.0`.
5. **Deterministisch.** Keine Zufallswerte, keine stillen Defaults und keine vom Provider abhängige Fachsemantik.
6. **Providerneutral.** Supabase, spätere Azure-SQL-Adapter oder andere Provider müssen dieselben fachlichen Ergebnisse liefern können.
7. **Expected Results sind unabhängig.** Erwartungswerte werden fachlich explizit festgelegt und nicht durch genau die Produktionsimplementierung erzeugt, die damit geprüft wird.
8. **Keine automatische Snapshot-Freigabe.** Ein Testfehler darf Expected Results niemals automatisch neu schreiben.
9. **Unknown bleibt Unknown.** `unknown`, `not provided`, `none`, `inactive` und Legacy-Zustände bleiben unterscheidbar und werden nicht zu `0`, `false`, `ok` oder einem anderen positiven Ersatzwert normalisiert.
10. **Negative Security-Fixtures getrennt.** Cross-Systemhouse-, Cross-Customer-, IDOR-/BOLA- und ungültige Payload-Fälle liegen getrennt von den positiven Referenzwerten.
11. **Änderungen sind reviewpflichtig.** Jede fachlich wirksame Golden-Dataset-Änderung nennt Grund, Version und betroffene Expected Results.
12. **Kein Runtime-Sonderprovider.** Der Golden Dataset ist Test-/Abnahmegrundlage und begründet keine zweite produktive Datenhaltung.

## 4. Zielstruktur V1

```text
docs/examples/golden-dataset/v1/
  manifest.json
  systemhouse.json
  customers.json
  projects.json
  work-packages.json
  activities.json
  reference-data.json
  kiosk.json
  negative/
    cross-systemhouse.json
    cross-customer.json
    invalid-relations.json
  expected/
    project-controlling.json
    kiosk-summary.json
```

Spätere Sprints ergänzen ausschließlich additive, fachlich begründete Expected-Result-Dateien, zum Beispiel:

```text
expected/performance-statement.json
expected/canonical-import.json
expected/reporting.json
```

Die V1-Struktur wird nicht für jeden Sprint kopiert. Alle Sprints referenzieren dieselbe Golden-Dataset-Version oder erhöhen sie kontrolliert.

## 5. Golden Dataset V1 — fachlicher Kern

### 5.1 Positive Referenzobjekte

V1 enthält genau einen positiven Systemhouse-Scope und zwei Kunden:

```text
systemhouse: golden-systemhouse-01
customer A: golden-customer-a
customer B: golden-customer-b
```

Drei Projekte:

```text
golden-project-a1 -> customer A
golden-project-a2 -> customer A
golden-project-b1 -> customer B
```

Fünf Arbeitspakete decken die Kategorie-Semantik ab:

```text
golden-wp-a1 -> aktive Kategorie regelbetrieb
golden-wp-a2 -> explizit keine Kategorie
golden-wp-a3 -> bekannte, aber inaktive Kategorie legacy-alt
golden-wp-a4 -> Legacy-Fall: Kategorie noch nicht beobachtet/publiziert
golden-wp-b1 -> expliziter unbekannter Key unknown-golden-category
```

Reference Data enthält mindestens:

```text
regelbetrieb -> aktiv
stoerung -> aktiv
legacy-alt -> inaktiv
```

`unknown-golden-category` ist absichtlich **nicht** im Reference-Data-Katalog vorhanden.

### 5.2 Tätigkeiten und feste Controlling-Werte

Die positive V1-Referenz enthält acht Tätigkeiten im Zeitraum 2026-09-01 bis 2026-09-05:

```text
golden-act-01 | 2026-09-01 | Customer A | Project A1 | WP A1 | 4.0 h | billable | offen
golden-act-02 | 2026-09-01 | Customer A | Project A1 | WP A1 | 2.0 h | non-billable | nicht_abrechenbar
golden-act-03 | 2026-09-02 | Customer A | Project A1 | WP A2 | 3.0 h | billable | offen
golden-act-04 | 2026-09-03 | Customer A | Project A2 | WP A3 | 1.0 h | non-billable | nicht_abrechenbar
golden-act-05 | 2026-09-01 | Customer B | Project B1 | WP B1 | 5.0 h | billable | offen
golden-act-06 | 2026-09-04 | Customer B | Project B1 | WP B1 | 2.0 h | non-billable | nicht_abrechenbar
golden-act-07 | 2026-09-04 | Customer B | Project B1 | WP B1 | 3.0 h | billable | abgerechnet
golden-act-08 | 2026-09-05 | Customer A | Project A2 | WP A4 | 5.0 h | billable | offen
```

Verbindliche Expected Summary über alle acht Zeilen:

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

Verbindlicher Tagestrend:

```text
2026-09-01 -> total 11.0 / billable 9.0 / non-billable 2.0
2026-09-02 -> total 3.0 / billable 3.0 / non-billable 0.0
2026-09-03 -> total 1.0 / billable 0.0 / non-billable 1.0
2026-09-04 -> total 5.0 / billable 3.0 / non-billable 2.0
2026-09-05 -> total 5.0 / billable 5.0 / non-billable 0.0
```

Diese Zahlen sind Teil des Fachvertrags und dürfen nicht aus Convenience-Gründen an eine Implementierung angepasst werden.

### 5.3 Pflichtfälle der Expected Results

`expected/project-controlling.json` enthält mindestens:

- Gesamtsicht über beide Kunden,
- Customer-A-only,
- Customer-B-only,
- billable-only,
- non-billable-only,
- Filter auf aktive Kategorie `regelbetrieb`,
- explizit keine Kategorie,
- inaktive Kategorie,
- unbekannte Kategorie,
- Legacy/not-observed,
- Filter auf genau ein Projekt,
- Filter auf genau ein Arbeitspaket,
- Tagestrend,
- Drill-down Kunde -> Projekt -> AP -> Tätigkeit.

## 6. Kiosk-Bezug

KIOSK-01 bleibt unverändert auf seinem freigegebenen Kiosk-Demo-Datensatz.

Ab GDS-01 gilt:

- `kiosk.json` im Golden Dataset beschreibt die aus der Golden-Referenz ableitbare Kiosk-Sicht.
- KIOSK-02 prüft vergleichbare interne Kennzahlen gegen dieselben Golden Expected Results.
- Ein interner Fehler darf niemals durch Golden-/Demo-Werte kaschiert werden.
- Demo- und Produktiv-/Internal-Provider dürfen unterschiedliche Datenquellen haben, aber keine unterschiedliche Definition derselben Kennzahl.

Die bisherigen KIOSK-01-Werte wie `8 aktive Projekte`, `24 offene Arbeitspakete` oder `126.5 Stunden` werden **nicht rückwirkend** als BSF-03A-Golden-Werte deklariert. Sie bleiben KIOSK-01-Kompatibilitätsfixture, bis KIOSK-02 eine kontrollierte Ableitung bzw. Vergleichsregel festlegt.

## 7. Einordnung in die verbindliche Sprintfolge

GDS-01 ist **kein zusätzlicher Hauptsprint** und verändert die Reihenfolge nicht.

### KIOSK-01

- bestehender Demo-Datensatz bleibt gültig,
- wird als Ausgangskandidat dokumentiert,
- keine Scope-Erweiterung der laufenden Finalabnahme.

### BSF-03A

- erste eigentliche Golden-Dataset-Version wird umgesetzt,
- Controlling-Aggregation, Filter, Trend und Drill-down werden gegen `expected/project-controlling.json` geprüft,
- der BSF-03A-Abschluss nennt die verwendete Golden-Dataset-Version.

### KIOSK-02

- Demo- und interner Provider verwenden für vergleichbare Kennzahlen dieselbe fachliche Referenz,
- kein zweiter KPI-/Stundenvertrag.

### BSF-03B

- ergänzt `expected/performance-statement.json`,
- Finalisierung, Review-Overlay und Kundenausgabe werden gegen synthetische feste Referenzfälle geprüft.

### BSF-05A

- Canonical Import Model muss den Golden Dataset reproduzierbar normalisieren und semantisch erhalten,
- Provider-/Importpfade dürfen die Expected Results nicht verändern.

### BSF-09

- Reporting-Ausgaben und Summen werden gegen Golden Expected Results geprüft.

### BSF-FINAL-INTERNAL

- Golden-Regression-Suite ist ein formales internes Abnahme-Gate.

### Spätere Providerwechsel

Supabase und spätere Azure-SQL-/andere Adapter werden mit derselben Referenz geprüft:

```text
Golden Dataset
    -> Supabase Adapter -----+
                             +-> identische Fachresultate
    -> Azure SQL Adapter ----+
```

## 8. Versions- und Änderungsregeln

### Schema-Version

Eine inkompatible Strukturänderung erhöht die Schema-Major-Version, zum Beispiel `sysing.golden.v2`.

### Dataset-Version

Eine fachlich beabsichtigte Änderung an Referenzobjekten oder Expected Results erhöht `datasetVersion` nach SemVer.

Beispiele:

- neue additive Fixture ohne Änderung bestehender Ergebnisse: Minor,
- Korrektur eines eindeutig fehlerhaften Fixture-Werts ohne Vertragsänderung: Patch,
- Änderung bestehender fachlicher Expected Results: mindestens Minor und expliziter Reviewgrund,
- inkompatible Struktur: neue Schema-Major-Version.

Jede Änderung dokumentiert:

- Anlass,
- alte/neue Dataset-Version,
- betroffene Dateien,
- betroffene Expected Results,
- betroffene Sprints/Tests.

## 9. Lovable-Regeln

Lovable darf den Golden Dataset **verwenden und prüfen**, aber nicht selbständig fachliche Expected Results umdefinieren.

Für BSF-03A gilt:

- L1 prüft vor DB-Änderungen, dass Golden Dataset und Expected Results im Repository vorhanden und valide sind.
- L1 darf Golden-Fixtures nur in einer eindeutig kontrollierten Test-/Staging-Situation verwenden; keine Golden-Testdaten ungefragt in Produktion schreiben.
- L2 verwendet Golden-Fälle für UI-/Preview-Zustände, ohne fachliche Werte umzudeuten.
- L3 prüft, dass Golden-Regression und vollständige CI PASS sind.
- Ein Golden-Testfehler führt zu `BLOCKED` oder zu einer fachlich begründeten Codekorrektur, nicht zu automatischer Expected-Result-Anpassung.

Die Erstellung und Pflege des Golden Dataset selbst benötigt keine Lovable-Credits.

## 10. Security und Datenschutz

Der Golden Dataset darf enthalten:

- ausschließlich fiktive Firmen-/Kundennamen,
- synthetische IDs,
- synthetische Fachtexte,
- feste Referenzzeitpunkte,
- künstliche Stunden-/Status-/Kategorieverteilungen.

Er darf nicht enthalten:

- echte Kundennamen,
- echte Personennamen oder E-Mail-Adressen,
- produktive UUIDs oder Tenant-/Systemhouse-Zuordnungen,
- produktive Hostnamen/IPs,
- Zugangsdaten, Tokens, Schlüssel oder Cookies,
- Mailinhalte,
- Gesundheits-/Abwesenheitsgründe,
- andere personenbezogene Produktivinformationen.

## 11. Definition of Done für GDS-01 V1

GDS-01 V1 ist erst erfüllt, wenn:

- Strategie und Implementation Plan im Repository vorliegen,
- Golden V1 mit Manifest und festen Referenzobjekten existiert,
- Validator Schema/Version/Referenzen/Expected Results prüft,
- Golden-Check in CI läuft,
- BSF-03A-Expected-Results unabhängig verifiziert sind,
- keine produktiven Daten oder Secrets enthalten sind,
- Kiosk-Bezug ohne zweite Fachsemantik dokumentiert ist,
- BSF-03A den Golden-Vertrag in Tests verwendet,
- technische Dokumentation und Prüfbericht die verwendete Dataset-Version nennen,
- vollständige Required Checks PASS sind.

## 12. Governance

- GitHub ist Source of Truth.
- GDS-01 / #142 ist der Trackinganker.
- Der Goldene Datensatz wird nicht als eigener zusätzlicher Hauptsprint zwischen KIOSK-01 und BSF-03A eingeschoben.
- KIOSK-01 bleibt bis zur korrekten Supabase-/Post-Migration-Abnahme formal separat.
- Keine produktive DB-Änderung allein zur Einrichtung des Golden Dataset.
- Kein Merge/Deploy ohne die jeweilige Sprint-Governance.
