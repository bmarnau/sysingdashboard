# F-11 Evidenz — Backup-Runtime 2026-08-23

## Kontext

Manueller Betreiber-Test in der veröffentlichten Lovable-App als System-Administrator. Die bereitgestellten Screenshots wurden in diesen Nachweis transkribiert, damit der fachliche Befund nicht ausschließlich an temporären Bilddateien oder dem Chat hängt.

Baseline der Abnahme: `b86cc96bd6b64f81c42084c5e5dca929f3f22e34` (`main` vor PR #39).

## Sichtprüfung vor dem manuellen Lauf

- Dialog `Backup` öffnet vollständig und ohne sichtbaren Renderfehler.
- Vor dem Test wurden `26` Backups im Downloadbereich angezeigt.
- Angezeigtes letztes automatisches Backup: `23.08.2026, 07:29:51`.
- Mehrere vorhandene automatische Backups tragen Status `mit Warnungen`.
- Mehrere automatische Backups sind paarweise mit praktisch identischem Zeitstempel/Dateinamen vorhanden.

## Manueller Backup-Lauf

Am `23.08.2026` wurde genau einmal `Backup jetzt erstellen` ausgelöst.

Sichtbares Ergebnis:

- Erfolgsmeldung: `Backup erstellt: dashboard-backup-2026-08-23-07-36.zip`.
- Downloadbereich erhöhte sich von `26` auf `27` Einträge.
- Neuer Eintrag: `dashboard-backup-2026-08-23-07-36.zip`.
- Zeitstempel: `23.08.2026, 07:36:05`.
- Größe: `22.8 KB`.
- Kennzeichnung: `manuell`.
- Status: `mit Warnungen`.
- Kein Restore und keine Löschung wurde durchgeführt.

Damit ist nachgewiesen, dass der manuelle Erstellungsablauf technisch ein ZIP erzeugt und dieses browserlokal persistiert.

## Protokollauswertung

Der neueste manuelle Protokolleintrag zeigt:

- `Prüfung: Keine typischen App-Schlüssel erkannt (Engineer/User/WorkingTime/TargetTime). Vermutlich frisch initialisierte Installation.`
- `ZIP: ZIP-Validierung erfolgreich: 9 Einträge, 23342 Byte.`
- kein `Fehler:`-Eintrag.

Damit ist die gelbe Warnung nicht auf einen defekten ZIP-Container zurückzuführen. Die ZIP-Struktur ist formal valide; die Warnung entsteht bereits bei der Snapshot-Konsistenzprüfung.

## Finding BACKUP-01 — Kern-Dashboardzustand wird von der aktuellen Backup-Allowlist nicht erfasst

Status: **BESTÄTIGTER F-11-BLOCKER**

Codebefund auf der Baseline:

- `src/lib/store/dashboard-persistence.ts` persistiert den produktiven Local-First-Dashboardzustand unter dem Basis-Key `northbit-dashboard-v2`.
- Über `UserManagementService.userScopedKey()` wird daraus je Benutzer `northbit-dashboard-v2::<user-id>`.
- `src/lib/backup/snapshot.ts` übernimmt nur Local-Storage-Keys, für die `isAppKey(key)` wahr ist.
- `src/lib/backup/constants.ts` enthält in `APP_KEY_ALLOWLIST_PREFIXES` zwar ältere Präfixe wie `engineer-dashboard`, `dashboard:`, `user-management`, `working-time` usw., aber **kein `northbit-` bzw. `northbit-dashboard-v2`**.
- Damit wird der aktuell tatsächlich verwendete Dashboard-Persistenz-Key vom Snapshot verworfen.

Folge:

Ein Backup kann formal ein valides ZIP sein und trotzdem den zentralen Local-First-Zustand mit Projekten, Arbeitspaketen, Tätigkeiten und Engineer-Stammdaten nicht enthalten. Die bestehende Warnmeldung `Vermutlich frisch initialisierte Installation` ist deshalb irreführend: im geprüften produktiven Bestand liegt ein Backup-Key-Drift vor.

Bewertung: **nicht nur kosmetisch**. Die Backup-Funktion erfüllt ihren dokumentierten Zweck für den Kern-Dashboardzustand auf der aktuellen Baseline nicht vollständig und darf vor einer Korrektur nicht als PASS abgenommen werden.

## Finding BACKUP-02 — `Letztes automatisches Backup` wird durch manuellen Lauf überschrieben

Nach dem manuellen Lauf zeigt die Oberfläche:

`Letztes automatisches Backup: 23.08.2026, 07:36:05`

Dieser Zeitpunkt gehört zum manuellen Lauf.

Codebefund:

- `BackupService.createBackup()` schreibt `LAST_BACKUP_KEY` nach jedem erfolgreichen Backup unabhängig von `manual`.
- `BackupService.lastAuto()` liest denselben Schlüssel.
- `BackupDialog` beschriftet den Wert als `Letztes automatisches Backup`.

Bewertung: **bestätigter Logik-/Darstellungsfehler**.

## Finding BACKUP-03 — doppelte automatische Backup-Einträge

Die Historie zeigt mehrere automatische Backup-Paare mit nahezu identischem Zeitpunkt und gleichem Dateinamen.

Codebefund:

- `scheduleDaily()` prüft `LAST_BACKUP_KEY` vor dem Start eines asynchronen Backups.
- Der Schlüssel wird erst nach erfolgreichem Abschluss geschrieben.
- Ein atomarer/in-flight Schutz gegen parallele Starts ist nicht vorhanden.

Bewertung: **bestätigtes Runtime-Finding; Race-/Mehrfachstart als technisch plausible Ursache**. Vor Abschluss ist ein reproduzierbarer Schutz gegen Mehrfachstarts vorzusehen oder anderweitig eindeutig nachzuweisen.

## Abnahmeentscheidung Backup

- Dialog/Bedienbarkeit: PASS
- manuelles ZIP erzeugt: PASS
- ZIP-Strukturvalidierung: PASS
- Kern-Dashboarddaten im Snapshot: **FAIL / BLOCKER `BACKUP-01`**
- Anzeige letzter Auto-Zeitpunkt: **FAIL `BACKUP-02`**
- höchstens ein Auto-Backup pro Tag: **FAIL/FINDING `BACKUP-03`**
- Backup-Prüfschritt gesamt: **FAIL — Korrektur und Re-Test erforderlich**

## Nächster technischer Schritt

Die Restabnahme wird an dieser Stelle nicht künstlich fortgesetzt, als wäre Backup bestanden. Zuerst ist ein kleiner, separater Produkt-Fix erforderlich:

1. aktuelle `northbit-*`/user-scoped Dashboard-Persistenz sicher in den Backup-Snapshot aufnehmen,
2. Konsistenzprüfung auf den aktuellen Speichervertrag ausrichten,
3. automatischen Zeitstempel nur bei Auto-Backups schreiben,
4. Mehrfachstart des täglichen Auto-Backups verhindern,
5. Unit-/Backup-/Restore-Tests ergänzen,
6. CI/Security vollständig grün,
7. neuen manuellen Backup-Retest durchführen und erst danach F-11 fortsetzen.
