# Sysing Dashboard — aktuelle BSF-Prioritäten

Stand: 2026-09-16  
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

### BSF-KIOSK-01 / #135 — IMPLEMENTIERT / ZIELMIGRATION ANGEWENDET / FINALABNAHME OFFEN

Der Info-Kiosk-Demo-Pilot ist auf Draft-PR #141 implementiert. Der vollständige Kiosk-Migrationssatz wurde nach ausdrücklicher Freigabe am 2026-09-16 kontrolliert auf die verbundene Sysingdashboard-Zieldatenbank angewendet.

Aktueller code-tragender Exact Head vor der laufenden Dokumentationssynchronisierung:

`2e9eaf126618296d5514c02aabea6e81aed1b16d`

Nachweise auf exakt diesem Head:

- Security #788 / Run `35062168459`: **PASS**
- CI #794 / Run `35062168406`: **PASS**
- Static / Prettier / ESLint / TypeScript / RBAC-Matrix / Docs / Projektmanifest: **PASS**
- Database Schema Drift mit vollständigem Migration-Rebuild und Kiosk-DB-Vertrag T00–T05: **PASS**
- Unit & Components: **118 Testdateien / 824 Tests PASS / 4 TODO**
- Backend, API, RBAC & Security, Import/Export, Backup/Restore und Production Build: **PASS**
- Playwright E2E, Accessibility, Technical Debt sowie Technical Report & Quality Gate: **PASS**
- frühere branch-genaue Lovable Runtime-/Visual-Prüfung des Kiosk-Implementierungsstands: **PASS**

Zusätzliche Endabnahmebefunde wurden vor dem ersten Kiosk-Betrieb behoben:

- `public.has_permission(uuid,text)` wäre durch die ursprüngliche Kiosk-Migration unbeabsichtigt `SECURITY DEFINER` geworden. T00 reproduzierte den Fehler; die forward-only Migration `20260916052000_bsf_kiosk_01_preserve_permission_security_invoker.sql` stellt den bestehenden `SECURITY INVOKER`-Vertrag sicher.
- Die reale Admin-Provisionierung hätte wegen der automatisch vergebenen Bootstrap-Rolle `viewer` am Kiosk-Exklusivitätstrigger scheitern können. RED-Test `128e59e...`, GREEN-Fix `2e9eaf...`; die Provisionierung ersetzt ausschließlich den erwarteten `viewer`-Bootstrapzustand und bricht bei jeder Abweichung fail-closed ab.

Read-only Zielnachweis nach der kontrollierten Migration:

- Rolle `kiosk`: **vorhanden**,
- `public.enforce_kiosk_role_exclusive()`: **vorhanden**,
- Exklusivitäts-Trigger auf `public.user_roles`: **vorhanden**,
- `public.has_permission(uuid,text)`: weiterhin **SECURITY INVOKER** (`prosecdef=false`).

Der frühere Connector-Mismatch bleibt nur eine Werkzeuggrenze: Der direkt verfügbare Supabase-Connector zeigt nicht auf die maßgebliche Sysingdashboard-Zielinstanz und wird deshalb nicht für den formalen Advisor-Nachweis verwendet. Er blockiert die bereits ausgeführte Zielmigration nicht mehr.

Vor FINAL PASS/DONE sind noch zwei externe Abnahmen erforderlich:

1. offiziellen **Post-Migration Security Advisor** auf genau der migrierten Sysingdashboard-Zielumgebung read-only ausführen und keine neuen Findings gegenüber der dokumentierten SEC-01-Baseline nachweisen,
2. aktuellen Exact Head im Lovable-Feature-Branch read-only verifizieren und den Preview für Login, `/kiosk`, Admin-Provisionierung, Demo-Daten, Logout, Full-HD und Runtime-Fehlerfreiheit abnehmen.

PR #141 bleibt Draft. Kein Merge und kein Publish/Deploy ist erfolgt. Abschlussnachweis: `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md`.

### GDS-01 / #142 — VERBINDLICH GEPLANTER QUERSCHNITTSBAUSTEIN

Der **Goldene Datensatz** wird als versionierte, vollständig synthetische und deterministische fachliche Referenzbasis eingeführt.

Verbindliche Planung:

- Strategie: `docs/GOLDEN-DATASET-STRATEGY.md`
- Implementation Plan: `docs/superpowers/plans/2026-09-15-golden-dataset-foundation.md`
- Tracking: Issue #142
- Schema V1: `sysing.golden.v1`
- Dataset V1: `1.0.0`
- feste Referenzzeit: `2026-09-14T00:00:00Z`
- Kernreferenz BSF-03A: 2 Kunden, 3 Projekte, 5 Arbeitspakete, 8 Tätigkeiten, 25.0 h gesamt, 20.0 h billable, 5.0 h non-billable, 80.0 % Billable-Quote.

GDS-01 ist **kein neuer Hauptsprint**. KIOSK-01 wird nicht rückwirkend erweitert. Die erste echte Golden-Dataset-Version wird als Test-/Referenzbaustein innerhalb von BSF-03A umgesetzt und danach additiv in KIOSK-02, BSF-03B, BSF-05A, BSF-09 und BSF-FINAL-INTERNAL verwendet.

### BSF-03A / #106 — READY / NEXT-FACHSCOPE

Die Projektmanager-Leistungssicht ist nach formaler KIOSK-01-Endabnahme der nächste fachliche Datensprint. Sie wird nicht vorgezogen, solange Post-Migration-Advisor und aktueller Lovable-Exact-Head-Preview von KIOSK-01 offen sind.

BSF-03A startet mit GDS-01 V1 als reproduzierbarer Testbasis. Controlling-Summen, Filter, Trend und Drill-down müssen gegen unabhängige Golden Expected Results PASS sein.

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
4. **BSF-KIOSK-01 / #135 — IMPLEMENTIERT / ZIELMIGRATION PASS / POST-MIGRATION-ADVISOR + LOVABLE-EXACT-HEAD-PREVIEW OFFEN**
5. **BSF-03A / #106 — READY / NEXT-FACHSCOPE NACH KIOSK-01; START MIT GDS-01 V1**
6. **BSF-KIOSK-02 / #136 — GEPLANT; Golden-Vergleich für interne KPIs**
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
- Demo-Provider bleibt für Tests und Schulung,
- fehlende interne Quellen bleiben Demo oder `unknown` statt erfundener Echtwerte,
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

`BSF-03D DONE → KIOSK-01 ZIELMIGRATION PASS → KIOSK-01 POST-MIGRATION-ADVISOR + LOVABLE-EXACT-HEAD-PREVIEW → KIOSK-01 FINAL PASS → BSF-03A + GDS-01 V1 → KIOSK-02 → BSF-03B → BSF-03E → BSF-07 → KIOSK-03 → BSF-03C → DOC-01/02/03 → BSF-04 → BSF-04A → BSF-05A → BSF-06 → BSF-09 → BSF-FINAL-INTERNAL + Golden-Regression → INTEGRATION-READINESS → externe Integrationen/MCP/Agenten`
