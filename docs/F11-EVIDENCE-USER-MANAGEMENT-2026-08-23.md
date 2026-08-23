# F-11 Evidenz — Benutzerverwaltung / Namensdarstellung — 2026-08-23

## Zweck

Git-gesicherter Nachweis des manuellen visuellen F-11-Retests der Benutzerverwaltung nach PR #31. Dieser Nachweis transkribiert die für die Abnahme relevanten Bildbeobachtungen, damit das Ergebnis nicht ausschließlich an einer temporären Screenshot-Datei hängt.

## Prüfumgebung

- veröffentlichte Sysing-Dashboard-App
- Rolle: System-Administrator
- Bedienpfad: `Einstellungen und Services` → `Benutzer & Profile…` → `Benutzerverwaltung`
- Prüfmethode: read-only Sichtprüfung; keine Rolle, kein Status, kein Passwort und kein Profilwert wurden verändert

## Ergebnis

Status: **VISUELL PASS — 1 Datenqualitäts-Hinweis**

### Bestanden

- Dialog `Benutzer & Profile` öffnet vollständig und ohne sichtbaren Renderfehler.
- Reiter `Benutzerverwaltung` ist erreichbar.
- Sechs Benutzerzeilen werden konsistent in einer Tabelle dargestellt.
- Jede Zeile zeigt einen fachlich lesbaren Personennamen; keine UUID oder technische ID wird als Personenname dargestellt.
- Vornamen erscheinen in erwarteter normalisierter Schreibweise.
- Rollen sind eindeutig und plausibel dargestellt, u. a. System-Administrator, Teamleiter, Projektmanager, Systemingenieur und Viewer.
- Alle sichtbaren Kontostati sind `Aktiv`.
- Keine unbeabsichtigte Benutzer-, Rollen- oder Statusänderung wurde im Test vorgenommen.

### Hinweis USERNAME-01 — gespeicherte Nachnamenschreibweise bleibt erhalten

Bei einem Datensatz erscheint der Nachname in Kleinschreibung (`marnau`). Das entspricht dem aktuellen fachlich-technischen Vertrag: Die Anzeige normalisiert den Vornamen, schreibt den gespeicherten Nachnamen aber bewusst nicht automatisch um.

Bewertung: **kein Fehler der PR-#31-Darstellungslogik und kein F-11-Blocker**. Es handelt sich um einen Datenqualitäts-/Stammdatenhinweis. Falls einheitliche Groß-/Kleinschreibung der Nachnamen gewünscht ist, sollte dies als separate Datenpflege- oder Validierungsregel behandelt werden und nicht als implizite UI-Umschreibung.

## F-11-Bewertung dieses Prüfschritts

- Benutzerverwaltungsdialog: PASS
- keine technischen IDs als Personennamen: PASS
- Vorname normalisiert: PASS
- Nachname nicht unerwartet durch UI verändert: PASS
- Rollen/Status plausibel: PASS
- Datenänderung während Test: NEIN
- Datenqualitäts-Hinweis `USERNAME-01`: offen, nicht blockierend

Damit ist der visuelle Namens-Retest in der Benutzerverwaltung **abgeschlossen**.

## Nächster manueller Prüfschritt — Backup

Der nächste Test prüft ausschließlich den Administrator-Bedienpfad des lokalen Browser-Backups.

Bedienpfad:

1. Als System-Administrator angemeldet bleiben.
2. `Einstellungen und Services` → `Backup…` öffnen.
3. Prüfen, ob der Dialog vollständig und ohne sichtbaren Fehler rendert.
4. Den Hinweis beachten: Backups liegen lokal im Browser; der Projekt-Quellcode ist nicht Bestandteil des Daten-Backups.
5. Vorhandene Backup-Liste und ggf. `Letztes automatisches Backup` ansehen.
6. `Backup jetzt erstellen` einmal ausführen.
7. Erwartet: Erfolgsmeldung `Backup erstellt: <Dateiname>` und anschließend ein neuer Eintrag im Downloadbereich.
8. Beim neuen Eintrag prüfen: Dateiname, Zeitstempel, Größe, Kennzeichnung `manuell` und Status `geprüft` bzw. nachvollziehbare Warnung.
9. `Backup-Protokoll` aufklappen und prüfen, ob für den neuen Lauf ein nachvollziehbarer Eintrag ohne unerwarteten Fehler erscheint.
10. Für diesen Prüfschritt **nichts löschen** und **keine Wiederherstellung ausführen**.
11. Einen Screenshot des Dialogs nach erfolgreicher Erstellung mitsamt neuem Backup-Eintrag und, wenn möglich, aufgeklapptem Backup-Protokoll sichern.

PASS-Kriterien:

- Backup-Dialog öffnet fehlerfrei.
- manuelles Backup lässt sich erstellen.
- Erfolgsmeldung erscheint.
- neuer Backup-Eintrag erscheint im Downloadbereich.
- Status/Metadaten sind plausibel.
- Protokolleintrag ist vorhanden und enthält keinen unerwarteten Fehler.
- keine Lösch-/Restore-Aktion wurde ausgeführt.
