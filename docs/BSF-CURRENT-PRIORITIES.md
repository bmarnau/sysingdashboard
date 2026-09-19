# Sysing Dashboard — aktuelle BSF-Prioritäten

Stand: 2026-09-19  
Status: operative Prioritätenliste für den täglichen Wiederanlauf  
Strategische Grundlage: `docs/GESAMTPLAN-SYSING-DASHBOARD.md`  
Interne Neuplanung: `docs/BSF-INTERNAL-KIOSK-FIRST-ROADMAP.md`  
Operative Detailplanung: `docs/SPRINT-PLAN-MVP-BSF.md`  
Golden-Dataset-Vertrag: `docs/GOLDEN-DATASET-STRATEGY.md`  
Dauerhafter Wiederanlaufpunkt: Issue #35

## Zweck

Diese Datei ist die kompakte operative Source of Truth für den laufenden BSF-Ausbau. Historische, datierte Abschlussdokumente werden nicht rückwirkend umgeschrieben. Die interne Kiosk-first-Roadmap konkretisiert die Reihenfolge für die noch offenen internen Aufgaben. GDS-01 / #142 ist ein verbindlicher Querschnittsbaustein und verändert die Sprintfolge nicht.

## Aktueller Stand

### BSF-02 / BSF-02C — DONE

Der minimale gemeinsame Mehrbenutzer-Daten-/Read-Pfad ist vollständig abgeschlossen.

Verbindlicher fachlicher Pfad:

`Customer → Project → WorkPackage → Activity → Leistungserbringer`

### BSF-03 — DONE

Kundenverantwortung, `Meine Kunden` und die getrennte Managementsicht sind abgeschlossen. Customer Responsibility bleibt fachliche Beziehung/Scope und keine globale Rolle.

### BSF-03D — DONE

Issue #103 ist geschlossen. Arbeitspaket-Kategorien sind als optionale systemhausweite Stammdaten umgesetzt. Der Merge liegt auf `main`; Post-Merge Security, vollständige CI, E2E, Accessibility, Technical Debt sowie Technical Report & Quality Gate sind PASS.

### BSF-KIOSK-01 / #135 — DONE

Der Info-Kiosk-Demo-Pilot ist mit PR #141 nach `main` integriert. Post-Merge Security #849 und CI #855 sind PASS. Abschlussnachweis: `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md`.

### GDS-01 / #142 — V1 IMPLEMENTIERT UND IN BSF-03A VERANKERT

Der Goldene Datensatz V1 ist die versionierte, vollständig synthetische und deterministische Referenzbasis für BSF-03A:

- `schemaVersion = sysing.golden.v1`,
- `datasetVersion = 1.0.0`,
- Referenzzeit `2026-09-14T00:00:00Z`,
- 2 Kunden, 3 Projekte, 5 Arbeitspakete, 8 Tätigkeiten,
- 25.0 h gesamt, 20.0 h billable, 5.0 h non-billable, 80.0 % Billable-Quote.

Golden-Validator und unabhängige Project-Controlling-Expected-Results sind im BSF-03A-Gate PASS.

### BSF-03A / #106 — DONE

PR #144 ist auf `main` integriert. Finaler Feature-Head `763cf874b9f5bb8fadbd2875d7e11f0bd7165361`; Merge-Commit `b9aef5aa9b3174f2abd022e11d492190102933a4`.

- finale Lovable-/Exact-Tree-Abnahme: **PASS**,
- Golden Dataset und gezielte 66 Project-Controlling-Tests: **PASS**,
- 1920×1080 / 1366×768, Runtime/Network/read-only UI: **PASS**,
- Post-Merge Security #990: **PASS**,
- Post-Merge CI #996 / Technical Report & Quality Gate: **PASS**,
- Issue #106: **CLOSED / COMPLETED**.

### BSF-KIOSK-02 / #136 — CURRENT

