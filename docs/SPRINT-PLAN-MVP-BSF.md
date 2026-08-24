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

| Sprint / Phase | Schwerpunkt | Arbeits-Prompts | Lovable-Einsatz | Zentrales Gate |
| --- | --- | ---: | ---: | --- |
| **09C-FINAL** | F-11 fertigstellen: letzter Systemstatus-Retest, Role-Preview-N/A, Doku-Konsolidierung | 1–2 | 0–1 | F-11 vollständig abgezeichnet |
| **MVP-BASELINE** | finaler Release-Gate-Lauf, PROJECT-STATUS, MVP-Abnahme, CHANGELOG, SYSING-001 | 1 | 0–1 | **MVP = 100 % / BASELINE** |
| **BSF-01** | Planungs-/Architekturbaseline, ADR-Review, Provider- und Scope-Grenzen | 1 | 0 | verbindlicher BSF-Start |
| **BSF-02** | Kundenmodell als stabile Fachentität | 1–2 | 0–1 | Kunde → Projekt → Arbeitspaket → Tätigkeit belastbar |
| **BSF-03** | Kundenverantwortung, „Meine Kunden“, Sicht-/Schreibscope | 2 | 1 | RBAC/RLS-Kundensicht PASS |
| **BSF-04** | zentrale/synchronisierte Datenhaltung, Local-First-Grenze | 2 | 0–1 | persistenter Mehrbenutzer-Datenpfad / Providergrenze |
| **BSF-05** | Canonical Import Model + SharePoint-Contract | 2 | 0–1 | partielle Quelldaten, Provenienz, Idempotenz, READ/SYNC |
| **BSF-06** | Betreiberhoheit, Supabase/Postgres-Portabilität, Docker, Exit-Pfad | 2–3 | 0 | Betrieb ohne technisch unersetzbare Lovable-Runtime |
| **BSF-07** | Managementcockpit 2 mit Kunden-/Projektkontext | 1–2 | 1–2 | rollenbezogene Führungssichten PASS |
| **BSF-08** | Kundenabrechnung V1 als Leistungsnachweis + Projektmanager-Controlling | 2–3 | 1–2 | Teamlead-Finalisierung und PM-Auswertung sauber getrennt |
| **BSF-09** | Reporting 2, Kunden-/Projektberichte, Formate konsolidieren | 1–2 | 1 | Reporting-Baseline BSF |
| **BSF-10** | isoliertes KI-/Agenten-Labor mit Mock-/Demodaten | 1–2 | 0–1 | Human-in-the-loop, keine autonome Produktivaktion |
| **BSF-FINAL** | SYSING-001 fortschreiben, Gesamtprüfung, BSF-Abnahme | 2 | 0–1 | **BSF = 100 % / BASELINE** |
| **INTEGRATION-READINESS** | Source of Truth, Matching, Provenienz, Audit, Schreibgrenzen, Provider prüfen | 1 | 0 | GO/NO-GO Integration |
| **INTEGRATION 10A–10D** | Microsoft Graph / Exchange Online gemäß Post-MVP-Detailplan | 1–2 je Schritt | 0–1 je UI-Schritt | kontrollierte Integration |

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
3. **BSF-02 → BSF-05:** Kundenmodell und Kundenverantwortung vor realer Datenintegration stabilisieren.
4. **BSF-06 vor BSF-FINAL:** Betreiberhoheit und Portabilität sind BSF-Pflicht, nicht Nacharbeit.
5. **BSF-FINAL → INTEGRATION-READINESS:** Microsoft Graph/Exchange erst nach bestandener BSF-Baseline und eigenem Readiness-Gate.

Providerneutrale Importkette bleibt verbindlich:

`SOURCE → NORMALIZE → VALIDATE → MATCH → ENRICH → REVIEW → PERSIST → AVKK`

## 6. Planungsgrößen

- MVP-Abschluss: noch ungefähr **1–2 Arbeitsblöcke**.
- BSF: ungefähr **14–21 Arbeits-Prompts**.
- Lovable wird innerhalb dieser Spanne nach tatsächlichem UI-/Runtime-Nutzen eingeplant; tägliche 5 Credits werden sinnvoll priorisiert, nicht künstlich verbraucht.
- Promptzahlen sind rollierende Schätzungen und werden nach jedem Sprint anhand des realen Ergebnisses aktualisiert.

## 7. Abgrenzung

Microsoft Graph, Exchange Online und produktive Agentenautomation sind **nicht Bestandteil des BSF**. Der ältere `POST-MVP-PLAN.md` bleibt fachliche Detailplanung für die spätere Integrationsphase, sein unmittelbarer Startzeitpunkt ist durch `ROADMAP-MVP-BSF.md` überholt.
