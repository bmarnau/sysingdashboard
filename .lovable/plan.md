# Sprint 05E – Modularisierung Backup-Service

Verhaltensneutrales Refactoring von `src/lib/backup-service.ts` (1083 Zeilen) — der
größten verbliebenen Oversize-Schuld. Keine funktionale Änderung, keine API-Änderung.

## Ausgangslage (geprüft)

Die Datei vereint sechs Verantwortlichkeiten:

- IndexedDB-Zugriff (`openBackupDB`, `dbTx`) und Snapshot-Sammlung aus localStorage
  inkl. Allowlist und Sensitiv-Filter
- ZIP-Erzeugung samt eingebetteter Dokumente (README, INSTALL, .env-Beispiel)
- Integritäts- und Konsistenzprüfung (`runConsistencyCheck`, `validateZip`)
- Backup-Protokoll (`readLog`/`writeLog`) und Restore-Protokoll
- Restore mit drei Modi (`empty`, `overwrite`, `merge`) inkl. Versionsprüfung
- Snapshot-/Rollback-Registry

Importiert wird der Service von `BackupDialog`, `SystemStatusDialog`,
`json-import-service`, `AzureImportPreviewDialog`, `dashboard.tsx` sowie vier
Testdateien unter `src/__tests__/backup/`.

## Zielarchitektur

```text
src/lib/backup/
  types.ts        Typen (BackupCheckResult, BackupRecordMeta, RestoreMode, ...)
  constants.ts    DB-/Storage-Keys, Allowlist, Sensitiv-Muster
  storage.ts      IndexedDB-Öffnen, Transaktionen, Datensatzverwaltung
  snapshot.ts     collectSnapshot, Key-Filter
  templates.ts    README/INSTALL/.env-Inhalte des Archivs
  zip.ts          buildZip
  integrity.ts    runConsistencyCheck, validateZip
  audit.ts        Backup- und Restore-Protokoll
  rollback.ts     Snapshot-Registry, rollbackSnapshot
  merge.ts        Merge-Strategie des Restores
  restore.ts      restoreFromZip
  create-backup.ts BackupService (Erzeugung, Auto-Backup, Download)
  index.ts        Re-Export der bisherigen öffentlichen API
```

`src/lib/backup-service.ts` bleibt als dünner Re-Export von `./backup` bestehen,
damit alle bestehenden Importpfade unverändert funktionieren. Jede neue Datei
bleibt deutlich unter der 500-Zeilen-Schwelle des Oversize-Detektors.

## Vorgehen

1. Bestehende Tests (`src/__tests__/backup/*`) als Regressionsnetz ausführen und
   den Ist-Zustand festhalten.
2. Extraktion in der Reihenfolge Typen → Konstanten → Templates → Storage →
   Snapshot → ZIP → Integrität → Audit → Rollback/Merge → Restore → Create.
   Nach jedem Schritt Tests und Typecheck.
3. `backup-service.ts` auf Re-Exporte reduzieren, Aufrufer unverändert lassen.
4. Abschluss: `bun run typecheck`, Testsuite, `lint:no-console`, `docs:check`,
   Tech-Debt-Scan und Prüfbericht neu erzeugen.

## Dokumentation

- Neue ADR `docs/ADR/0021-backup-service-modularisierung.md` (Schnittgrenzen,
  Alternativen, Konsequenzen); Umsetzungsstand-Tabelle in ADR-0019 fortschreiben.
- `CHANGELOG.md` auf 1.47.0, Eintrag im Entwicklungstagebuch (Sprint 05E).
- Handbuchkapitel Backup/Restore mit aktualisiertem `lastUpdated`.
- Technischen Prüfbericht neu bauen; Oversize-Finding zu `backup-service.ts`
  sollte danach entfallen.

## Abnahme

- Keine Datei über der Schwelle, öffentliche API unverändert, alle Tests grün,
  Dokumentation und Prüfbericht aktualisiert, Abschlussbericht mit Zeilenzahlen
  und Go/No-Go für Sprint 06.

## Kritische Anmerkung

`src/components/ui/sidebar.tsx` (745, shadcn-Fremdcode) und
`src/components/UserManualDialog.tsx` (731) bleiben offen. Vorschlag: sidebar
dauerhaft als Fremdcode vom Detektor ausnehmen statt zu refaktorieren; das ist
kein Teil dieses Sprints, sondern eine Empfehlung für Sprint 06.
