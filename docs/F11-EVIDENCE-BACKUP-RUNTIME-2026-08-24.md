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

## Bewertung der PASS-Kriterien

| Kriterium | Ergebnis |
| --- | --- |
| Manueller Backup-Lauf erfolgreich | PASS |
| Neuer manueller Eintrag genau einmal sichtbar | PASS |
| Neuer manueller Eintrag `geprüft` statt `mit Warnungen` | PASS |
| Auto-Backup-Zeitstempel durch manuellen Lauf unverändert | PASS |
| Neuer automatischer Lauf nach Fix ebenfalls `geprüft` | PASS |
| Kein sichtbarer Doppelstart des manuellen Laufs | PASS |
| Keine Secrets/Zugangsdaten sichtbar | PASS |
| Neuester Protokolleintrag aufgeklappt und textlich geprüft | OFFEN |

## Noch offener Mini-Schritt

Für den vollständigen Runtime-Abschluss von Issue #40 fehlt nur noch der sichtbare Inhalt des neuesten Protokolleintrags. Im aktuellen Screenshot ist `BACKUP-PROTOKOLL (29)` noch eingeklappt.

Der Betreiber soll daher nur noch:

1. `BACKUP-PROTOKOLL (29)` aufklappen,
2. den neuesten manuellen Eintrag `dashboard-backup-2026-08-24-12-20.zip` sichtbar machen,
3. einen Screenshot senden, auf dem insbesondere `Prüfung:` und `ZIP:` sowie ein eventuell vorhandener `Fehler:`-Hinweis erkennbar sind,
4. kein weiteres Backup erzeugen, nichts löschen und keinen Restore durchführen.

## Zwischenfazit

Der sichtbare Runtime-Re-Test bestätigt bereits die Korrektur der beiden zentralen Benutzerwirkungen aus Issue #40: Ein aktuelles manuelles Backup wird als `geprüft` erzeugt und verändert den Zeitstempel des letzten automatischen Backups nicht. Der Scheduler-Schutz gegen parallele Tagesläufe ist zusätzlich automatisiert durch die Regression aus PR #41 abgedeckt. Bis zur Sichtprüfung des neuesten Protokolleintrags bleibt Issue #40 formal offen.
