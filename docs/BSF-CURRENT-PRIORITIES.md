# Sysing Dashboard — aktuelle BSF-Prioritäten

Stand: 2026-08-25  
Status: operative Prioritätenliste für den täglichen Wiederanlauf  
Strategische Grundlage: `docs/ROADMAP-MVP-BSF.md`  
Operative Detailplanung: `docs/SPRINT-PLAN-MVP-BSF.md`

## Zweck

Diese Datei beantwortet für jede Arbeitssitzung vier Fragen:

1. Was ist bereits abgeschlossen?
2. Woran arbeiten wir gerade?
3. Was ist der nächste fachliche Schritt?
4. Wo und mit welchem Ziel werden die **5 täglichen Lovable-Credits** sinnvoll eingesetzt?

Sie ist die kompakte operative Source of Truth für die aktuelle Reihenfolge. Die strategische Roadmap bleibt erhalten; bereits verwendete Sprintnummern werden nicht rückwirkend umnummeriert. Priorisierte Zwischenschritte erhalten Suffixe wie `BSF-03A` und `BSF-03B`.

## Statuslegende

- `DONE` — vollständig abgeschlossen und dokumentiert
- `IN ARBEIT` — aktuell laufender Punkt
- `NÄCHSTER PUNKT` — unmittelbar nach Abschluss des laufenden Punkts
- `GEPLANT` — verbindlich vorgesehen, aber noch nicht begonnen

## Lovable-Legende

- `0` — kein Lovable erforderlich; ChatGPT/GitHub/lokal ist geeigneter
- `0–1` — optionaler UI-/Preview-/Runtime-Check
- `1–2` — gezielter Implementierungs-/Preview-Auftrag sinnvoll
- `2–4` — UI-/Runtime-lastiger Arbeitspunkt; mehrere fokussierte Läufe können sinnvoll sein
- `Reserve` — mindestens ein Credit möglichst für einen echten Korrektur-/Abnahmelauf zurückhalten

Die Angaben sind **Planungsgrößen pro Arbeitspunkt**, kein Verbrauchszwang. Wenn ein Sprint an einem Tag Lovable-relevant ist, werden bevorzugt **3–4 Credits für klar definierte Arbeit** und **1–2 Credits als Korrektur-/Abnahmereserve** eingeplant. Bei Architektur-/Governance-Tagen werden Credits nur dann genutzt, wenn eine sichere, isolierte Vorarbeit für den unmittelbar nächsten UI-Sprint fachlich bereits freigegeben ist.

## Aktuelle Prioritätenliste

| Nr. | Arbeitspaket | Status | Lovable-Einsatz | Kernergebnis |
| --- | --- | --- | --- | --- |
| 1 | Governance-Nachlauf #69 | **IN ARBEIT** | **0** | Aktiven GitHub-`main`-Schutz in laufender Governance-Dokumentation festschreiben |
| 2 | BSF-01 — Planungs-/Architekturbaseline | **NÄCHSTER PUNKT** | **0** | Providergrenzen, Rollen-/Scope-Modell und BSF-Gates als verbindlichen BSF-Start bestätigen |
| 3 | BSF-02 — Kundenmodell | **GEPLANT** | **0–1** — optional Preview des Kundenkontexts; keine Datenmodellentscheidung durch Lovable | Kunde als stabile Fachentität; belastbare Kette Kunde → Projekt → Arbeitspaket → Tätigkeit |
| 4 | BSF-03 — Kundenverantwortung / Kundensicht | **GEPLANT** | **1–2** — `Meine Kunden`, Kundenauswahl, Sichtbarkeitsindikatoren und Rollen-Preview im isolierten UI-Arbeitsbereich | `Meine Kunden`, Sichtscope, RBAC/RLS, Sicht- und Schreibrechte getrennt |
| 5 | BSF-03A — Projektmanager-Leistungssicht / Controlling | **GEPLANT** | **2–4** — Filter, Tabellen, Summen, Drill-down und rollenbezogene Preview; 1 Credit Reserve | Read-only Auswertung nach Zeitraum, Kunde, Projekt, Tätigkeiten, abrechenbar/nicht abrechenbar, Summen und Drill-down |
| 6 | BSF-03B — Leistungsnachweis Teamlead V1 | **GEPLANT** | **2–4** — Prüfsicht, Statusführung, Finalisierungsdialog und Export-Preview; 1 Credit Reserve | Vorbereitung, Abrechenbarkeit, Finalisierung, unveränderbarer Snapshot, Doppelabrechnungsschutz und Audit; keine Rechnung |
| 7 | BSF-DOC-01 — Dokumentationskonsolidierung | **GEPLANT** | **0–1** — nur kontextsensitive Hilfe/UI-Preview; Inhaltsarbeit primär außerhalb Lovable | Kontext-sensitive Hilfe, Benutzerhandbuch, technische Doku und Entwicklungstagebuch vollständig synchron |
| 8 | BSF-DOC-02 — SYSING-001 im TDF-Format | **GEPLANT** | **0** | Lebendes management- und technikorientiertes Gesamtdokument des Sysing Dashboards |
| 9 | BSF-DOC-03 — SYSING-001 aus dem Board erreichbar | **GEPLANT** | **1–2** — Hilfe-/Dokumentationsnavigation und read-only Darstellung im Board | Read-only Zugriff über Hilfe/Dokumentation im Dashboard; keine zweite Dokumentquelle |
| 10 | Fortsetzung strategische BSF-Roadmap ab BSF-04 | **GEPLANT** | **je Sprint neu festlegen** | Datenhaltung, Import/SharePoint, Betreiberhoheit/Docker, Managementcockpit 2, Reporting 2, KI-Labor, BSF-FINAL, Integration Readiness |