KIOSK-02 bindet den bestehenden Kiosk ohne UI-Neubau an den internen, serverseitig abgesicherten BSF-03A-Read-/Controlling-Vertrag an. Der Implementierungsvertrag ist geprüft; Umsetzung startet TDD-first auf aktuellem `main`.


## Kiosk-first- und Golden-Dataset-Regel

Der Info-Kiosk soll so früh wie möglich sichtbar funktionieren, ohne spätere Architektur vorwegzunehmen. Gleichzeitig wird die Fachsemantik schrittweise über den Goldenen Datensatz reproduzierbar abgesichert.

Früher Pfad:

`BSF-KIOSK-01 Demo → BSF-03A + GDS-01 V1 → BSF-KIOSK-02 interner Read-Provider → BSF-03B → BSF-03E → BSF-07 → BSF-KIOSK-03`

Kiosk-Grundregeln:

- read-only,
- Demo-/Mock-Daten zuerst,
- Demo klar gekennzeichnet,
- eigene Providergrenze (`KioskDataProvider`),
- keine eigene Kiosk-Datenbank,
- kein zweites Fachmodell,
- keine Auth-/RBAC-/RLS-Umgehung,
- keine produktive Graph-/SharePoint-/Exchange-/PRTG-/MCP-/Agenten-Abhängigkeit,
- spätere interne Echt-Daten über bestehende Read-/Projection-Verträge.

Golden-Dataset-Grundregeln:

- ausschließlich synthetisch,
- stabile IDs/Keys und feste Zeitbasis,
- Expected Results explizit und unabhängig von der Produktionsimplementierung,
- keine automatische Aktualisierung von Expected Results bei Testfehlern,
- providerneutral,
- keine produktive Datenquelle,
- Demo, interne Provider und spätere Provider teilen dieselbe Fachdefinition für vergleichbare Kennzahlen.

## Verbindliche operative Reihenfolge

1. **BSF-02 / BSF-02C — DONE**
2. **BSF-03 — DONE**
3. **BSF-03D / #103 — DONE**
4. **BSF-KIOSK-01 / #135 — DONE**
5. **BSF-03A / #106 — DONE**
6. **BSF-KIOSK-02 / #136 — CURRENT**
7. **BSF-03B / #107 — GEPLANT; Golden Expected Result Leistungsnachweis ergänzen**
8. **BSF-03E / #63 — GEPLANT**
9. **BSF-07 / #140 — VORGEZOGEN / GEPLANT**
10. **BSF-KIOSK-03 / #137 — GEPLANT**
11. **BSF-03C / #98 — GEPLANT**
12. **BSF-DOC-01 — GEPLANT**
13. **BSF-DOC-02 — GEPLANT**
14. **BSF-DOC-03 — GEPLANT**
15. **BSF-04 / #108 — GEPLANT**
16. **BSF-04A / #102 — GEPLANT**
17. **BSF-05A / #138 — Canonical Import Model intern; Golden-Semantik erhalten**
18. **BSF-06 / #121 — Betreiberhoheit/Docker/Installierbarkeit — GEPLANT**
19. **BSF-09 — Reporting 2; Golden Reporting Expected Results — GEPLANT**
20. **BSF-FINAL-INTERNAL — Golden-Regression als formales Gate — GEPLANT**
21. **INTEGRATION-READINESS — GEPLANT**
22. **danach externe Integrationen/MCP/Agenten/NAVIS**

GDS-01 / #142 läuft quer zu dieser Reihenfolge und wird nicht als zusätzliche Nummer eingeschoben.

BSF-10 KI-/Agenten-Labor ist nicht mehr zwingender Bestandteil des internen Hauptpfads vor `BSF-FINAL-INTERNAL`.

## Kurzverträge der nächsten Schritte

### BSF-KIOSK-01 — Info-Kiosk Demo-Pilot

