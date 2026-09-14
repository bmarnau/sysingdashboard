# Sysing Dashboard — aktuelle BSF-Prioritäten

Stand: 2026-09-14  
Status: operative Prioritätenliste für den täglichen Wiederanlauf  
Strategische Grundlage: `docs/GESAMTPLAN-SYSING-DASHBOARD.md`  
Interne Neuplanung: `docs/BSF-INTERNAL-KIOSK-FIRST-ROADMAP.md`  
Operative Detailplanung: `docs/SPRINT-PLAN-MVP-BSF.md`  
Dauerhafter Wiederanlaufpunkt: Issue #35

## Zweck

Diese Datei ist die kompakte operative Source of Truth für den laufenden BSF-Ausbau. Historische, datierte Abschlussdokumente werden nicht rückwirkend umgeschrieben. Die interne Kiosk-first-Roadmap konkretisiert und ersetzt nach Merge die ältere Reihenfolge für die noch offenen internen Aufgaben.

## Aktueller Stand

### BSF-02 / BSF-02C — DONE

Der minimale gemeinsame Mehrbenutzer-Daten-/Read-Pfad ist vollständig abgeschlossen.

Verbindlicher fachlicher Pfad:

`Customer → Project → WorkPackage → Activity → Leistungserbringer`

### BSF-03 — DONE

Kundenverantwortung, `Meine Kunden` und die getrennte Managementsicht sind abgeschlossen. Customer Responsibility bleibt fachliche Beziehung/Scope und keine globale Rolle.

### BSF-03D — DONE

Issue #103 ist geschlossen. Arbeitspaket-Kategorien sind als optionale systemhausweite Stammdaten umgesetzt. Der Merge liegt auf `main`; Post-Merge Security, vollständige CI, E2E, Accessibility, Technical Debt sowie Technical Report & Quality Gate sind PASS.

### BSF-KIOSK-01 / #135 — IMPLEMENTIERT / FINALABNAHME AUSSTEHEND

Der Info-Kiosk-Demo-Pilot ist auf Draft-PR #141 implementiert. Der geprüfte Implementierungs-Head `8a672ef9260a1a467be1884724e82813b4e98c1b` hat Security #760 und CI #766 einschließlich Playwright E2E, Accessibility, Technical Debt sowie Technical Report & Quality Gate vollständig PASS.

Offen vor FINAL PASS/DONE bleiben der offizielle read-only Supabase-Security-Advisor-Vergleich gegen die bekannte SEC-01-Baseline und gegebenenfalls ein gezielter Runtime-/Preview-Retest in der Lovable-Referenzumgebung. Kein Merge oder Deploy ist erfolgt. Abschlussnachweis: `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md`.

### BSF-03A / #106 — READY / NEXT-FACHSCOPE

Die Projektmanager-Leistungssicht ist nach formaler KIOSK-01-Endabnahme der nächste fachliche Datensprint.

## Neue Kiosk-first-Regel

Der Info-Kiosk soll so früh wie möglich sichtbar funktionieren, ohne spätere Architektur vorwegzunehmen.

Früher Pfad:

`BSF-KIOSK-01 Demo → BSF-03A → BSF-KIOSK-02 interner Read-Provider → BSF-03B → BSF-03E → BSF-07 → BSF-KIOSK-03`

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

## Verbindliche operative Reihenfolge

1. **BSF-02 / BSF-02C — DONE**
2. **BSF-03 — DONE**
3. **BSF-03D / #103 — DONE**
4. **BSF-KIOSK-01 / #135 — IMPLEMENTIERT / FINALABNAHME AUSSTEHEND**
5. **BSF-03A / #106 — READY / NEXT-FACHSCOPE**
6. **BSF-KIOSK-02 — GEPLANT**
7. **BSF-03B / #107 — GEPLANT**
8. **BSF-03E / #63 — GEPLANT**
9. **BSF-07 — VORGEZOGEN / GEPLANT**
10. **BSF-KIOSK-03 — GEPLANT**
11. **BSF-03C / #98 — GEPLANT**
12. **BSF-DOC-01 — GEPLANT**
13. **BSF-DOC-02 — GEPLANT**
14. **BSF-DOC-03 — GEPLANT**
15. **BSF-04 / #108 — GEPLANT**
16. **BSF-04A / #102 — GEPLANT**
17. **BSF-05A — Canonical Import Model intern — GEPLANT**
18. **BSF-06 — Betreiberhoheit/Docker/Installierbarkeit — GEPLANT**
19. **BSF-09 — Reporting 2 — GEPLANT**
20. **BSF-FINAL-INTERNAL — GEPLANT**
21. **INTEGRATION-READINESS — GEPLANT**
22. **danach externe Integrationen/MCP/Agenten/NAVIS**

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
- `KioskDataProvider` als austauschbare Grenze.

