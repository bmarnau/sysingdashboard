# Sysing Dashboard — Operative Sprintplanung MVP → BSF → Integration

Stand: 2026-08-25  
Status: operative Planung auf Basis von `docs/ROADMAP-MVP-BSF.md`

## 1. Zweck

Dieses Dokument übersetzt die verbindliche Roadmap in eine konkrete Sprintfolge. Die Roadmap bleibt die fachliche Quelle; diese Planung dient Durchführung, Aufwandseinschätzung und späterer Wiederaufnahme.

Für den täglichen Arbeitsfokus ist zusätzlich `docs/BSF-CURRENT-PRIORITIES.md` maßgeblich. Diese kompakte Liste priorisiert den unmittelbaren Nutzwert, ohne bereits etablierte strategische Sprintnummern rückwirkend umzunummerieren.

Arbeitsregel je Sprint:

`Analysieren → minimal umsetzen → testen → dokumentieren → Abschlussbericht → manuelle/inhaltliche Abnahme → nächster Prompt`

GitHub ist Source of Truth. Lovable wird gezielt für UI, Preview, plattformspezifische Runtime-Prüfung und dort sinnvollere Implementierungen eingesetzt.

## 2. Lovable-Tagesbudget

Nutzerseitig bestätigte operative Planungsgröße: **5 neue Lovable-Credits pro Tag** (Stand 2026-08-25, tarifabhängig).

Planungsprinzip:

- UI-/Preview-/Layout-Aufgaben bevorzugt mit Lovable,
- klar abgegrenzte Lovable-spezifische Implementierungen gezielt bündeln,
- bei Lovable-relevanten Tagen bevorzugt 3–4 Credits produktiv und 1–2 Credits als Korrektur-/Abnahmereserve einplanen,
- keine künstlichen Änderungen oder Build-Schleifen nur zum Credit-Verbrauch,
- ungenutzte Credits rechtfertigen keine unnötige technische Änderung,
- Architektur-, Datenmodell-, Auth-, RBAC- und RLS-Entscheidungen werden nicht an Lovable delegiert.

### 2.1 Operative Priorität ab 25.08.2026

Nach MVP-Abschluss und Aktivierung des GitHub-Rulesets `main-release-governance` wird die BSF-Arbeit in folgender Reihenfolge durchgeführt:

1. BSF-01 — Planungs-/Architekturbaseline,
2. BSF-02 — Kundenmodell + minimal notwendige gemeinsame Daten-/Read-Basis,
3. BSF-03 — Kundenverantwortung / Kundensicht,
4. **BSF-03A — Projektmanager-Leistungssicht / Controlling**,
5. **BSF-03B — Leistungsnachweis Teamlead V1**,
6. **BSF-DOC-01 — Dokumentationskonsolidierung**,
7. **BSF-DOC-02 — bestehendes SYSING-001 im TDF-Format fortschreiben**,
8. **BSF-DOC-03 — SYSING-001 read-only aus dem Board erreichbar**,
9. anschließend Fortsetzung der bestehenden strategischen Folge ab BSF-04.

Die neuen Suffix-Sprints vermeiden eine rückwirkende Umnummerierung bereits dokumentierter BSF-Schritte. Der bisherige fachliche Inhalt von BSF-08 wird mit Issue #71 operativ nach BSF-03A/03B vorgezogen; BSF-08 bleibt nur als historische Planungsreferenz bestehen und erzeugt keinen zweiten parallelen Leistungsnachweis-Scope.

Ab BSF gilt zusätzlich: Ein Fachpunkt ist erst vollständig abgeschlossen, wenn relevante kontextsensitive Hilfe, Benutzerhandbuch, technische Dokumentation und `docs/ENTWICKLUNGSTAGEBUCH.md` mit dem realen Produktstand synchron sind.

## 3. Operative Sprintfolge

### 09C-FINAL — F-11 abschließen

- Schwerpunkt: letzter Systemstatus-Retest, Role-Preview-N/A, Doku-Konsolidierung.
- Arbeits-Prompts: 1–2.
- Lovable-Einsatz: 0–1.
- Gate: F-11 vollständig abgezeichnet.
- Status: **DONE**.

### MVP-BASELINE — formaler MVP-Abschluss

