# Bericht F-U7-03 und F-U7-04: Ursachenanalyse

Stand: 2026-11-05 · Auftrag A03 (ops/queue) · Grundlage: `main` 9ab42d15 · Art: nur lesen (Code, Daten im Repository, Git-Historie)

## Ergebnis

1. F-U7-03: Der Projektstatus („Im Plan“, „Risiko“, „Verzug“, „Fertig“) wird von Hand gepflegt und nie aus der Deadline berechnet. „Überfällig“ im Projektbericht wird dagegen aus der Deadline berechnet. Beide Angaben sind nicht gekoppelt. Das ist eine fehlende Regel (Konzept- und Doku-Lücke), kein Programmierfehler.
2. F-U7-04: Die Mengen sind keine Rechte- oder RLS-Frage. Projekte, Arbeitspakete und Tätigkeiten liegen je Konto im Browser-Speicher. Ohne gespeicherten Stand greift die Startdatei (4/6/6), dazu kommen die Demodaten, die in diesem Browser geladen wurden.
3. alexa@ (10/30/63) entspricht genau Startdatei plus Demodatensatz 2.2.0 (6/24/57). kiosk@ (7/11/12) entspricht genau Startdatei plus dem älteren Demodatensatz 2.1.0 (3/5/6).
4. Daraus folgt (abgeleitet, nicht belegt): kiosk@ lief auf einem Stand, der vor dem 2026-10-24 gebaut wurde. Das ist vermutlich die veröffentlichte App 1.69.0 vom 2026-10-21, nicht die Vorschau.

## F-U7-03: Status „Im Plan“ trotz überschrittener Deadline

| Punkt                | Beobachtung                                                          | Beleg                                                                               |
| -------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Statuswerte          | `on_track` → „Im Plan“, `at_risk`, `delayed`, `abgeschlossen`        | `src/components/dashboard/constants.ts:38-43`                                       |
| Status ist Eingabe   | neues Projekt startet mit `on_track`, keine Ableitung im Code        | `src/components/dashboard/domain.ts:78`; Suche nach Ableitungsfunktion ohne Treffer |
| Daten P-101, P-103   | `status: on_track`, Deadline 2026-06-30 bzw. 2026-07-15 (Startdatei) | `src/data/dashboard.json:16`, `:20`, `:40`, `:44`                                   |
| Bericht „überfällig“ | aus Deadline berechnet: `due < today` → `overdue`                    | `src/lib/avkk/workspace.ts:111-116`; Projekt-Deadline als Fälligkeit `:386`         |
| Bericht zeigt beides | Status als gespeicherter Wert, Fälligkeit berechnet                  | `src/lib/report/definitions/avkk.ts:41-46`, `:101`, `:284`, `:341`                  |

Bewertung: gewollt ist der Status als Einschätzung der Projektleitung. Es fehlt eine Regel, wie sich eine überschrittene Deadline auf die Anzeige auswirkt. Das Handbuch beschreibt den Unterschied nicht.

Vorschläge (Entscheidung des Owners):

| Variante      | Inhalt                                                                                                                                                                                                 | Aufwand                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| A (empfohlen) | Status bleibt Eingabe. Ist die Deadline überschritten und der Status nicht „Fertig“, zeigt die Oberfläche zusätzlich den Hinweis „Deadline überschritten“ (Liste, Detail, Cockpit). Handbuch ergänzen. | 3 bis 5 h mit Tests                                              |
| B             | Status wird bei überschrittener Deadline automatisch auf „Verzug“ gesetzt                                                                                                                              | 4 bis 6 h; ändert gespeicherte Daten, braucht Regel für Rückkehr |
| C             | nur Handbuch: Status ist Einschätzung, Fälligkeit steht im Bericht                                                                                                                                     | 0,5 h                                                            |

Zusätzlich: Die Startdatei enthält Projekte mit Deadlines im Mai bis Juli 2026. Sie wirken dadurch für jede neue Person sofort veraltet. Das gehört zur Demodaten-Analyse (DM-01 bis DM-14).

## F-U7-04: unterschiedliche Mengen bei zwei Viewer-Konten

| Punkt           | Beobachtung                                                                                          | Beleg                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Speicherort     | ein Stand je Konto im `localStorage` des Browsers (Schlüssel `northbit-dashboard-v2`, kontobezogen)  | `src/lib/store/dashboard-persistence.ts:35-40`, `:50-53`                                                               |
| Rückfall        | ohne gespeicherten Stand gilt die Startdatei                                                         | `src/lib/store/dashboard-persistence.ts:63-70`, `src/data/dashboard.json` (4 Projekte, 6 Arbeitspakete, 6 Tätigkeiten) |
| Server-Daten    | die geteilte Projektion wird nur im Veröffentlichungsdialog gelesen, nicht in die Ansichten gemischt | `src/routes/_authenticated/dashboard.tsx:172-177`                                                                      |
| Demodaten 2.2.0 | 6/24/57, seit 2026-10-24 (b9afb9da)                                                                  | `src/lib/demo-data/dataset.ts:12`, Zählung per `buildDemoDataset()`                                                    |
| Demodaten 2.1.0 | 3/5/6, Stand 2026-08-13 (148bafaa)                                                                   | `git show 148bafaa:src/lib/demo-data/dataset.ts`, Zählung per `buildDemoDataset()`                                     |
| alexa@          | 4/6/6 + 6/24/57 = 10/30/63                                                                           | Rechnung                                                                                                               |
| kiosk@          | 4/6/6 + 3/5/6 = 7/11/12                                                                              | Rechnung                                                                                                               |
| Release 1.69.0  | Commit 3732df26 vom 2026-10-21, vor Demodaten 2.2.0                                                  | `git log -G'1\.69\.0' -- CHANGELOG.md`                                                                                 |

Bewertung: Die Rollen sind nicht die Ursache. Die Anzeige hängt vom Browser, vom Konto und vom ausgelieferten Stand ab. Für die Abnahme ist das eine Doku-Lücke mit Folgen: Zwei Konten sind nur vergleichbar, wenn beide im selben Stand (URL) mit denselben geladenen Demodaten geprüft werden.

Vorschläge:

1. Owner bestätigt, unter welcher Adresse kiosk@ geprüft wurde (Vorschau oder veröffentlichte App). Danach kann EV-0005 den Befund schließen oder korrigieren.
2. Abnahme-Checklisten sollten Adresse, App-Version und Demodaten-Version je Konto festhalten (Aufwand 0,5 h).
3. Der Demodaten-Hinweis sollte die geladene Version anzeigen (`DEMO_DATASET_VERSION`), damit veraltete Stände sichtbar sind (1 bis 2 h, gehört zu DM-01 bis DM-14).

## Grenzen

- Keine Abfrage am Live-System, kein Blick in den Browser-Speicher der Konten. Die Zuordnung zu 2.1.0 beruht auf der exakten Übereinstimmung der drei Zahlen, nicht auf einem Beleg aus dem Browser.
