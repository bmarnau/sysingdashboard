# Sysing Dashboard — aktuelle BSF-Prioritäten

Stand: 2026-08-25  
Status: operative Prioritätenliste für den täglichen Wiederanlauf  
Strategische Grundlage: `docs/ROADMAP-MVP-BSF.md`  
Operative Detailplanung: `docs/SPRINT-PLAN-MVP-BSF.md`

## Zweck

Diese Datei beantwortet für jede Arbeitssitzung drei Fragen:

1. Was ist bereits abgeschlossen?
2. Woran arbeiten wir gerade?
3. Was ist der nächste fachliche Schritt?

Sie ist die kompakte operative Source of Truth für die aktuelle Reihenfolge. Die strategische Roadmap bleibt erhalten; bereits verwendete Sprintnummern werden nicht rückwirkend umnummeriert. Priorisierte Zwischenschritte erhalten Suffixe wie `BSF-03A` und `BSF-03B`.

## Statuslegende

- `DONE` — vollständig abgeschlossen und dokumentiert
- `IN ARBEIT` — aktuell laufender Punkt
- `NÄCHSTER PUNKT` — unmittelbar nach Abschluss des laufenden Punkts
- `GEPLANT` — verbindlich vorgesehen, aber noch nicht begonnen

## Aktuelle Prioritätenliste

| Nr. | Arbeitspaket | Status | Kernergebnis |
| --- | --- | --- | --- |
| 1 | Governance-Nachlauf #69 | **IN ARBEIT** | Aktiven GitHub-`main`-Schutz in laufender Governance-Dokumentation festschreiben |
| 2 | BSF-01 — Planungs-/Architekturbaseline | **NÄCHSTER PUNKT** | Providergrenzen, Rollen-/Scope-Modell und BSF-Gates als verbindlichen BSF-Start bestätigen |
| 3 | BSF-02 — Kundenmodell | **GEPLANT** | Kunde als stabile Fachentität; belastbare Kette Kunde → Projekt → Arbeitspaket → Tätigkeit |
| 4 | BSF-03 — Kundenverantwortung / Kundensicht | **GEPLANT** | `Meine Kunden`, Sichtscope, RBAC/RLS, Sicht- und Schreibrechte getrennt |
| 5 | BSF-03A — Projektmanager-Leistungssicht / Controlling | **GEPLANT** | Read-only Auswertung nach Zeitraum, Kunde, Projekt, Tätigkeiten, abrechenbar/nicht abrechenbar, Summen und Drill-down |
| 6 | BSF-03B — Leistungsnachweis Teamlead V1 | **GEPLANT** | Vorbereitung, Abrechenbarkeit, Finalisierung, unveränderbarer Snapshot, Doppelabrechnungsschutz und Audit; keine Rechnung |
| 7 | BSF-DOC-01 — Dokumentationskonsolidierung | **GEPLANT** | Kontext-sensitive Hilfe, Benutzerhandbuch, technische Doku und Entwicklungstagebuch vollständig synchron |
| 8 | BSF-DOC-02 — SYSING-001 im TDF-Format | **GEPLANT** | Lebendes management- und technikorientiertes Gesamtdokument des Sysing Dashboards |
| 9 | BSF-DOC-03 — SYSING-001 aus dem Board erreichbar | **GEPLANT** | Read-only Zugriff über Hilfe/Dokumentation im Dashboard; keine zweite Dokumentquelle |
| 10 | Fortsetzung strategische BSF-Roadmap ab BSF-04 | **GEPLANT** | Datenhaltung, Import/SharePoint, Betreiberhoheit/Docker, Managementcockpit 2, Reporting 2, KI-Labor, BSF-FINAL, Integration Readiness |

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

## Lovable-Tagesbudget

Operative Planungsgröße: **5 neue Lovable-Credits pro Tag**.

Grundsätze:

- Credits gezielt dort einsetzen, wo UI-, Preview- oder Runtime-Nutzen besteht.
- Keine künstliche Credit-Auslastung und keine unnötigen Build-/Fix-Schleifen.
- Möglichst Reserve für einen echten Korrekturlauf lassen.
- Nächste bevorzugte Lovable-Einsatzfelder: Kunden-/Kundensicht, Projektmanager-Leistungssicht, Leistungsnachweis-UI sowie später kontextsensitive Hilfe und Dokumentationszugriff.
- Reine Architektur-, Governance- und Dokumentationsarbeit wird primär in ChatGPT/GitHub/lokalen Werkzeugen durchgeführt.
- Lovable bleibt Implementierungs-/Preview-Werkzeug; Integration erfolgt über GitHub-Branch + PR + Required Checks.

## Regel zur Übersicht im Chat

Nach jedem vollständig abgeschlossenen Punkt dieser Liste wird:

1. diese Datei aktualisiert,
2. der abgeschlossene Punkt auf `DONE` gesetzt,
3. genau ein Punkt auf `IN ARBEIT` oder `NÄCHSTER PUNKT` nachgezogen,
4. dem Nutzer im Abschlussbericht die **vollständige aktuelle Liste** erneut gezeigt.

Damit bleibt der Projektfortschritt auch über längere Chats und mehrere Arbeitstage hinweg sichtbar.

## Fachliche Leitlinie für die nächsten Schritte

Der aktuelle rote Faden lautet:

`Kunde → Kundenverantwortung → Projektmanager-Leistungssicht → Teamlead-Leistungsnachweis → Dokumentationskonsolidierung → SYSING-001/TDF → Board-Zugriff auf Dokumentation`

Erst danach wird die bestehende technische BSF-Roadmap ab BSF-04 fortgesetzt, sofern kein neuer priorisierter Befund eine bewusste Planänderung erfordert.