## Definition of Done ab BSF

Ein Fachpunkt gilt nur dann als abgeschlossen, wenn neben Code und Tests auch alle durch die Änderung betroffenen Dokumentationsflächen aktuell sind.

Je nach Scope gehören dazu:

- kontextsensitive Hilfe,
- Benutzerhandbuch,
- technische Dokumentation,
- `docs/ENTWICKLUNGSTAGEBUCH.md`,
- `docs/CURRENT-STATUS.md`, wenn der laufende Produkt-/Governance-Status betroffen ist,
- technischer Prüfbericht bzw. CI-/Quality-Gate-Evidenz,
- SYSING-001 ab dem Zeitpunkt seiner Einführung.

Historische, datierte Abschlussdokumente werden nicht rückwirkend umgeschrieben.

## Lovable-Tagesbudget und Tagessteuerung

Operative Planungsgröße: **5 neue Lovable-Credits pro Tag**.

### Tagesregel

Zu Beginn jedes Arbeitstages wird für den aktuell aktiven Punkt festgelegt:

1. **Lovable-Ziel des Tages** — welches konkrete UI-/Preview-/Runtime-Ergebnis soll entstehen?
2. **Credit-Ziel** — wie viele Credits sind dafür realistisch sinnvoll?
3. **Reserve** — möglichst 1–2 Credits für echte Korrektur oder Abnahme zurückhalten.
4. **Stop-Kriterium** — nach erreichtem Ziel keine künstliche weitere Änderung nur zum Verbrauch verbleibender Credits.

### Bevorzugte Nutzung in den nächsten Sprints

1. **BSF-03 Kundenverantwortung** — `Meine Kunden`, Kundenkontext und Sichtbarkeitslogik visualisieren.
2. **BSF-03A Projektmanager-Leistungssicht** — UI/UX der Auswertung, Filter, Summen und Drill-down.
3. **BSF-03B Leistungsnachweis Teamlead** — Prüfsicht, Finalisierungsablauf und Report-/Export-Preview.
4. **BSF-DOC-01 / DOC-03** — kontextsensitive Hilfe und Zugriff auf Handbuch/SYSING-001 aus dem Board.

### Nicht mit Lovable lösen

- Architekturentscheidungen,
- Branch-/Release-Governance,
- reine Repository-Dokumentation,
- TDF-Erstellung von SYSING-001,
- RBAC/RLS-Sicherheitsentscheidung als reine UI-Logik,
- Provider-/Datenmodellentscheidungen ohne vorherigen Architekturentscheid.

Lovable bleibt Implementierungs-/Preview-Werkzeug. Jeder Lauf erfolgt auf nachweislich isolierter Nicht-`main`-Arbeitsfläche; Integration erfolgt anschließend über GitHub-Branch + PR + Required Checks.

## Regel zur Übersicht im Chat

Nach jedem vollständig abgeschlossenen Punkt dieser Liste wird:

1. diese Datei aktualisiert,
2. der abgeschlossene Punkt auf `DONE` gesetzt,
3. genau ein Punkt auf `IN ARBEIT` oder `NÄCHSTER PUNKT` nachgezogen,
4. der geplante **Lovable-Einsatz des nun aktiven Punktes** genannt,
5. dem Nutzer im Abschlussbericht die **vollständige aktuelle Liste** erneut gezeigt.

Damit bleibt der Projektfortschritt einschließlich der täglichen Lovable-Nutzung auch über längere Chats und mehrere Arbeitstage hinweg sichtbar.

## Fachliche Leitlinie für die nächsten Schritte

Der aktuelle rote Faden lautet:

`Kunde → Kundenverantwortung → Projektmanager-Leistungssicht → Teamlead-Leistungsnachweis → Dokumentationskonsolidierung → SYSING-001/TDF → Board-Zugriff auf Dokumentation`

Erst danach wird die bestehende technische BSF-Roadmap ab BSF-04 fortgesetzt, sofern kein neuer priorisierter Befund eine bewusste Planänderung erfordert.
