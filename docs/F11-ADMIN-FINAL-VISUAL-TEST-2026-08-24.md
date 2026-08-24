# F-11 Finaler Administrator-Sichttest — 2026-08-24

## Zweck

Dieser Prüfschritt ist die letzte rein visuelle Administrator-Gesamtprüfung vor der fachlichen Bereinigung der offenen Systemstatus-Findings und der Entscheidung zu `Role Preview`.

## Technischer Ausgangspunkt

Produktstand: GitHub `main` nach Merge von PR #41, Merge-Commit `a6b0379f19289c5e94f5ee16fb0a0b4b3904db95`, in Lovable synchronisiert.

Das aktuelle `ServiceMenu.tsx` zeigt für einen System-Administrator allgemeine Servicepunkte sowie permission-gebundene Administratorfunktionen.

Für die visuelle Abnahme sind insbesondere folgende Einträge relevant:

- `Benutzer & Profile…`
- `Downloads…`
- `Backup…`
- `Log Viewer…`
- `Import / Export…`
- `Azure Daten…`
- `Systemstatus…`
- `Technischer Prüfbericht…`
- `Handbuch…`
- `Entwicklungstagebuch…`
- `Demo-Datensatz…`
- `Backend & Auth-Konten…`
- `Automatische Abmeldung…`
- `Abmelden`
- `Reset`

Zusätzlich sind die allgemeinen Einträge `Export…`, `Berichte…`, Leistungsreport, `Engineer-Stammdaten…`, `Arbeitszeitmodell…`, `PDF Drucken` vorhanden.

## Sicherheitsgrenze

Dieser Test ist vollständig read-only.

Nur:

- `Einstellungen und Services` öffnen,
- Menü vollständig ansehen,
- falls nötig nur so scrollen/positionieren, dass obere und untere Einträge sichtbar werden,
- Screenshot(s) anfertigen.

Nicht anklicken:

- `Reset`,
- `Abmelden`,
- `Demo-Datensatz…`,
- `Backend & Auth-Konten…`,
- Import-/Export-, Backup-, Lösch- oder andere mutierende Aktionen.

## PASS-Kriterien

- Servicemenü öffnet ohne sichtbaren Fehler.
- Administrator-Einträge sind vorhanden und lesbar.
- Permission-gebundene Einträge `Backup…`, `Import / Export…`, `Azure Daten…`, `Systemstatus…`, `Technischer Prüfbericht…`, `Entwicklungstagebuch…`, `Demo-Datensatz…` und `Backend & Auth-Konten…` sind für den System-Administrator sichtbar.
- Menü ist auf dem verwendeten Desktop-Viewport vollständig nutzbar; keine wichtigen Einträge sind durch Layout/Clipping unerreichbar.
- Keine unbeabsichtigte Aktion oder Datenänderung.

## Manueller Test

1. Als `System-Administrator` angemeldet bleiben.
2. Nur `Einstellungen und Services` öffnen.
3. Keine Menüaktion auslösen.
4. Prüfen, ob die oben genannten Administrator-Einträge sichtbar und lesbar sind.
5. Falls nicht alle Einträge in einem Bild sichtbar sind, zwei Screenshots aufnehmen: oberer und unterer Menüteil.
6. Besonders darauf achten, dass `Backend & Auth-Konten…`, `Automatische Abmeldung…`, `Abmelden` und `Reset` am unteren Ende tatsächlich erreichbar sind.
7. Screenshot(s) senden.

## Status

**OFFEN — nächster manueller Betreiber-Test.**