- Schwerpunkt: finaler Release-Gate-Lauf, PROJECT-STATUS, MVP-Abnahme, CHANGELOG und SYSING-001.
- Arbeits-Prompts: 1.
- Lovable-Einsatz: 0–1.
- Gate: **MVP = 100 % / BASELINE**.
- Status: **DONE**.

### BSF-01 — Planungs- und Architekturbaseline

- Schwerpunkt: ADR-Review, Providergrenzen, Rollen-/Scope-Modell, minimale Datenabhängigkeiten und BSF-Gates.
- Arbeits-Prompts: 1.
- Lovable-Einsatz: **0**.
- Gate: verbindlicher BSF-Start mit eindeutiger Systemhaus-/Customer-Scope- und Mehrbenutzer-Datenbasis-Entscheidung.
- Status: **IN ARBEIT** über Issue #73.

### BSF-02 — Kundenmodell + minimale gemeinsame Daten-/Read-Basis

- Schwerpunkt: Kunde als stabile Fachentität; Zuordnung von Projekten, Arbeitspaketen und Tätigkeiten.
- Kundenidentität gilt systemhausgebunden als `(systemhouseId, customerId)`, nicht installations- oder systemhausübergreifend global.
- Eine providerneutrale Customer-Identity-/Mapping-Schicht muss SharePoint, Sysing Dashboard und Reportfamilie innerhalb desselben Systemhauses auf dieselbe Kundenidentität beziehen können.
- `systemhouseId` darf nicht fest an Microsoft Tenant ID oder einen anderen Provider gekoppelt werden.
- Weil Projekte, Arbeitspakete und Tätigkeiten heute user-scoped lokal gehalten werden, muss BSF-02 zusätzlich genau die **minimal erforderliche gemeinsame/synchronisierte Datenbasis bzw. einen gemeinsamen Read-Pfad** vorbereiten, die BSF-03 und BSF-03A für echte Mehrbenutzersichten benötigen.
- Das ist kein Vorziehen des vollständigen BSF-04: Migration, vollständige zentrale Datenstrategie, Local-First-Ablösung und umfassende Providertrennung bleiben BSF-04.
- Arbeits-Prompts: 1–2.
- Lovable-Einsatz: **0–1**, ausschließlich für Kundenkontext-/UI-Visualisierung nach festgelegter Architektur.
- Gate: Kunde → Projekt → Arbeitspaket → Tätigkeit belastbar; Identitätsgrenze je Systemhaus eindeutig; gemeinsamer Read-/Datenpfad für Kunden- und Leistungssichten fachlich und technisch nutzbar.
- Status: **NÄCHSTER PUNKT** nach BSF-01.

### BSF-03 — Kundenverantwortung

- Schwerpunkt: „Meine Kunden“, mehrere Kunden je Sysing, Sicht- und Schreibscope getrennt.
- Kundenverantwortung ist ein fachlicher Scope/Beziehungsmodell, keine neue globale Rolle.
- Arbeits-Prompts: 2.
- Lovable-Einsatz: **1–2**, insbesondere `Meine Kunden`, Kundenkontext und Sichtbarkeitsindikatoren.
- Gate: RBAC/RLS-Kundensicht PASS; Sichtbarkeit erzeugt keine impliziten globalen Schreibrechte.

### BSF-03A — Projektmanager-Leistungssicht / Controlling

- Schwerpunkt: reine Auswertungssicht für Projektmanager nach Zeitraum, Kunde, Projekt und Tätigkeiten.
- Mindestens: abrechenbare/nicht abrechenbare Zeit, Summen je Kunde/Projekt, Filter und Drill-down Kunde → Projekt → Tätigkeiten.
- Keine Teamlead-Finalisierungsrechte.
- Serverseitige Begrenzung auf zulässigen Projekt-/Verantwortungsscope.
- Arbeits-Prompts: 1–2.
- Lovable-Einsatz: **2–4**, insbesondere Filter, Tabellen, Summen, Drill-down und Rollen-Preview; möglichst mindestens 1 Credit Reserve.
- Gate: Projektmanager kann Leistungen im zulässigen Scope vollständig auswerten, ohne Abrechnungs-/Finalisierungsrechte zu erhalten.

### BSF-03B — Leistungsnachweis Teamlead V1

