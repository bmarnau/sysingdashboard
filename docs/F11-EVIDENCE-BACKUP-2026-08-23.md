# F-11 Evidenz — Backup-Runtime 2026-08-23

## Kontext

Manueller Betreiber-Test in der veröffentlichten Lovable-App als System-Administrator. Die beiden bereitgestellten Screenshots wurden in diesen Nachweis transkribiert, damit der fachliche Befund nicht ausschließlich an temporären Bilddateien oder dem Chat hängt.

Baseline der Abnahme: `b86cc96bd6b64f81c42084c5e5dca929f3f22e34` (`main` vor PR #39).

## Sichtprüfung vor dem manuellen Lauf

- Dialog `Backup` öffnet vollständig und ohne sichtbaren Renderfehler.
- Beschreibung weist korrekt darauf hin, dass Backups lokal im Browser abgelegt und als ZIP heruntergeladen werden können.
- Hinweis zum Quellcode-Export ist sichtbar.
- Vor dem Test wurden `26` Backups im Downloadbereich angezeigt.
- Angezeigtes letztes automatisches Backup: `23.08.2026, 07:29:51`.
- Mehrere vorhandene automatische Backups tragen Status `mit Warnungen`.
- In der Liste sind mehrere automatische Backups mit praktisch identischem Zeitstempel und identischem Dateinamen paarweise vorhanden, z. B. für `23.08.2026 07:29:50/07:29:51`, `22.08.2026 06:39:52`, `21.08.2026 04:54:15` und `20.08.2026 07:00:59/07:01:00`.

## Manueller Backup-Lauf

Am `23.08.2026` wurde genau einmal `Backup jetzt erstellen` ausgelöst.

Sichtbares Ergebnis:

- Erfolgsmeldung: `Backup erstellt: dashboard-backup-2026-08-23-07-36.zip`.
- Downloadbereich erhöhte sich von `26` auf `27` Einträge.
- Neuer oberster Eintrag: `dashboard-backup-2026-08-23-07-36.zip`.
- Zeitstempel: `23.08.2026, 07:36:05`.
- Größe: `22.8 KB`.
- Kennzeichnung: `manuell`.
- Status: `mit Warnungen`.
- Download- und Löschaktion sind sichtbar.
- Kein Restore und keine Löschung wurde durchgeführt.

Damit ist nachgewiesen, dass der manuelle Erstellungsablauf grundsätzlich funktioniert und ein neues Backup persistent in der browserlokalen Backup-Liste erscheint.

## Finding BACKUP-01 — Warnstatus noch nicht erklärt

Der neu erzeugte manuelle Lauf endet nicht mit `geprüft`, sondern mit `mit Warnungen`. Auch zahlreiche bestehende automatische Backups tragen denselben Status.

Bewertung: **offen / abnahmerelevant**. Der Backup-Kernlauf ist erfolgreich, aber die Ursache der Warnung muss über das aufklappbare `Backup-Protokoll` gelesen werden. Solange die Warnursache nicht geprüft ist, wird der Backup-Prüfschritt nicht als vollständiger PASS geführt.

## Finding BACKUP-02 — `Letztes automatisches Backup` wird durch manuellen Lauf überschrieben

Nach dem manuellen Lauf zeigt die Oberfläche:

`Letztes automatisches Backup: 23.08.2026, 07:36:05`

Dieser Zeitpunkt ist exakt der manuell erzeugte Backup-Lauf.

Codebefund auf der Baseline:

- `BackupService.createBackup()` schreibt `LAST_BACKUP_KEY` nach jedem erfolgreichen Backup unabhängig von `manual`.
- `BackupService.lastAuto()` liest genau diesen Schlüssel.
- `BackupDialog` beschriftet den Wert als `Letztes automatisches Backup`.

Bewertung: **bestätigter Logik-/Darstellungsfehler**. Ein manuelles Backup darf den als automatisch bezeichneten letzten Auto-Zeitpunkt nicht ersetzen.

## Finding BACKUP-03 — doppelte automatische Backup-Einträge

Die sichtbare Historie enthält mehrere nahezu zeitgleiche bzw. identische Paare automatischer Backups mit gleichem Dateinamen und gleicher Größe.

Codebefund auf der Baseline:

- `scheduleDaily()` prüft `LAST_BACKUP_KEY` vor dem Start eines asynchronen Backups.
- Der Schlüssel wird erst nach erfolgreichem Abschluss in `createBackup()` geschrieben.
- Es existiert in diesem Ablauf kein atomarer/in-flight Schutz gegen zwei nahezu gleichzeitige Starts, etwa aus parallelen App-Instanzen/Tabs.

Bewertung: **Finding, Ursache plausibel aber noch nicht runtime-seitig abschließend bewiesen**. Der sichtbare Zustand widerspricht dem dokumentierten Ziel `höchstens 1× pro Kalendertag` und muss vor dem formalen Abschluss technisch bereinigt oder anderweitig eindeutig erklärt werden.

## Nächster manueller Minischritt

Nur das `Backup-Protokoll (27)` aufklappen und den neuesten Eintrag `dashboard-backup-2026-08-23-07-36.zip` vollständig sichtbar machen.

Zu dokumentieren:

- Meldung(en) unter `Prüfung:`
- Meldung(en) unter `ZIP:`
- eventuell `Fehler:`
- ob der Eintrag als `manuell` und mit Zeit `07:36:05` erscheint

Keine weitere Backup-Erstellung, keine Löschung, kein Restore erforderlich.

## Zwischenstatus

- Backup-Dialog/Bedienbarkeit: PASS
- manuelles Backup erzeugt: PASS
- neuer persistenter Listeneintrag: PASS
- Warnstatus: OFFEN
- letzter Auto-Zeitpunkt: FAIL / bestätigtes Finding `BACKUP-02`
- doppelte Auto-Backups: FINDING `BACKUP-03`
- Backup-Prüfschritt gesamt: **TEILWEISE PASS — Protokollprüfung und Findings offen**
