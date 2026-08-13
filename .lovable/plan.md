# Sprint 09A — Reporting, Corporate Templates, TDF-Ausgabe und Systemhaus-Demodaten

Ausgangsstand: v1.55.0. Ziel: Reporting/Dokumentausgabe MVP-fähig machen und einen reproduzierbaren, vollständig fiktiven Systemhaus-Demo-Datensatz als gemeinsame Testbasis für 09B bereitstellen.

Entschieden (aus Rückfragen): Demo-Daten **lokal + Cloud-AVKK-Seed**, Word **produktiv mit `docx`**, Corporate Template **neutrales Sysing-Default-Theme über Provider-Schnittstelle**.

## Etappen

Der Sprint wird in fünf Etappen gebaut, jede endet lauffähig und getestet.

### Etappe 1 — Gap-Analyse und Report-Architektur

- `docs/REPORTING.md`: Gap-Analyse (IST / SOLL / LÜCKE / MASSNAHME) über bestehende Ausgabe-Pfade (`pdf-export.ts`, `text-export.ts`, `json-export-service.ts`, `export-download-service.ts`, `ComplianceReportPrint`, Technical-Report-Print) und die TDF-Aspekte Struktur, Naming, Versionierung, Managementdarstellung, Rendering, Publishing, Export, Tabellen, Seitenumbrüche, Kopf-/Fußzeilen, AI-Readiness.
- Neuer Ordner `src/lib/report/` mit klaren Schichten, alles providerneutral (kein Supabase-Import unterhalb der Data-Provider):
  - `types.ts` — `ReportDefinition` (reportId, Titel, Beschreibung, Version, Datenquelle, benötigte Permission, Template, Ausgabeformate, Dateinamensschema, Metadaten) und `ReportContext`/`ReportDocument`.
  - `registry.ts` — Registrierung der Definitionen.
  - `facade.ts` — `ReportService.list/preview/render/export`, prüft Permission über `can()` **vor** dem Datenzugriff.
  - `data/` — ReportDataProvider je Report (lokale Datenschicht + AVKK-Service).
  - `templates/` — TemplateProvider-Schnittstelle mit `DefaultTemplateProvider` (Sysing-Theme im Repo: Farben, Kopf-/Fußzeile, Logo-Platzhalter, Seitenzahlen) und `FilesystemTemplateProvider` (Pfad aus Konfiguration/Env, nie hardcodiert; Docker-Volume-tauglich); Fallback auf Default bei fehlender externer Quelle.
  - `renderers/` — `pdf.ts` (jsPDF/autoTable, aus bestehender Logik gehoben), `print.ts`, `json.ts`, `csv.ts`, `docx.ts`.
  - `filename.ts` — TDF-konformes Namensschema inkl. Version und Zeitstempel.
- Bestehende Exporte werden **über** die Fassade verfügbar gemacht, ohne ihr Ausgabeverhalten zu ändern (Regressionstests sichern das ab).

### Etappe 2 — MVP-Reports und Formate

- Reports: `avkk-personal`, `avkk-project-manager`, `avkk-management` (verdichtete Portfoliosicht, ohne personenbezogene Rankings), plus Registrierung der bestehenden Leistungsnachweis-/Compliance-Ausgaben.
- Formate produktiv: PDF, Druck, JSON, CSV, Word (`docx`). Excel wird nicht freigegeben und als geplant dokumentiert.
- Report-Ausgabe landet im bestehenden Downloadbereich (`export-download-service`), Vorschau über die vorhandenen Preview-Dialoge.
- UI: neuer Servicebereich/Dialog „Berichte“ mit Reportauswahl, Formatwahl, Vorschau — enthält keine Renderlogik.

### Etappe 3 — Systemhaus-Demo-Datensatz

- `src/lib/demo-data/` mit versioniertem Datensatz (`DEMO_DATASET_VERSION`), Kennzeichnung aller Objekte über festen Namespace-Präfix (z. B. `demo-` in IDs plus `demo: true`-Marker) und Titelzusatz „(DEMO)“.
- Inhalt: 4–5 fiktive Kunden, die fünf geforderten Projekte (M365-Rollout, Firewall/Netzwerk, Infrastrukturmigration, Backup/Restore, Server-/Storage-Migration), Arbeitspakete, Tätigkeiten, Rollen-/Verantwortungszuordnungen, vollständige AVKK-Fälle mit allen geforderten Situationen (im Plan, gefährdet, kritisch, überfällig, bald fällig, fehlende Zeit/Wissen/Material/Berechtigung/Information, teilweise Unterstützung, hohe Kunden-/Projekt-/Terminkonsequenz) und Reference-Data-Bezügen.
- Seed-Funktionen: `seedLocal()` (Datenschicht) und `seedCloudAvkk()` (AVKK/Reference-Data über bestehenden `AvkkService`, damit RLS und Audit greifen), beide idempotent über die Demo-IDs.
- Cleanup: entfernt ausschließlich Objekte mit Demo-Namespace, kein pauschales DELETE; Produktivdaten werden nie überschrieben oder gelöscht.
- Bedienung im Servicebereich (Admin-Recht) mit Bestätigungsdialog: Erzeugen / Zurücksetzen / Entfernen.