- Schwerpunkt: kundenbezogener Leistungsnachweis, ausdrücklich keine kaufmännische Rechnung.
- Teamlead bereitet vor und finalisiert.
- Kunde + fester Zeitraum.
- Abrechenbare und nicht abrechenbare Tätigkeiten bleiben in der Prüfsicht sichtbar.
- Abrechenbarkeit kann vor Finalisierung geändert werden.
- Summe abrechenbarer Zeit.
- Finalisierung erzeugt unveränderbaren Snapshot.
- Doppelabrechnung serverseitig verhindern; Korrektur über geregelten Ersatz-/Korrekturprozess.
- Report/Export pro Kunde und Zeitraum; Leistungserbringer erscheint nicht in der endgültigen Kundenausgabe.
- Arbeits-Prompts: 2–3.
- Lovable-Einsatz: **2–4**, insbesondere Prüfsicht, Finalisierungsdialog, Statusführung und Export-Preview; möglichst mindestens 1 Credit Reserve.
- Gate: Teamlead-Finalisierung, Audit und Projektmanager-Auswertung sauber getrennt.

### BSF-DOC-01 — Dokumentationskonsolidierung

- Schwerpunkt: kontextsensitive Hilfe, Benutzerhandbuch, technische Dokumentation und Entwicklungstagebuch auf den realen Produktstand bringen.
- Die Dokumentationssynchronität ist bereits in jedem Fachsprint Teil der Definition of Done; dieser Block dient der bewussten Gesamtprüfung nach den priorisierten Fachausbauten.
- Arbeits-Prompts: 1–2.
- Lovable-Einsatz: **0–1**, nur für UI-/Hilfe-Preview.
- Gate: keine bekannte relevante Dokumentationsdrift.

### BSF-DOC-02 — SYSING-001 im TDF-Format fortschreiben

- Ausgangspunkt ist das bereits vorhandene Living Document `docs/SYSING-001_Sysing-Dashboard-Produktuebersicht_V0.2.1.md`; es wird kontrolliert versioniert und nicht durch eine zweite Quelle ersetzt.
- Schwerpunkt: management- und technikorientiertes Gesamt-/Architekturdokument auf den aktuellen Produkt-/BSF-Stand bringen.
- Ist-Zustand, Zielbild, Architektur, Sicherheit, Betrieb, Informationsflüsse, Rollen, AVKK, Kunden-/Leistungssicht, Portabilität und bekannte Grenzen klar trennen.
- TDF-Traceability, Quellen/Provenienz, Versionsregression und Abschlusscheck anwenden.
- Arbeits-Prompts: 1–2.
- Lovable-Einsatz: **0**.
- Gate: TDF-konformes SYSING-001 vollständig und gegen realen Produktstand geprüft; PDF/Word aus derselben Quelle erzeugt.

### BSF-DOC-03 — SYSING-001 aus dem Board erreichbar

- Schwerpunkt: read-only Zugriff auf SYSING-001 über Hilfe/Dokumentation in der Anwendung.
- Keine zweite divergierende Dokumentquelle in der App erzeugen.
- Kontextsensitive Hilfe, Benutzerhandbuch und SYSING-001 als getrennte Ebenen anbieten.
- Arbeits-Prompts: 1–2.
- Lovable-Einsatz: **1–2**, insbesondere Navigation, Anzeige und UI/Preview.
- Gate: Nutzer kann aus dem Board auf die freigegebene SYSING-001-Version zugreifen.

### BSF-04 — zentrale oder synchronisierte Datenhaltung

- Schwerpunkt: vollständige Local-First-Grenze, persistenter Mehrbenutzer-Datenpfad, Migration und Providertrennung.
- BSF-02 darf hierfür nur den minimal benötigten gemeinsamen Read-/Datenpfad vorziehen; der vollständige Architekturentscheid bleibt hier.
- Arbeits-Prompts: 2.
- Lovable-Einsatz: 0–1.
- Gate: zentrale/synchronisierte Datenstrategie technisch und fachlich bestätigt.

### BSF-05 — Canonical Import Model und SharePoint-Contract

