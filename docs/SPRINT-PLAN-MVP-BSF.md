# Sysing Dashboard — Operative Sprintplanung MVP → BSF → Integration

Stand: 2026-08-24  
Status: operative Planung auf Basis von `docs/ROADMAP-MVP-BSF.md`

## 1. Zweck

Dieses Dokument übersetzt die verbindliche Roadmap in eine konkrete Sprintfolge. Die Roadmap bleibt die fachliche Quelle; diese Planung dient Durchführung, Aufwandseinschätzung und späterer Wiederaufnahme.

Arbeitsregel je Sprint:

`Analysieren → minimal umsetzen → testen → dokumentieren → Abschlussbericht → manuelle/inhaltliche Abnahme → nächster Prompt`

GitHub ist Source of Truth. Lovable wird gezielt für UI, Preview, plattformspezifische Runtime-Prüfung und dort sinnvollere Implementierungen eingesetzt.

## 2. Lovable-Tagesbudget

Nutzerseitig bestätigte operative Planungsgröße: **5 neue Lovable-Credits pro Tag** (Stand 2026-08-24, tarifabhängig).

Planungsprinzip:

- UI-/Preview-/Layout-Aufgaben bevorzugt mit Lovable,
- klar abgegrenzte Lovable-spezifische Implementierungen gezielt bündeln,
- möglichst Reserve für einen notwendigen Korrekturlauf lassen,
- keine künstlichen Änderungen oder Build-Schleifen nur zum Credit-Verbrauch,
- ungenutzte Credits rechtfertigen keine unnötige technische Änderung.

## 3. Operative Sprintfolge

### 09C-FINAL — F-11 abschließen

- Schwerpunkt: letzter Systemstatus-Retest, Role-Preview-N/A, Doku-Konsolidierung.
- Arbeits-Prompts: 1–2.
- Lovable-Einsatz: 0–1.
- Gate: F-11 vollständig abgezeichnet.

### MVP-BASELINE — formaler MVP-Abschluss

- Schwerpunkt: finaler Release-Gate-Lauf, PROJECT-STATUS, MVP-Abnahme, CHANGELOG und SYSING-001.
- Arbeits-Prompts: 1.
- Lovable-Einsatz: 0–1.
- Gate: **MVP = 100 % / BASELINE**.

### BSF-01 — Planungs- und Architekturbaseline

- Schwerpunkt: ADR-Review, Providergrenzen, Rollen-/Scope-Modell und BSF-Gates.
- Arbeits-Prompts: 1.
- Lovable-Einsatz: 0.
- Gate: verbindlicher BSF-Start.

### BSF-02 — Kundenmodell

- Schwerpunkt: Kunde als stabile Fachentität; Zuordnung von Projekten, Arbeitspaketen und Tätigkeiten.
- Kundenidentität gilt systemhausgebunden als `(systemhouseId, customerId)`, nicht installations- oder systemhausübergreifend global.
- Eine providerneutrale Customer-Identity-/Mapping-Schicht muss SharePoint, Sysing Dashboard und Reportfamilie innerhalb desselben Systemhauses auf dieselbe Kundenidentität beziehen können.
- `systemhouseId` darf nicht fest an Microsoft Tenant ID oder einen anderen Provider gekoppelt werden.
- Arbeits-Prompts: 1–2.
- Lovable-Einsatz: 0–1.
- Gate: Kunde → Projekt → Arbeitspaket → Tätigkeit belastbar; Identitätsgrenze je Systemhaus fachlich und technisch eindeutig.

### BSF-03 — Kundenverantwortung

- Schwerpunkt: „Meine Kunden“, mehrere Kunden je Sysing, Sicht- und Schreibscope getrennt.
- Arbeits-Prompts: 2.
- Lovable-Einsatz: 1.
- Gate: RBAC/RLS-Kundensicht PASS.

### BSF-04 — zentrale oder synchronisierte Datenhaltung

- Schwerpunkt: Local-First-Grenze, persistenter Mehrbenutzer-Datenpfad und Providertrennung.
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

### BSF-08 — Kundenabrechnung V1 und Projektmanager-Controlling

- Schwerpunkt: kundenbezogener Leistungsnachweis für Teamlead sowie reine Auswertungssicht für Projektmanager.
- Arbeits-Prompts: 2–3.
- Lovable-Einsatz: 1–2.
- Gate: Teamlead-Finalisierung und Projektmanager-Auswertung sauber getrennt.

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

## 4. BSF-08 — fachlich bereits vorgemerkt

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

1. **09C-FINAL → MVP-BASELINE:** keine neue MVP-Fachfunktion mehr; nur Abnahme, Doku und Gate.
2. **MVP-BASELINE → BSF-01:** BSF beginnt erst nach formaler MVP-Baseline.
3. **BSF-02 → BSF-05:** Kundenmodell und Kundenverantwortung vor realer Datenintegration stabilisieren; die systemhausgebundene Kundenidentität muss vor SharePoint-/Cross-Project-Mapping entschieden sein.
4. **BSF-06 vor BSF-FINAL:** Betreiberhoheit und Portabilität sind BSF-Pflicht, nicht Nacharbeit.
5. **BSF-FINAL → INTEGRATION-READINESS:** Microsoft Graph/Exchange erst nach bestandener BSF-Baseline und eigenem Readiness-Gate.

Providerneutrale Importkette bleibt verbindlich:

`SOURCE → NORMALIZE → VALIDATE → MATCH → ENRICH → REVIEW → PERSIST → AVKK`

Für Kunden-Matching gilt zusätzlich zwingend:

`SYSTEMHOUSE SCOPE → SOURCE MAPPING → CUSTOMER RESOLUTION`

Kein Matching darf Kundenräume unterschiedlicher Systemhäuser zusammenführen.

## 6. Planungsgrößen

- MVP-Abschluss: noch ungefähr **1–2 Arbeitsblöcke**.
- BSF: ungefähr **14–21 Arbeits-Prompts**.
- Lovable wird innerhalb dieser Spanne nach tatsächlichem UI-/Runtime-Nutzen eingeplant; tägliche 5 Credits werden sinnvoll priorisiert, nicht künstlich verbraucht.
- Promptzahlen sind rollierende Schätzungen und werden nach jedem Sprint anhand des realen Ergebnisses aktualisiert.

## 7. Abgrenzung

Microsoft Graph, Exchange Online und produktive Agentenautomation sind **nicht Bestandteil des BSF**. Der ältere `POST-MVP-PLAN.md` bleibt fachliche Detailplanung für die spätere Integrationsphase, sein unmittelbarer Startzeitpunkt ist durch `ROADMAP-MVP-BSF.md` überholt.