### Etappe 4 — SYSING-001 und Beispielausgaben

- `docs/SYSING-001_...` auf den tatsächlich umgesetzten Stand aktualisieren, strikt getrennt in **UMGESETZT / GEPLANT (Post-MVP) / BEKANNTE GRENZE**; Microsoft Graph, Mailversand, KI-Copilot und Agenten ausschließlich als geplant.
- Dokumentversion anheben (V0.2.0), TDF-Naming synchron halten; PDF- und Word-Fassung aus derselben Quelle über den Report-Service erzeugen.
- Mit Demo-Daten exemplarisch erzeugen: persönlicher AVKK-Report, PM-Report, Management-Report, JSON, CSV, SYSING-001-PDF — visuelle Prüfung jeder Seite (Umlaute, Umbrüche, große Tabellen, leere Datenmengen, keine abgeschnittenen Inhalte).

### Etappe 5 — Tests, Doku, Gates

- Vitest: ReportDefinition-Vertrag, Permission-Prüfung (inkl. Negativfall), Fassade, TemplateProvider-Fallback, Dateinamensbildung, JSON-/CSV-/Word-Renderer, PDF-Grundstruktur (Seitenzahl/Metadaten), Demo-Seed-Idempotenz, Cleanup trifft nur Demo-IDs, Rollen-/Scope-Zuordnung, Nachweis „keine personenbezogenen Rankings“ im Management-Snapshot; Regressionstests bestehender Exporte.
- Doku: `CHANGELOG.md` (v1.56.0), `docs/DEMO-DATA.md`, `docs/SPRINT-09A-MANUAL-ACCEPTANCE.md`, `docs/MVP-PLAN.md`, `docs/DATA-SCHEMA.md`, `docs/CONTRIBUTING.md`, Entwicklungstagebuch, `src/lib/help-documentation.ts`.
- ADR: nach Prüfung des Index (`docs/ADR/` endet bei 0027, `docs/adr/` bei ADR-0019) wird **ADR-0028 „Report-Service, ReportDefinition und Template-Provider“** angelegt — inkl. TDF als Referenz statt Laufzeitabhängigkeit, Docker-/Filesystem-Konfiguration, spätere SharePoint-Erweiterung und verworfene Alternativen.
- `docs/PROJECT-STATUS.yaml`: Version, Gates, Sprint 09A nach `completedSprints`. Achtung: die Roadmap enthält bereits eine ID `09A` mit anderem Inhalt („AVKK-Kontextindikatoren“) — dieser Eintrag wird auf eine freie ID (09C) umgenummert, sonst schlägt `project-status:check` durch Doppelbelegung fehl.
- Gates: `test`, `typecheck`, `lint`, `format`, `docs:check`, `project-status:check`, `rbac:check`, `lint:no-console`, `build`, `test:security`, `test:debt`, technischer Prüfbericht neu erzeugen. Keine Gate-Abschwächung; verbleibende Punkte werden als bewertete Findings dokumentiert.

## Technische Hinweise

- Neue Abhängigkeit: `docx` (reines JS, Worker-verträglich, nur clientseitig genutzt).
- Kein Microsoft Graph, Entra ID, Azure oder KI in diesem Sprint; keine neue Kontextdatenerhebung.
- `listDossiers()`-Skalierungsgrenze bleibt dokumentiert; Optimierung nur bei reproduzierbarem Messwert mit Demo-Daten.
- Keine Secrets, Tokens oder echten Kundendaten in Code, Doku oder Demo-Datensatz.

## Abschluss

Zum Sprintende folgt der geforderte Abschlussbericht (Umgesetzt, Reportformate, Demo-Datensatz, TDF/SYSING-001, Tests/Gates, Findings) plus kritische MVP-Reifegradbewertung und Prognose für 09B.