- Kiosk-/Wallboard-Route,
- Großmonitor-/Vollbildlayout,
- Demo-/Mock-Daten,
- Bereiche Projekte, Arbeitspakete, Tätigkeiten, Infrastruktur, Support-Postfach und datensparsame Abwesenheit/Verfügbarkeit,
- Datenstand/Refresh,
- Empty/Error/Unknown-Zustände,
- keine produktive externe Schnittstelle,
- `KioskDataProvider` als austauschbare Grenze,
- bestehender `kiosk-demo-dataset-v1.json` bleibt KIOSK-01-Kompatibilitätsfixture und wird nicht still auf Golden-V1-Werte umgeschrieben.

### GDS-01 — Goldener Datensatz (#142)

- `sysing.golden.v1` / Dataset `1.0.0`,
- feste Referenzzeit und stabile synthetische IDs,
- kanonische Systemhouse-/Customer-/Project-/WorkPackage-/Activity-/Reference-Data-Fixtures,
- unabhängige Expected Results,
- negative Scope-/Integritätsfixtures,
- CI-Validator,
- spätere additive Expected Results statt Kopien des gesamten Datensatzes.

### BSF-03A — Projektmanager-Leistungssicht (#106)

- read-only,
- Zeitraum, Kunde, Projekt, Arbeitspaket, AP-Kategorie, billable/non-billable,
- Summen und Drill-down,
- vorhandenen Shared-Projection-Pfad erweitern,
- serverseitiger Customer-/Project-Scope,
- keine Teamlead-Finalisierung,
- Golden V1 als verbindliche Regression für Aggregation, Filter, Trend und Drill-down.

### BSF-KIOSK-02 — internes Read-Modell

- erster interner Read-Provider hinter derselben Kiosk-Schnittstelle,
- Shared Projection/Customer Scope wiederverwenden,
- `categoryKey` als reguläre Dimension,
- Demo-Provider bleibt für technische Kiosk-Sessions, Tests und Schulung,
- technische `kiosk`-Rolle bleibt exklusiv auf `kiosk.view`; interne Leistungsdaten laufen nur in normalen Leitungs-Sessions über `project.controlling.view`,
- fehlende **interne** Quellen werden `unavailable/unknown`; nur die ausdrücklich als Demo definierten Domänen bleiben Demo,
- vergleichbare interne KPIs gegen `expected/kiosk-summary.json` prüfen,
- kein zweiter KPI-/Stundenvertrag.

### BSF-03B — Leistungsnachweis Teamlead V1

- Leistungsnachweis, keine Rechnung,
- Kunde + Zeitraum,
- billable/non-billable gemeinsam sichtbar,
- Teamlead darf vor Finalisierung ändern,
- unveränderbarer finaler Snapshot,
- Doppelverwendung verhindern,
- Audit/Korrekturpfad,
- Kundenausgabe ohne automatische Nennung des Leistungserbringers,
- Golden Dataset additiv um `expected/performance-statement.json` erweitern.

### BSF-03E — Vertretungs- und Personensicht

- Customer Responsibility, Project Responsibility und Vertretung getrennt halten,
- auditierbare Änderungen,
- keine Gesundheitsdaten,
- vorhandene Responsibility-Logik wiederverwenden.

### BSF-07 — Managementcockpit 2, vorgezogen

- fachliche Führungs-/Arbeitssichten definieren,
- Systemingenieur, Kundenverantwortlicher, Projektmanager, Teamlead, Administration/Führung,
- Customer-/Projekt-/Leistung-/AVKK-Kontext,
- read/write serverseitig getrennt,
- reproduzierbare Managementkennzahlen sollen auf bereits golden-geprüften Fachverträgen aufbauen.

### BSF-KIOSK-03 — Management-Kiosk

- passive read-only Präsentationsschicht für freigegebene Managementdaten,
- Managementcockpit definiert Semantik, nicht die Kiosk-UI,
- Datenminimierung für Großbildbetrieb,
- keine neue Berechtigungslogik.

### BSF-05A — Canonical Import Model intern

- providerneutrale Schema-/Importverträge,
- partielle Daten, Provenienz, Freshness, Matching, Unknown-Semantik,
- lokale Beispiele und Tests,
- Golden V1 muss reproduzierbar normalisiert werden können, ohne semantischen Drift,
- keine produktive externe Verbindung.