- Schwerpunkt: partielle Quelldaten, Provenienz, stabile Quell-IDs, Idempotenz und READ/SYNC.
- SharePoint darf fachliche Kundenquelle bleiben, auch wenn dort zunächst keine gemeinsame `customerId` existiert.
- Quellmapping wird innerhalb eines vorher feststehenden `systemhouseId` ausgeführt und verwendet stabile Quellreferenzen wie `sourceSystem`, `sourceInstance` und `sourceRecordId`.
- Unsichere Matches dürfen nicht automatisch zusammengeführt werden; Cross-Systemhaus- und Cross-Tenant-Matching ist ausgeschlossen.
- Arbeits-Prompts: 2.
- Lovable-Einsatz: 0–1.
- Gate: Importvertrag PASS; derselbe Kunde kann innerhalb eines Systemhauses eindeutig zwischen SharePoint, Sysing Dashboard und Reportfamilie aufgelöst werden, ohne Kundenräume verschiedener Systemhäuser zu vermischen.

### BSF-06 — Betreiberhoheit und Docker

- Schwerpunkt: Supabase/Postgres-Portabilität, Backup/Restore, Docker und Exit-Pfad aus Lovable Cloud.
- Arbeits-Prompts: 2–3.
- Lovable-Einsatz: 0.
- Gate: Betrieb ohne technisch unersetzbare Lovable-Runtime nachgewiesen.

### BSF-07 — Managementcockpit 2

- Schwerpunkt: Kunden- und Projektkontext für Projektmanager, Teamlead, Systemingenieur und Administration.
- Arbeits-Prompts: 1–2.
- Lovable-Einsatz: 1–2.
- Gate: rollenbezogene Führungssichten PASS.

### BSF-08 — historischer Planungsplatz für Leistungsnachweis/Controlling

Der bisher hier geplante fachliche Scope wurde mit Issue #71 aus Nutzwertgründen operativ in **BSF-03A** und **BSF-03B** vorgezogen. Dieser Abschnitt bleibt als Traceability-Hinweis erhalten und erzeugt keinen zweiten Implementierungssprint.

- Projektmanager-Controlling → BSF-03A.
- Teamlead-Leistungsnachweis V1 → BSF-03B.
- Rest- oder Integrationsbedarf wird bei BSF-07/BSF-09 neu bewertet.

### BSF-09 — Reporting 2

- Schwerpunkt: Kunden-/Projektberichte und Konsolidierung der Ausgabeformate.
- Arbeits-Prompts: 1–2.
- Lovable-Einsatz: 1.
- Gate: Reporting-Baseline BSF.

### BSF-10 — KI-/Agenten-Labor

- Schwerpunkt: isoliertes Lern- und Demonstrationslabor mit Mock-/Demodaten und Human-in-the-loop.
- Arbeits-Prompts: 1–2.
- Lovable-Einsatz: 0–1.
- Gate: keine autonome Produktivaktion, nachvollziehbare Beleg- und Freigabekette.

### BSF-FINAL — Gesamtprüfung und Baseline

- Schwerpunkt: SYSING-001 fortschreiben, Rollen-/RLS-/Import-/Docker-/Reporting-Abnahme und Gesamtfreigabe.
- Arbeits-Prompts: 2.
- Lovable-Einsatz: 0–1.
- Gate: **BSF = 100 % / BASELINE**.

### INTEGRATION-READINESS

- Schwerpunkt: Source of Truth, Matching, Provenienz, Audit, Konfliktregeln, Schreibgrenzen und Providertrennung.
- Arbeits-Prompts: 1.
- Lovable-Einsatz: 0.
- Gate: GO/NO-GO für produktive Integration.

### INTEGRATION 10A–10D

- Schwerpunkt: Microsoft Graph / Exchange Online gemäß späterem Post-MVP-Detailplan.
- Arbeits-Prompts: 1–2 je Ausbauschritt.
- Lovable-Einsatz: 0–1 je UI-Schritt.
- Gate: kontrollierte Integration, zunächst read-only und erst später freigegebene Schreibpfade.

## 4. Leistungsnachweis und Projektmanager-Controlling — fachlich vorgemerkt

Operative Umsetzung: **BSF-03A / BSF-03B**.

### Teamlead / Leistungsnachweis V1

