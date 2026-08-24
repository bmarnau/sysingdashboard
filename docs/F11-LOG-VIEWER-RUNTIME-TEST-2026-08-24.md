# F-11 Log-Viewer-Runtime-Test — 2026-08-24

## Zweck

Dieser Prüfschritt dokumentiert die visuelle Administrator-Restabnahme des Log Viewers. Der Test ist bewusst read-only und minimiert die Sichtbarkeit unnötiger Detaildaten.

## Technischer Ausgangspunkt

Produktstand: GitHub `main` nach Merge von PR #41, Merge-Commit `a6b0379f19289c5e94f5ee16fb0a0b4b3904db95`, in Lovable synchronisiert.

Der aktuelle `LogViewerDialog.tsx` nutzt die vorhandene Logger-Infrastruktur und liest aus:

- In-Memory-Ringpuffer der aktuellen Session,
- persistentem IndexedDB-Sink früherer Sessions.

Die Liste unterstützt:

- Level `debug`, `info`, `warn`, `error`,
- Zeitraumfilter,
- Quellenfilter,
- Volltextsuche,
- read-only `Aktualisieren`,
- optional Auto-Refresh.

Zusätzlich existieren Aktionen `Export`, `Löschen`, Log-Detail und `Als JSON kopieren`. Diese werden für den F-11-Sichttest nicht benötigt.

## Sicherheitsgrenze

Für diesen Prüfschritt ausschließlich:

- Dialog öffnen,
- Hauptliste und Filter ansehen,
- optional genau einmal `Aktualisieren` anklicken,
- sichtbare Logzeilen auf offensichtliche Secrets/Zugangsdaten prüfen.

Nicht ausführen:

- `Export` nicht anklicken,
- `Löschen` nicht anklicken,
- Auto-Refresh nicht aktivieren,
- keine Log-Detailansicht öffnen,
- `Als JSON kopieren` nicht verwenden.

Begründung: Die Detailansicht kann vollständigen JSON-Kontext und Stacktraces anzeigen. Obwohl der Logger Secrets bereits redigiert, ist diese zusätzliche Datenexposition für die visuelle F-11-Abnahme nicht erforderlich.

## Manueller Test

1. Als `System-Administrator` angemeldet bleiben.
2. `Einstellungen und Services` → `Log Viewer…` öffnen.
3. Prüfen, dass der Dialog vollständig und ohne sichtbaren Fehler rendert.
4. Prüfen, dass die Filter für Level und Zeitraum sichtbar sind.
5. Prüfen, dass eine Anzahl wie `x von y Einträgen` oder der definierte Empty-State angezeigt wird.
6. Falls Logs vorhanden sind, prüfen, dass Zeitstempel, Level, Message und Quelle lesbar dargestellt werden.
7. Optional genau einmal `Aktualisieren` anklicken; dies lädt die Logliste neu.
8. In der sichtbaren Hauptliste prüfen, dass keine Passwörter, Tokens, API-Keys, Service-Role-Keys, Connection Strings oder vergleichbare Zugangsdaten im Klartext erscheinen.
9. Keine Export-, Lösch-, Kopier- oder Detailaktion ausführen.
10. Einen Screenshot senden, der Titel, Toolbar, Filter und mehrere Logzeilen bzw. den Empty-State zeigt.

## PASS-Kriterien

- Dialog `Log Viewer` öffnet ohne sichtbaren Laufzeitfehler.
- Keine IndexedDB-Read-Fehlermeldung sichtbar; falls doch, wird dies als Finding dokumentiert.
- Filter/Zeitraum und Loganzahl sind verständlich dargestellt.
- Vorhandene Logzeilen sind lesbar oder Empty-State ist korrekt.
- Keine offensichtlichen Secrets/Zugangsdaten in der Hauptliste sichtbar.
- Keine unbeabsichtigte Datenänderung.

## Status

**OFFEN — nächster manueller Betreiber-Test.**
