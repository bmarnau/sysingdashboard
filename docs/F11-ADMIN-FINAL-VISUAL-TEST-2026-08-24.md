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

## Manueller Sichtnachweis

Der Betreiber öffnete am 24.08.2026 als `System-Administrator` ausschließlich das Servicemenü und löste keine Menüaktion aus.

Im Screenshot sind vollständig und lesbar sichtbar:

- `Export…`
- `Berichte…`
- `Leistungsreport anzeigen`
- `Benutzer & Profile…`
- `Engineer-Stammdaten…`
- `Arbeitszeitmodell…`
- `Downloads…`
- `Backup…`
- `Log Viewer…`
- `Import / Export…`
- `Azure Daten…`
- `Systemstatus…`
- `Technischer Prüfbericht…`
- `PDF Drucken`
- `Handbuch…`
- `Entwicklungstagebuch…`
- `Demo-Datensatz…`
- `Backend & Auth-Konten…`
- `Automatische Abmeldung…`
- `Abmelden`
- `Reset`

Die permission-gebundenen Administratorfunktionen sind damit vollständig sichtbar. Der untere Menübereich einschließlich `Backend & Auth-Konten…`, `Automatische Abmeldung…`, `Abmelden` und `Reset` ist erreichbar und nicht durch Clipping verdeckt. Es ist keine Fehlermeldung oder Überlagerung sichtbar. Es wurde keine mutierende Aktion ausgelöst.

## Bewertung

| Kriterium                                            | Ergebnis |
| ---------------------------------------------------- | -------- |
| Servicemenü öffnet ohne sichtbaren Fehler            | PASS     |
| Allgemeine Serviceeinträge vollständig/lesbar        | PASS     |
| Permission-gebundene Administrator-Einträge sichtbar | PASS     |
| Unterer Menübereich vollständig erreichbar           | PASS     |
| Keine Layout-/Clipping-Blockade                      | PASS     |
| Keine unbeabsichtigte Aktion/Datenänderung           | PASS     |

## Status

**VISUELL PASS — finaler Administrator-Sichttest abgeschlossen.**

Damit sind die geplanten manuellen Administrator-UI-Pfade `Systemstatus`, `Benutzer & Profile`, `Backup`, `Downloads`, `Log Viewer` und die finale Servicemenü-Gesamtsicht abgearbeitet. Offen bleiben außerhalb dieses Sichttests die fachliche Einordnung/Behebung der Systemstatus-Findings `SYSSTAT-01` bis `SYSSTAT-03`, die Entscheidung zu `Role Preview` sowie die finale F-11-Dokument-/CI-Konsolidierung.
