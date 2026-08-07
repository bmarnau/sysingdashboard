# ADR-0021: Modularisierung des Backup-/Restore-Service

- **Status**: Accepted
- **Datum**: 2026-08-03
- **Sprint**: 05E

## Kontext

`src/lib/backup-service.ts` war auf 1083 Zeilen gewachsen und vereinte
IndexedDB-Zugriff, Snapshot-Sammlung inklusive Secret-Filterung, ZIP-Erzeugung,
Integritätsprüfung, Protokollierung sowie die vollständige, transaktionale
Restore-Logik in einer Datei. Der Oversize-Detektor meldete das Modul als
Medium-Finding (Schwelle 500 Zeilen, siehe ADR-0019); für Reviews von
sicherheitsrelevanten Teilen (Secret-Denylist, Rollback) war die Datei zu groß.

## Entscheidung

Verhaltensneutrale Aufteilung in `src/lib/backup/` entlang der
Verantwortlichkeiten:

| Modul              | Verantwortung                                            |
| ------------------ | -------------------------------------------------------- |
| `types.ts`         | Gemeinsame Typen, kein Laufzeitcode                      |
| `constants.ts`     | Speicherorte, Key-Allowlist, Secret-Denylist, Dateinamen |
| `storage.ts`       | IndexedDB-Zugriff (`openBackupDB`, `dbTx`)               |
| `snapshot.ts`      | Sammeln und Filtern des App-Zustands                     |
| `templates.ts`     | README / INSTALL / `.env.example`                        |
| `zip.ts`           | ZIP-Erzeugung inkl. eingebetteter `dashboard.json`       |
| `integrity.ts`     | Konsistenzprüfung und ZIP-Validierung                    |
| `audit.ts`         | Backup- und Restore-Protokoll                            |
| `rollback.ts`      | Pre-Snapshot, Rücknahme, Registry                        |
| `merge.ts`         | Modusabhängige Schreibstrategie + Nachvalidierung        |
| `restore.ts`       | Orchestrierung der Wiederherstellung                     |
| `create-backup.ts` | `BackupService`, Zeitplan, Download-Helfer               |
| `index.ts`         | Öffentliche API                                          |

`src/lib/backup-service.ts` bleibt als **reine Fassade** bestehen und leitet
ohne eigene Logik weiter. Alle bestehenden Importpfade und Signaturen sind
unverändert.

## Alternativen

- **Datei belassen und Akzeptanz verlängern** — verschiebt die Debt nur; die
  sicherheitsrelevanten Teile blieben schwer prüfbar.
- **Aufteilung nach technischer Schicht statt Fachlichkeit** (z. B. „io" /
  „logic") — hätte Secret-Filterung und Rollback erneut vermischt.
- **Fassade entfernen und alle Aufrufer umschreiben** — größerer Diff ohne
  fachlichen Nutzen und höheres Regressionsrisiko in einem Sprint, dessen Ziel
  ausdrücklich Verhaltensneutralität ist.

## Konsequenzen

Positiv:

- Jedes Modul liegt deutlich unter der 500-Zeilen-Schwelle (größtes Modul:
  `restore.ts`).
- Secret-Denylist (`constants.ts`) und Rollback (`rollback.ts`) sind isoliert
  prüf- und testbar.
- Oversize-Finding für `backup-service.ts` entfällt.

Negativ:

- Mehr Dateien; Einstieg erfordert den Blick in `index.ts`.
- Die Fassade ist ein zusätzlicher Indirektionsschritt, der langfristig
  entfallen sollte, sobald alle Aufrufer auf `@/lib/backup` umgestellt sind.

## Verifikation

Die bestehende Regressionssuite (`src/__tests__/backup/*`: create, integrity,
restore, backup-service) läuft unverändert grün — sie war Vorbedingung des
Refactorings und wurde nicht angepasst.
