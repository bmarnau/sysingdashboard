# F-11 Downloads-Runtime-Test — 2026-08-24

## Zweck

Dieser Prüfschritt dokumentiert die visuelle Administrator-Restabnahme des Downloadbereichs nach Abschluss des Backup-Blockers. Der Test ist bewusst nicht-destruktiv und erzeugt, löscht oder verändert keine Exportdaten.

## Technischer Ausgangspunkt

Aktueller Produktstand: GitHub `main` nach Merge von PR #41, Merge-Commit `a6b0379f19289c5e94f5ee16fb0a0b4b3904db95`, in Lovable synchronisiert.

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

Für diesen F-11-Schritt werden ausschließlich Anzeige und ein optionaler read-only Refresh geprüft.

Nicht ausführen:

- Aufbewahrungsdauer nicht ändern,
- `Abgelaufene jetzt löschen` nicht anklicken,
- keinen Eintrag löschen,
- keinen neuen Export erzeugen,
- keine Export-/Import-Funktion außerhalb des Dialogs starten.

Ein tatsächlicher Download ist für diesen visuellen Administratorpfad nicht erforderlich.

## Manueller Test

1. Als `System-Administrator` angemeldet bleiben.
2. `Einstellungen und Services` öffnen.
3. `Downloads…` öffnen.
4. Prüfen, dass der Dialog ohne Fehler vollständig rendert.
5. Falls Exporte vorhanden sind, prüfen, dass die Tabellenzeilen fachlich lesbar sind und Status/Format/Größe/Ablauf plausibel dargestellt werden.
6. Falls keine Exporte vorhanden sind, ist der definierte Empty-State `Noch keine Exporte vorhanden ...` ein zulässiges Ergebnis.
7. Optional genau einmal `Aktualisieren` anklicken; dies lädt nur die lokale Liste neu und verändert keine Exportdaten.
8. Keine Lösch-, Purge- oder Retention-Aktion ausführen.
9. Einen Screenshot senden, der Dialogtitel, Tabelle bzw. Empty-State und möglichst die Status-/Aktionsspalten zeigt.

## PASS-Kriterien

- Dialog `Downloads` öffnet ohne sichtbaren Fehler.
- Layout ist vollständig und ohne Überlagerungen/Abschneiden nutzbar.
- vorhandene Exportzeilen oder Empty-State werden korrekt dargestellt.
- bei vorhandenen Einträgen sind Status und Aktionen erkennbar; `Fertig`-Einträge dürfen Download/Vorschau anbieten.
- keine unbeabsichtigte Datenänderung.
- keine Secrets oder Zugangsdaten in der Oberfläche sichtbar.

## Status

**OFFEN — nächster manueller Betreiber-Test.**
