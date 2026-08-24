# F-11 Backup-Runtime-Re-Test — Sichtnachweis 2026-08-24

## Zweck

Dieser Nachweis transkribiert den manuellen Betreiber-Re-Test des Backup-Dialogs nach dem mit PR #41 gemergten F-11-Backup-Fix. Die Screenshotdatei selbst verbleibt im Chatkontext; alle für die Abnahme relevanten Beobachtungen werden hier dauerhaft in Git gesichert.

## Ausgangszustand vor dem manuellen Lauf

Vor dem Re-Test zeigte der Backup-Dialog:

- `Letztes automatisches Backup: 24.8.2026, 12:18:10`
- neuestes automatisches Backup: `dashboard-backup-2026-08-24-12-18.zip`
- Zeitstempel: `24.8.2026, 12:18:10`
- Größe: `26.7 KB`
- Typ: `automatisch`
- Status: `geprüft` (grün)
- Downloadbereich vor dem manuellen Lauf: 28 Einträge

Damit war bereits sichtbar, dass ein nach dem Fix erzeugtes automatisches Backup nicht mehr mit der früheren App-Key-Warnung markiert wurde.

## Sichtnachweis nach genau einem manuellen Backup

Der Betreiber löste anschließend genau einmal `Backup jetzt erstellen` aus. Der nachfolgende Screenshot zeigt:

- Erfolgsmeldung: `Backup erstellt: dashboard-backup-2026-08-24-12-20.zip`
- neuer Listeneintrag: `dashboard-backup-2026-08-24-12-20.zip`
- Zeitstempel des neuen Eintrags: `24.8.2026, 12:20:17`
- Größe: `26.7 KB`
- Typ: `manuell`
- Status: `geprüft` (grün)
- Downloadbereich nach dem Lauf: 29 Einträge
- genau ein neuer manueller Eintrag sichtbar
- unmittelbar darunter weiterhin das automatische Backup `dashboard-backup-2026-08-24-12-18.zip`, ebenfalls `geprüft`
- der Wert `Letztes automatisches Backup` bleibt nach dem manuellen Lauf unverändert bei `24.8.2026, 12:18:10`
- ältere Backups vom 23.08.2026 und davor behalten erwartungsgemäß ihren historischen Warnstatus; sie wurden nicht rückwirkend verändert
- im sichtbaren Dialog sind keine Secrets, Tokens, Passwörter oder Zugangsdaten erkennbar

## Technische Bedeutung des Status `geprüft`

Der aktuelle Produktcode auf Merge-Commit `a6b0379f19289c5e94f5ee16fb0a0b4b3904db95` wurde ergänzend geprüft:

- `BackupDialog.tsx` rendert `geprüft` ausschließlich für `BackupRecordMeta.status === "ok"`.
- `create-backup.ts` setzt diesen Status nur dann auf `ok`, wenn weder die Konsistenzprüfung noch die ZIP-Validierung den Status `warning` liefert.
- Ein `failed`-Ergebnis würde den Backup-Lauf abbrechen und nicht als grünen `geprüft`-Eintrag erscheinen.

Damit ist der grüne Status des neuen manuellen Backups ein belastbarer technischer Nachweis, dass die frühere App-Key-Warnung und eine ZIP-Warnung für diesen Lauf nicht vorliegen. Ein zusätzlich aufgeklappter Protokoll-Screenshot ist für den Abschluss von Issue #40 nicht mehr erforderlich.

## Bewertung der PASS-Kriterien

| Kriterium | Ergebnis |
| --- | --- |
| Manueller Backup-Lauf erfolgreich | PASS |
| Neuer manueller Eintrag genau einmal sichtbar | PASS |
| Neuer manueller Eintrag `geprüft` statt `mit Warnungen` | PASS |
| Konsistenz-/ZIP-Status ohne Warnung gemäß Produktcode | PASS |
| Auto-Backup-Zeitstempel durch manuellen Lauf unverändert | PASS |
| Neuer automatischer Lauf nach Fix ebenfalls `geprüft` | PASS |
| Kein sichtbarer Doppelstart des manuellen Laufs | PASS |
| Scheduler-Doppelstart zusätzlich automatisiert abgesichert | PASS |
| Keine Secrets/Zugangsdaten sichtbar | PASS |

## Abschlussbewertung Issue #40

Die drei Ausgangspunkte aus Issue #40 sind nun vollständig nachgewiesen:

1. Der aktuelle user-scoped Dashboardzustand wird durch PR #41 gesichert und die Regression ist 3/3 PASS.
2. Der manuelle Runtime-Lauf bleibt grün `geprüft`; die frühere App-Key-Warnung ist damit für den neuen Stand nicht mehr vorhanden.
3. `Letztes automatisches Backup` bleibt nach dem manuellen Lauf unverändert bei `24.8.2026, 12:18:10`.
4. Der Scheduler-Schutz gegen parallele Tagesläufe ist automatisiert getestet; im aktuellen Runtimezustand ist außerdem nur ein neuer automatischer Lauf für den 24.08. sichtbar.

Bewertung: **Backup-Runtime-Re-Test PASS. Issue #40 kann geschlossen werden.**

## Abschlussbericht

Backup-Fix implementiert und gemergt: PASS · CI/Security/Build/E2E/Quality Gate: PASS · automatisches Backup nach Fix: `geprüft` · manueller Backup-Re-Test: `geprüft` · Auto-Zeitstempel unverändert · kein neuer Doppelstart sichtbar · technische Statussemantik aus aktuellem Produktcode verifiziert · keine zusätzliche Protokollaufnahme erforderlich · Backup-Punkt F-11 abgeschlossen.