- V1 ist **Leistungsnachweis, keine Rechnung**.
- nur Teamlead bereitet vor und finalisiert,
- Kunde + fester Zeitraum,
- abrechenbare und nicht abrechenbare Tätigkeiten sichtbar,
- Teamlead kann vor Finalisierung abrechenbar ↔ nicht abrechenbar ändern,
- Summe abrechenbarer Zeit,
- finaler unveränderbarer Snapshot,
- Report/Export pro Kunde und Zeitraum,
- Name des Leistungserbringers erscheint **nicht** in der endgültigen Kundenausgabe,
- Doppelabrechnung serverseitig verhindern,
- Audit und geregelter Korrektur-/Ersetzungsprozess.

### Projektmanager / Controlling

Projektmanager erhält eine **reine Auswertungssicht**, keine Teamlead-Abrechnungsrechte:

- Zeitraum von/bis,
- Kunde,
- Projekt,
- geleistete Tätigkeiten,
- abrechenbare Zeit,
- nicht abrechenbare Zeit,
- Summen je Kunde,
- Summen je Projekt,
- Filter `abrechenbar / nicht abrechenbar / alle`,
- Drill-down Kunde → Projekt → Tätigkeiten,
- serverseitige Begrenzung auf zulässigen Projekt-/Verantwortungsscope.

## 5. Verbindliche Übergänge

1. **09C-FINAL → MVP-BASELINE:** abgeschlossen; keine neue MVP-Fachfunktion mehr.
2. **MVP-BASELINE → BSF-01:** MVP-Baseline ist erreicht; BSF beginnt mit fokussierter Planungs-/Architekturbaseline.
3. **BSF-01 → BSF-02 → BSF-03 → BSF-03A → BSF-03B:** Kundenentität, minimal notwendige gemeinsame Datenbasis und Kundenscope werden vor Leistungs-/Abrechnungsfunktionen stabilisiert.
4. **BSF-03B → BSF-DOC-01 → BSF-DOC-02 → BSF-DOC-03:** priorisierte Fachausbauten werden dokumentarisch konsolidiert; SYSING-001 wird TDF-konform fortgeschrieben und aus dem Board erreichbar gemacht.
5. **BSF-DOC-03 → BSF-04:** anschließend Fortsetzung der vollständigen technischen BSF-Datenhaltungsroadmap.
6. **BSF-02 → BSF-05:** Kundenmodell und Kundenverantwortung vor realer Datenintegration stabilisieren; die systemhausgebundene Kundenidentität muss vor SharePoint-/Cross-Project-Mapping entschieden sein.
7. **BSF-06 vor BSF-FINAL:** Betreiberhoheit und Portabilität sind BSF-Pflicht, nicht Nacharbeit.
8. **BSF-FINAL → INTEGRATION-READINESS:** Microsoft Graph/Exchange erst nach bestandener BSF-Baseline und eigenem Readiness-Gate.

Providerneutrale Importkette bleibt verbindlich:

`SOURCE → NORMALIZE → VALIDATE → MATCH → ENRICH → REVIEW → PERSIST → AVKK`

Für Kunden-Matching gilt zusätzlich zwingend:

`SYSTEMHOUSE SCOPE → SOURCE MAPPING → CUSTOMER RESOLUTION`

Kein Matching darf Kundenräume unterschiedlicher Systemhäuser zusammenführen.

## 6. Planungsgrößen

- MVP-Abschluss: **erreicht**.
- BSF: rollierende Schätzung; die bisherige Größenordnung von ungefähr **14–21 Arbeits-Prompts** wird nach jedem priorisierten Sprint anhand des realen Ergebnisses aktualisiert.
- Lovable wird nach tatsächlichem UI-/Runtime-Nutzen eingeplant; tägliche 5 Credits werden sinnvoll priorisiert, nicht künstlich verbraucht.
- Promptzahlen sind rollierende Schätzungen und werden nach jedem Sprint anhand des realen Ergebnisses aktualisiert.

## 7. Abgrenzung

Microsoft Graph, Exchange Online und produktive Agentenautomation sind **nicht Bestandteil des BSF**. Der ältere `POST-MVP-PLAN.md` bleibt fachliche Detailplanung für die spätere Integrationsphase, sein unmittelbarer Startzeitpunkt ist durch `ROADMAP-MVP-BSF.md` überholt.
