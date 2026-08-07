# Sprint 06B – Finalisierung der technischen Plattform (v1.50.0)

Abschluss der Infrastrukturphase: keine neuen Funktionen, ausschließlich Architektur-,
Dokumentations-, Test- und Nachweisarbeit.

## Teil A – docs/ARCHITECTURE.md neu aufbauen

Vollständige Überarbeitung des bestehenden Dokuments (aktuell Stand v1.25.0-Ära,
ohne Supabase-Auth, RBAC v2, Backupformat 2.0, Governance und Manifest).

Neue Gliederung:
1. Überblick und Technologiestack (Ist-Stand inkl. Supabase/Lovable Cloud)
2. Schichtenmodell: Routes/UI → Hooks/Facades → Services → Repository/Persistenz → Plattform,
   inkl. der durch `scripts/tech-debt/detectors/layer-violations.mjs` erzwungenen Regeln
3. Frontend-Architektur (TanStack Start, Store, i18n, Lazy-Dialoge)
4. Services (`src/lib/*`, `backend/services/*`)
5. Persistenz und Repository-Grenze (localStorage user-scoped, IndexedDB-Logs, Supabase)
6. Supabase: Auth-Bootstrap, Tabellen, RLS, Grants, `has_role`/`is_account_active`
7. RBAC (Frontend-Gate vs. serverseitige Grenze, ADR-0002/0007/0008)
8. Backup und Restore (Format 2.0, manifestbasiert, ADR-0021/0022)
9. Project Manifest und Governance als Steuerungsebene
10. Geplante Bausteine, klar als *geplant* markiert: Reference Data, AVKK, Report Service,
    Microsoft 365, KI-Agenten
11. Betrieb: Docker-Zielbild und Azure-Zielarchitektur (Migrationspfad, keine Implementierung)
12. Trust-Boundaries, Runtime-Grenzen (Cloudflare Worker), Verweise auf ADRs

## Teil B – Dokumentationsqualität (10 gemeldete Dialoge)

`docs:check` meldet: ImportPreviewDialog, PdfPreviewDialog, SaveTargetDialog,
TechnicalReportDialog, TextPreviewDialog, UserManualDialog, WorkingTimeModelsDialog,
AzureConfirmDialog, AzureDataDialog, AzureImportPreviewDialog.

Vorgehen je Dialog: Verwendung im Code prüfen (Aufrufstelle, Permission-Gate), dann
- **verwendet** → Handbucheintrag in `src/lib/help-documentation.ts` mit Zweck,
  Benutzergruppe, Berechtigung, Eingaben, Ergebnis, Besonderheiten; `lastUpdated` setzen.
  Ergänzung als Unterabschnitte in bestehenden Kapiteln (Import/Export, Downloads,
  Azure-Servicebereich, Systemstatus/Prüfbericht, Handbuch, Arbeitszeitmodelle) statt
  zehn neuer Top-Level-Kapitel.
- **nicht mehr verwendet** → begründet kennzeichnen (Deprecation-Hinweis im Kopf der Datei
  plus Eintrag im Tagebuch) oder entfernen, falls kein Import existiert.

Danach `bun run docs:check` erneut: Ziel 0 Warnungen.

## Teil C – Validator-Tests

Neue Suite `src/__tests__/scripts/project-status-validator.test.ts` gegen die exportierte
`validateProjectStatus()`-Funktion, mit Fixtures für:
- gültiges Manifest (0 Fehler)
- ungültige YAML-Syntax
- Schemaverstoß (falscher Typ / unbekanntes Feld in Listeneintrag)
- doppelte IDs
- `currentSprint` ohne passenden Sprint-Eintrag
- Roadmap mit unbekannter `dependencies`-Referenz
- fehlende Pflichtfelder
- Versionskonflikt CHANGELOG ↔ `versions.dashboard`
Zusätzlich ein Test, der das *echte* Manifest gegen das echte Schema validiert
(Regressionsschutz). Läuft automatisch über `bun run test` / `test:full`.

## Teil D – Technischer Prüfbericht

`bun run report:technical` neu erzeugen, Integritätsprüfung (`verify.mjs`) und
Release-Gate erneut ausführen. Manuelle Abschnitte (`manual-sections.json`) um einen
Abschnitt „Abschluss Infrastrukturphase" ergänzen: Governance, Manifest, Validator, CI,
Backupformat 2.0, Layer-Architektur, Dokumentation, Risiken, technische Schulden,
Go-/No-Go. Version des Berichts hochzählen, History-Snapshot behalten.

## Teil E – Entwicklungstagebuch

Neuer Meilenstein „Abschluss der Infrastrukturphase" in `docs/ENTWICKLUNGSTAGEBUCH.md`:
Ergebnisse, erreichte Architektur, technische Reife, Übergang zur Fachentwicklung,
Startpunkt AVKK (Sprint 07A).

## Teil F – PROJECT-STATUS.yaml

- Sprint 06B auf `completed` (bereits in `completedSprints`, Status/Exit-Kriterien schärfen)
- Neuer optionaler Abschnitt `phases`: Phase 1 „Technische Plattform" = completed,
  Phase 2 „AVKK-Fachmodell" = next; Schema (`docs/project-status.schema.json`) um diesen
  Abschnitt erweitern → `schemaVersion` 1.3.0
- `currentState` auf 07A als nächsten Sprint, Testanzahl und Gates aktualisieren
- `versions.dashboard` = 1.50.0, `releaseManagement.currentRelease` = 1.50.0
- Roadmap, Risiken, technische Schulden auf Stand bringen

## Teil G – Dokumentation

Aktualisieren: `README.md`, `CHANGELOG.md` (neuer Eintrag 1.50.0),
`docs/PROJECT-GOVERNANCE.md` (Phasenmodell), `docs/PROJECT-STATUS.md` (Abschnitt `phases`,
schemaVersion 1.3.0), `docs/ARCHITECTURE.md`, Tagebuch, Prüfbericht.
ADR-Bedarf: neues **ADR-0023 „Phasenmodell und Abschluss der Infrastrukturphase"**;
ADR-0019 (Oversize-Refactor) im Status nachziehen.

## Qualitätssicherung (alle müssen grün sein, Ausgabe wird im Abschlussbericht belegt)

`bun run lint` · `bun run typecheck` · `bun run test` · `bun run docs:check` ·
`bun run project-status:check` · `bun run build` · `bun run lint:no-console`

## Abschlussbericht

Am Ende ein Bericht mit den 11 geforderten Punkten, jeweils mit konkretem Nachweis
(Befehl + Ergebniszeile), inkl. Go-/No-Go für Sprint 07A.

## Nicht Bestandteil

Keine AVKK-/Reference-Data-Implementierung, keine Migration, keine UI-Erweiterung
(außer Handbuchtexten), keine M365-, Agenten- oder Report-Funktionen.
