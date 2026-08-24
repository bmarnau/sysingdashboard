# F-11 Downloads-Runtime-Test — 2026-08-24

## Zweck

Dieser Prüfschritt dokumentiert die visuelle Administrator-Restabnahme des Downloadbereichs nach Abschluss des Backup-Blockers. Der Test wurde bewusst nicht-destruktiv durchgeführt; es wurden keine Exportdaten erzeugt, gelöscht oder verändert.

## Technischer Ausgangspunkt

Produktstand: GitHub `main` nach Merge von PR #41, Merge-Commit `a6b0379f19289c5e94f5ee16fb0a0b4b3904db95`, in Lovable synchronisiert.

Der aktuelle `DownloadCenterDialog.tsx` zeigt:

- Dialogtitel `Downloads`,
- lokale Browser-Ablage für erzeugte PDF/CSV/JSON/Azure-Table-Exporte,
- Aufbewahrungsdauer,
- Tabelle mit Dateiname, Format, Zeitraum, Erstellzeitpunkt, Ersteller, Größe, Status, Ablauf und Aktionen,
- mögliche Statuswerte `In Erstellung`, `Fertig`, `Fehlgeschlagen`, `Abgelaufen`,
- Aktionen Herunterladen, Vorschau und Löschen,
- Schaltfläche `Abgelaufene jetzt löschen`,
- Schaltfläche `Aktualisieren`.

## Sicherheitsgrenze des manuellen Tests

Für diesen F-11-Schritt wurden ausschließlich Anzeige und Bedienbarkeit geprüft.

Nicht ausgeführt:

- Aufbewahrungsdauer nicht geändert,
- `Abgelaufene jetzt löschen` nicht angeklickt,
- keinen Eintrag gelöscht,
- keinen neuen Export erzeugt,
- keine Export-/Import-Funktion außerhalb des Dialogs gestartet,
- kein tatsächlicher Download erforderlich.

## Manueller Sichtnachweis

Manuell am 2026-08-24 als System-Administrator in der veröffentlichten App geprüft. Der Screenshot wurde im Chat bereitgestellt; alle für die Abnahme relevanten Beobachtungen werden hier dauerhaft in Git transkribiert.

### Beobachtungen

- Dialog `Downloads` öffnet vollständig und ohne sichtbaren Laufzeitfehler.
- Beschreibung der lokalen Browser-Ablage ist sichtbar und verständlich.
- Aufbewahrung steht sichtbar auf `30` Tage.
- Die Tabelle enthält vorhandene Exportdateien und rendert alle vorgesehenen Spalten: Dateiname, Format, Zeitraum, Erstellt am, Erstellt von, Größe, Status und Ablauf.
- Die sichtbaren Exporte sind PDF-Dateien.
- Sichtbare Dateigrößen liegen plausibel im zweistelligen KB-Bereich.
- Alle im Screenshot sichtbaren Exportzeilen haben Status `Fertig`.
- Ablaufwerte werden plausibel als verbleibende Tage angezeigt (sichtbar z. B. 26/27 Tage).
- Mehrere fachliche Zeiträume sind sichtbar, darunter `aktueller Stand` und ein Projekt-/Vorhabenszeitraum.
- Die breite Tabelle verwendet einen horizontalen Scrollbereich; sie bleibt dadurch bedienbar und weist keine erkennbare Überlagerung oder abgeschnittene, unerreichbare Spalte auf.
- Schaltfläche `Aktualisieren` und `Schließen` sind sichtbar.
- Keine Fehlermeldung, kein Ladefehler und kein `Fehlgeschlagen`-Status sichtbar.
- Keine Secrets, Tokens, Passwörter, API-Keys oder Zugangsdaten sichtbar.
- Es wurde keine Lösch-, Retention-, Purge- oder Downloadaktion ausgeführt.

## Datenqualitäts-Hinweis DOWNLOAD-INFO-01

In einzelnen älteren Export-Metadaten ist die Groß-/Kleinschreibung des Feldes `Erstellt von` nicht vollständig einheitlich. Dieser Befund betrifft historische, bereits gespeicherte Exportmetadaten und nicht die Funktionsfähigkeit des Downloadbereichs. Er wird deshalb nicht als F-11-Blocker bewertet und nicht rückwirkend verändert.

## PASS-Kriterien

| Kriterium                                   | Ergebnis |
| ------------------------------------------- | -------- |
| Dialog öffnet ohne sichtbaren Fehler        | PASS     |
| Layout vollständig und bedienbar            | PASS     |
| Vorhandene Exportzeilen korrekt dargestellt | PASS     |
| Status/Format/Größe/Ablauf plausibel        | PASS     |
| `Fertig`-Status sichtbar                    | PASS     |
| Keine unbeabsichtigte Datenänderung         | PASS     |
| Keine Secrets/Zugangsdaten sichtbar         | PASS     |

## Ergebnis

**VISUELL PASS**

Der F-11-Downloadbereich ist für den geprüften Administratorpfad visuell und funktional ausreichend nachgewiesen. `DOWNLOAD-INFO-01` bleibt ausschließlich als nicht blockierender Datenqualitäts-Hinweis dokumentiert.

## Nächster F-11-Schritt

Als Nächstes wird der `Log Viewer` read-only geprüft. Vor der manuellen Prüfung wird der aktuelle Produktcode analysiert, damit keine Lösch-/Bereinigungs- oder andere mutierende Log-Aktion Bestandteil des Tests wird.