### BSF-03A — Projektmanager-Leistungssicht (#106)

- read-only,
- Zeitraum, Kunde, Projekt, Arbeitspaket, AP-Kategorie, billable/non-billable,
- Summen und Drill-down,
- vorhandenen Shared-Projection-Pfad erweitern,
- serverseitiger Customer-/Project-Scope,
- keine Teamlead-Finalisierung.

### BSF-KIOSK-02 — internes Read-Modell

- erster interner Read-Provider hinter derselben Kiosk-Schnittstelle,
- Shared Projection/Customer Scope wiederverwenden,
- `categoryKey` als reguläre Dimension,
- Demo-Provider bleibt für Tests und Schulung,
- fehlende interne Quellen bleiben Demo oder `unknown` statt erfundener Echtwerte.

### BSF-03B — Leistungsnachweis Teamlead V1

- Leistungsnachweis, keine Rechnung,
- Kunde + Zeitraum,
- billable/non-billable gemeinsam sichtbar,
- Teamlead darf vor Finalisierung ändern,
- unveränderbarer finaler Snapshot,
- Doppelverwendung verhindern,
- Audit/Korrekturpfad,
- Kundenausgabe ohne automatische Nennung des Leistungserbringers.

### BSF-03E — Vertretungs- und Personensicht

- Customer Responsibility, Project Responsibility und Vertretung getrennt halten,
- auditierbare Änderungen,
- keine Gesundheitsdaten,
- vorhandene Responsibility-Logik wiederverwenden.

### BSF-07 — Managementcockpit 2, vorgezogen

- fachliche Führungs-/Arbeitssichten definieren,
- Systemingenieur, Kundenverantwortlicher, Projektmanager, Teamlead, Administration/Führung,
- Customer-/Projekt-/Leistung-/AVKK-Kontext,
- read/write serverseitig getrennt.

### BSF-KIOSK-03 — Management-Kiosk

- passive read-only Präsentationsschicht für freigegebene Managementdaten,
- Managementcockpit definiert Semantik, nicht die Kiosk-UI,
- Datenminimierung für Großbildbetrieb,
- keine neue Berechtigungslogik.

### BSF-05A — Canonical Import Model intern

- providerneutrale Schema-/Importverträge,
- partielle Daten, Provenienz, Freshness, Matching, Unknown-Semantik,
- lokale Beispiele und Tests,
- keine produktive externe Verbindung.

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
- **0 bzw. gering:** BSF-DOC-02, BSF-04, BSF-05A, BSF-06.

Credits werden nicht künstlich verbraucht. Architektur, Security, Git und CI bleiben bei den dafür geeigneten Werkzeugen.

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
- vollständige Required Checks auf dem Exact Head.

## Architekturhinweis

Die fachliche Customer-Identität bleibt:

`(systemhouseId, customerId)`

`systemhouseId` ist providerneutral und nicht Microsoft Tenant ID. Eine spätere Entra-/Azure-Zuordnung ist Provider-/Mappinginformation und verändert den fachlichen Primärscope nicht.

## Fachlicher roter Faden

`BSF-03D DONE → KIOSK-01 FINALABNAHME → BSF-03A → KIOSK-02 → BSF-03B → BSF-03E → BSF-07 → KIOSK-03 → BSF-03C → DOC-01/02/03 → BSF-04 → BSF-04A → BSF-05A → BSF-06 → BSF-09 → BSF-FINAL-INTERNAL → INTEGRATION-READINESS → externe Integrationen/MCP/Agenten`