### BSF-09 / BSF-FINAL-INTERNAL

- Reporting ergänzt `expected/reporting.json`,
- fachlich gleiche Referenzwerte über Reporting-/Providerpfade,
- vollständige Golden-Regression ist Pflicht-Gate von `BSF-FINAL-INTERNAL`.

## Externe Themen bewusst später

Nicht Teil des zwingenden internen Hauptpfads bis `BSF-FINAL-INTERNAL`:

- produktiver Microsoft Graph,
- produktiver SharePoint-/Exchange-/PRTG-Zugriff,
- MCP,
- NAVIS/Agenten,
- autonome KI-Aktionen,
- externer Producer als Laufzeitabhängigkeit.

Issue #123 und Draft-PR #124 bleiben als externe Wallboard-/Contract-Vorarbeit erhalten, bestimmen aber nicht die Reihenfolge des internen Kiosk-Piloten.

## Lovable-/Werkzeugsteuerung

Lovable gezielt für sichtbare UI-/Preview-Aufgaben:

- **hoch:** BSF-KIOSK-01, BSF-07, BSF-KIOSK-03,
- **mittel/gezielt:** BSF-03A, KIOSK-02, BSF-03B, BSF-03E, BSF-03C, BSF-09,
- **0 bzw. gering:** GDS-01-Kern, BSF-DOC-02, BSF-04, BSF-05A, BSF-06.

Lovable darf Golden Fixtures verwenden und prüfen, aber fachliche Expected Results nicht selbständig umdefinieren. Credits werden nicht künstlich verbraucht. Architektur, Golden-Dataset-Vertrag, Security, Git und CI bleiben bei den dafür geeigneten Werkzeugen.

## Definition of Done ab BSF

Ein Fachpunkt ist erst DONE, wenn neben Code und Tests alle betroffenen Evidenz-/Dokumentationsflächen aktuell sind:

- technische Dokumentation,
- kontextsensitive Hilfe / Benutzerhandbuch, sofern UI oder Bedienung betroffen ist,
- Entwicklungstagebuch bzw. Abschlussnachweis,
- `docs/CURRENT-STATUS.md`, soweit betroffen,
- `docs/PROJECT-STATUS.yaml`, soweit betroffen,
- technischer Prüfbericht / CI-Quality-Gate-Evidenz,
- Security-/RBAC-/RLS-Nachweise,
- SYSING-001 ab seiner BSF-Fortschreibung,
- bei durch GDS-01 abgedeckter Fachsemantik: Golden-Dataset-Version und Expected-Result-Gate dokumentiert und PASS,
- vollständige Required Checks auf dem Exact Head.

Golden Expected Results werden niemals nur deshalb geändert, weil Produktionscode einen Test nicht erfüllt. Jede Änderung benötigt einen fachlich nachvollziehbaren Reviewgrund und eine kontrollierte Dataset-Versionierung.

## Architekturhinweis

Die fachliche Customer-Identität bleibt:

`(systemhouseId, customerId)`

`systemhouseId` ist providerneutral und nicht Microsoft Tenant ID. Eine spätere Entra-/Azure-Zuordnung ist Provider-/Mappinginformation und verändert den fachlichen Primärscope nicht.

Der Golden Dataset verwendet dieselbe fachliche Identitätslogik, aber ausschließlich synthetische Referenz-IDs.

## Fachlicher roter Faden

`BSF-03D DONE → KIOSK-01 DONE → BSF-03A DONE → KIOSK-02 CURRENT → BSF-03B → BSF-03E → BSF-07 → KIOSK-03 → BSF-03C → DOC-01/02/03 → BSF-04 → BSF-04A → BSF-05A → BSF-06 → BSF-09 → BSF-FINAL-INTERNAL + Golden-Regression → INTEGRATION-READINESS → externe Integrationen/MCP/Agenten`
