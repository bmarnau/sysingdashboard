# Sprint 06B – Project Governance, Architekturkonsolidierung und Project Manifest

Ziel: technische Plattform abschließen — verbindliche Governance, ein validiertes Project Manifest, saubere Layer-Trennung und eine warnungsfreie Dokumentationsprüfung. Keine fachlichen AVKK-Funktionen.

Verifizierter Ausgangsstand (soeben geprüft):
- `docs/PROJECT-STATUS.yaml` existiert (409 Zeilen, `schemaVersion: 1.1.0`, Stand 2026-08-04) — es fehlen JSON-Schema und Validator.
- `docs/ARCHITECTURE.md` existiert (142 Zeilen, Stand 2026-07-08) und ist inhaltlich veraltet (nennt „Aktuell keine Auth", kein Supabase/RBAC/RLS/Backup-2.0, keine Zielarchitektur).
- `docs:check` meldet 10 nicht dokumentierte Dialoge: ImportPreviewDialog, PdfPreviewDialog, SaveTargetDialog, TechnicalReportDialog, TextPreviewDialog, UserManualDialog, WorkingTimeModelsDialog, AzureConfirmDialog, AzureDataDialog, AzureImportPreviewDialog.
- Layer-Finding `td-layer-d1e551ce`: `src/routes/_authenticated/dashboard.tsx:92` importiert `@/lib/store/dashboard-persistence` und ruft in einem `useEffect` genau eine Funktion auf: `initDashboardPersistence()`.

## A – Project Governance

Neu: `docs/PROJECT-GOVERNANCE.md` mit Vision, Entwicklungs- und Architekturprinzipien, Trennung Fachlogik/Infrastruktur, dem Ablauf Analyse → Umsetzung → Test → Dokumentation, Definition of Done, Dokumentations-, Qualitäts-, Sicherheits- und Versionierungsstrategie, Sprint-Governance sowie einer Tabelle „Rolle jedes Projektdokuments" (CHANGELOG, PROJECT-STATUS.yaml, ADRs, Architektur, Tagebuch, Prüfbericht, Handbuch).

## B – Project Manifest

Neu: `docs/PROJECT-STATUS.md` — beschreibt `PROJECT-STATUS.yaml` als verbindliche Single Source of Truth: Aufbau, Schemafelder, Pflegeprozess, Versionierung des Schemas, Beispiele, Erweiterbarkeitsregeln und die Nutzung durch Lovable, ChatGPT, Codex, GitHub Actions und künftige KI-Agenten.

## C – Schema und Validator

- Neu: `docs/project-status.schema.json` (JSON Schema Draft 2020-12) — Pflichtfelder, erlaubte Statuswerte, ID-Muster, Referenzstruktur.
- Neu: `scripts/project-status/check.mjs`, eingebunden als `bun run project-status:check`. Prüft: YAML parst, Schema erfüllt, `project.version` gegen oberste CHANGELOG-Version, aktueller Sprint konsistent, Roadmap-Einträge vollständig, doppelte IDs, unaufgelöste Referenzen (z. B. Backlog → Sprint, Risiko → Roadmap), Pflichtfelder, Statuswerte. Exit-Code ≠ 0 bei Fehlern, Warnungen getrennt ausgewiesen.
- YAML-Parser: `yaml` als devDependency (klein, keine Node-Only-Bindings) — kein eigener Parser.

## D – CI

`.github/workflows/ci.yml`, Job `static`: neuer Schritt „Project status check" (`bun run project-status:check`) nach dem Docs-Sync-Check. Fehler brechen den Build ab. Zusätzlich in `test:full` aufnehmen.

## E – Architekturübersicht

`docs/ARCHITECTURE.md` wird auf den Ist-Stand 1.49.0 neu geschrieben: Gesamtsystem, Schichtenmodell (React → Hooks/Facades → Services → Repository → Persistenz/Supabase), Supabase-Auth, RBAC/RLS, Backup 2.0, Correlation/Logging, sowie klar als **geplant** markierte Abschnitte Report-Service, Reference Data, AVKK, Docker, Azure-Zielarchitektur, Microsoft 365, KI-Agenten. Der Layer-Vertrag aus Teil G wird hier verbindlich festgehalten.

## F – Dokumentationsqualität

Für alle 10 gemeldeten Dialoge: Produktivnutzung prüfen (Aufrufpfad im Dashboard/ServiceMenu), dann je Dialog ein Handbuchabschnitt in `src/lib/help-documentation.ts` mit Zweck, Funktion, Berechtigung, Eingaben, Ergebnissen. Dialoge ohne produktiven Aufrufpfad werden nicht heimlich versteckt, sondern im Handbuch als intern/technisch gekennzeichnet und im Abschlussbericht benannt. Ziel: `docs:check` ohne Warnungen — ohne die Heuristik im Prüfskript aufzuweichen.

## G – Layer-Architektur (`td-layer-d1e551ce`)

Der Direktimport ist genau ein Init-Aufruf. Lösung ohne Verhaltensänderung:
- Neuer Facade-Hook `src/hooks/useDashboardPersistence.ts` (oder Export über `@/lib/store/useDashboardStore`), der `initDashboardPersistence()` einmalig kapselt.
- `dashboard.tsx` importiert nur noch die Store-Facade; der Persistenz-Import entfällt.
- Keine neue Zyklizität: Hook → Persistenz → Store ist gerichtet; wird per `test:debt` (cyclic-deps) und Typecheck belegt.
- Entscheidung in ARCHITECTURE.md dokumentieren; ADR nur, falls die Facade eine echte Alternative verdrängt — sonst Verweis genügt. Danach `bun run test:debt` neu erzeugen und den Wegfall des Findings nachweisen.

## H + I – Qualitätsregeln und Dokumentation

- `docs/PROJECT-STATUS.yaml` aktualisieren: Version, aktueller Sprint 06B, Roadmap, Risiken, Tests, Release, bekannte Einschränkungen, Backlog, technische Schulden. Die Pflicht „nach jedem Sprint aktualisieren" wird in Governance und `docs/CONTRIBUTING.md` verankert.
- Aktualisieren: `README.md`, `CHANGELOG.md` (neue Version **1.49.0**), `docs/ENTWICKLUNGSTAGEBUCH.md`, `src/lib/help-documentation.ts`, technischer Prüfbericht (`bun run report:technical`).

## J – Tests

- Neu: `src/__tests__/docs/project-status.test.ts` — YAML valide, Schema erfüllt, Version = CHANGELOG-Version, keine doppelten IDs, Validator meldet manipulierte Fixtures als Fehler.
- Neu/erweitert: Layer-Regel-Test, der belegt, dass `src/routes` und `src/components` `dashboard-persistence` nicht direkt importieren.
- Gesamtlauf: `bun run test`, `typecheck`, `lint`, `docs:check`, `test:debt`, `report:technical`.

## Abschlussbericht

Nach Umsetzung liefere ich den geforderten 14-Punkte-Bericht mit konkreten Zahlen (Testanzahl, Findings vorher/nachher, Versionsnummer, Report-Hash) — keine pauschale Erfolgsmeldung.

## Nicht enthalten

AVKK-Funktionen, Reference Data, Datenbankmigrationen, Microsoft 365, Agenten, Reports.

## Kritische Anmerkungen

1. **`docs/ARCHITECTURE.md` existiert bereits.** Teil E sagt „erstellen" — ich schreibe die Datei neu, statt eine zweite Architekturdatei anzulegen; die alte Fassung geht als überholt in die Git-Historie ein.
2. **Teil F kann Kosmetik werden.** Die Warnung ist eine Dateinamen-Heuristik. Ich dokumentiere echte Nutzung statt Platzhaltertexte einzustreuen, damit `docs:check` grün ist und trotzdem etwas aussagt.
3. **Schemaort.** Ich lege das JSON-Schema neben das YAML (`docs/project-status.schema.json`) statt in den Repo-Root, damit Manifest und Vertrag zusammen liegen. Sag Bescheid, falls du den Root-Pfad brauchst.
