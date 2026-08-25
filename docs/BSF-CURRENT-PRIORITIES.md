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
4. Wo bringt Lovable mit den täglich verfügbaren 5 Credits den größten Nutzen?

Sie ist die kompakte operative Source of Truth für die aktuelle Reihenfolge. Die strategische Roadmap bleibt erhalten; bereits verwendete Sprintnummern werden nicht rückwirkend umnummeriert. Priorisierte Zwischenschritte erhalten Suffixe wie `BSF-03A` und `BSF-03B`.

## Statuslegende

- `DONE` — vollständig abgeschlossen und dokumentiert
- `IN ARBEIT` — aktuell laufender Punkt
- `NÄCHSTER PUNKT` — unmittelbar nach Abschluss des laufenden Punkts
- `GEPLANT` — verbindlich vorgesehen, aber noch nicht begonnen

## Aktuelle Prioritätenliste

1. **Governance-Nachlauf #69 / PR #70 — DONE**
   - Kernergebnis: Aktiver GitHub-`main`-Schutz ist in der laufenden Governance-Dokumentation festgeschrieben; Security #413 und CI #422 PASS.
   - Lovable-Einsatz: **0 Credits**.

2. **BSF-01 — Planungs-/Architekturbaseline (#73) — IN ARBEIT**
   - Kernergebnis: Systemhaus-/Customer-Scope, Daten-, RBAC/RLS- und Providergrenzen für die priorisierten BSF-Funktionen verbindlich festlegen.
   - Lovable-Einsatz: **0 Credits**.

3. **BSF-02 — Kundenmodell + minimale gemeinsame Daten-/Read-Basis — NÄCHSTER PUNKT**
   - Kernergebnis: Kunde als stabile Fachentität; belastbare Kette Kunde → Projekt → Arbeitspaket → Tätigkeit; minimaler gemeinsamer Mehrbenutzer-Read-/Datenpfad für BSF-03/03A.
   - Lovable-Einsatz: **0–1 Credit**.

4. **BSF-03 — Kundenverantwortung / Kundensicht — GEPLANT**
   - Kernergebnis: `Meine Kunden`, Sichtscope, RBAC/RLS sowie getrennte Sicht- und Schreibrechte.
   - Lovable-Einsatz: **1–2 Credits**.

5. **BSF-03A — Projektmanager-Leistungssicht / Controlling — GEPLANT**
   - Kernergebnis: Read-only-Auswertung nach Zeitraum, Kunde, Projekt, Tätigkeiten, abrechenbar/nicht abrechenbar, Summen und Drill-down.
   - Lovable-Einsatz: **2–4 Credits**.

6. **BSF-03B — Leistungsnachweis Teamlead V1 — GEPLANT**
   - Kernergebnis: Vorbereitung, Abrechenbarkeit, Finalisierung, unveränderbarer Snapshot, Doppelabrechnungsschutz und Audit; keine Rechnung.
   - Lovable-Einsatz: **2–4 Credits**.

7. **BSF-DOC-01 — Dokumentationskonsolidierung — GEPLANT**
   - Kernergebnis: Kontextsensitive Hilfe, Benutzerhandbuch, technische Doku und Entwicklungstagebuch vollständig synchron.
   - Lovable-Einsatz: **0–1 Credit**.

8. **BSF-DOC-02 — SYSING-001 im TDF-Format fortschreiben — GEPLANT**
   - Kernergebnis: Bestehendes Living Document `SYSING-001` kontrolliert auf aktuellen Produkt-/BSF-Stand aktualisieren und TDF-konform abnehmen.
   - Lovable-Einsatz: **0 Credits**.

9. **BSF-DOC-03 — SYSING-001 aus dem Board erreichbar — GEPLANT**
   - Kernergebnis: Read-only-Zugriff über Hilfe/Dokumentation im Dashboard; keine zweite Dokumentquelle.
   - Lovable-Einsatz: **1–2 Credits**.

10. **Fortsetzung strategische BSF-Roadmap ab BSF-04 — GEPLANT**
    - Kernergebnis: vollständige zentrale/synchronisierte Datenstrategie, Import/SharePoint, Betreiberhoheit/Docker, Managementcockpit 2, Reporting 2, KI-Labor, BSF-FINAL und Integration Readiness.
    - Lovable-Einsatz: **je Sprint neu festlegen**.

## Architekturhinweis zur Priorisierung

BSF-02 übernimmt nur die **minimal erforderliche gemeinsame Daten-/Read-Basis**, die Kundenverantwortung und eine rollenübergreifende Projektmanager-Leistungssicht überhaupt belastbar macht. Der spätere BSF-04-Sprint bleibt bestehen und behandelt die vollständige zentrale/synchronisierte Datenhaltungsstrategie, Local-First-Grenzen, Migration und Providertrennung. Dadurch wird kein Big-Bang-Umbau vorgezogen.

Die fachliche Kundenidentität bleibt systemhausgebunden und providerneutral:

`(systemhouseId, customerId)`

Eine Microsoft Tenant ID kann später Provider-/Mappinginformation sein, ist aber nicht der fachliche Primärscope des Sysing Dashboards.

## Definition of Done ab BSF

Ein Fachpunkt gilt nur dann als abgeschlossen, wenn neben Code und Tests auch alle durch die Änderung betroffenen Dokumentationsflächen aktuell sind.

Je nach Scope gehören dazu:

- kontextsensitive Hilfe,
- Benutzerhandbuch,
- technische Dokumentation,
- `docs/ENTWICKLUNGSTAGEBUCH.md`,
- `docs/CURRENT-STATUS.md`, wenn der laufende Produkt-/Governance-Status betroffen ist,
- technischer Prüfbericht bzw. CI-/Quality-Gate-Evidenz,
- SYSING-001 ab dem Zeitpunkt seiner BSF-Fortschreibung.

Historische, datierte Abschlussdokumente werden nicht rückwirkend umgeschrieben.

## Lovable-Tagesbudget

Operative Planungsgröße: **5 neue Lovable-Credits pro Tag**.

Grundsätze:

- Credits gezielt dort einsetzen, wo UI-, Preview- oder Runtime-Nutzen besteht.
- Keine künstliche Credit-Auslastung und keine unnötigen Build-/Fix-Schleifen.
- Bei Lovable-relevanten Arbeitstagen bevorzugt 3–4 Credits für einen eng definierten Umsetzungs-/Preview-Auftrag und 1–2 Credits als echte Korrektur-/Abnahmereserve einplanen.
- BSF-01 verwendet 0 Credits: Architektur- und Scope-Entscheidungen werden in GitHub/ChatGPT getroffen.
- BSF-02 verwendet höchstens 0–1 Credit für Kundenkontext-/UI-Visualisierung; Datenmodell, Auth, RLS und Providergrenzen werden nicht an Lovable delegiert.
- Bevorzugte nächste Lovable-Einsatzfelder sind anschließend `Meine Kunden`, Projektmanager-Leistungssicht, Leistungsnachweis-UI sowie später kontextsensitive Hilfe und Dokumentationszugriff.
- Lovable bleibt Implementierungs-/Preview-Werkzeug; Integration erfolgt über isolierte Variant/Nicht-main-Arbeitsfläche → GitHub-Branch → PR → Required Checks.

## Regel zur Übersicht im Chat

Nach jedem vollständig abgeschlossenen Punkt dieser Liste wird:

1. diese Datei aktualisiert,
2. der abgeschlossene Punkt auf `DONE` gesetzt,
3. der nächste aktive Punkt eindeutig als `IN ARBEIT` bzw. `NÄCHSTER PUNKT` markiert,
4. dem Nutzer im Abschlussbericht die **vollständige aktuelle Liste** erneut gezeigt — einschließlich geplantem Lovable-Einsatz.

## Fachlicher roter Faden

`Kunde → Kundenverantwortung → Projektmanager-Leistungssicht → Teamlead-Leistungsnachweis → Dokumentationskonsolidierung → SYSING-001/TDF → Board-Zugriff auf Dokumentation`

Erst danach wird die bestehende technische BSF-Roadmap ab BSF-04 fortgesetzt, sofern kein neuer priorisierter Befund eine bewusste Planänderung erfordert.
