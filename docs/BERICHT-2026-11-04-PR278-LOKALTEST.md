# Bericht: Lokaler Browsertest PR 278 (react-pdf-Stylesheets aus `public/`)

**Datum:** 2026-11-04, 21:05 bis 21:20 · **Art:** lokaler Test, kein Merge, kein Push auf `main`
**Prüfstand:** lokaler Branch `tmp/pr278-lokal` = PR 278 (`281c665f`) zusammengeführt mit `main` `f836ee87` (enthält Plugin `sysing:ensure-css-config` aus PR 277 und `css.devSourcemap: false` aus PR 275). Nach dem Test gelöscht, nicht gepusht.
**Umgebung:** Windows 11, Node 24.16.0, Bun 1.4.3 (`bun install --frozen-lockfile`: keine Änderungen), Vite 7.3.6 Dev-Server auf Port 5288, Chrome über Claude in Chrome.

## 1 Ergebnis

1. PR 278 funktioniert lokal mit und ohne Plugin: Die Stylesheets kommen aus `/vendor/react-pdf/`, der Text ist markierbar, der Link ist klickbar, die Konsole zeigt keinen Fehler `devSourcemap`.
2. Der Fehler „reading 'devSourcemap'“ lässt sich **lokal nicht nachstellen**, auch nicht ohne jede Absicherung (Fall C2). Er hängt an der Lovable-Vorschau. Die Ursache kann daher nur dort bestätigt werden.
3. Empfehlung: PR 278 ist technisch bereit, nach update-branch und CI. Gemergt wird er erst nach der Prüfung in der Lovable-Vorschau. Das Plugin bleibt, bis die Vorschau ohne Plugin fehlerfrei läuft (eigener Folge-PR).

## 2 Vorgehen

Der PDF-Viewer liegt hinter der Anmeldung (Export, Downloads). Lokal fehlt die `.env`; die Anmeldeseite meldet „Die Anmeldung ist noch nicht konfiguriert“. Deshalb zwei Ebenen:

- **Server-Ebene:** Abruf der Seite `/auth`, von `src/styles.css` und der react-pdf-Stylesheets über den Dev-Server. Der Fehler entsteht bei der CSS-Verarbeitung im Dev-Server, unabhängig von der Anmeldung.
- **Browser-Ebene:** Der unveränderte `PdfCanvasViewer` wird über die Module des Dev-Servers in die Seite `/auth` eingehängt (JavaScript in der Seite, keine Änderung am Repo). Das Test-PDF entsteht mit jsPDF: Zeile „PR278 Testtext markierbar“ und Link „Testlink zur Anmeldeseite“ auf `http://localhost:5288/auth#pr278-link`. Markieren per Dreifachklick, Link per Mausklick.

## 3 Ergebnisse je Fall

| Fall | Stand                                                            | Beobachtung                                                                                                                                                                                                                                                                                                                                                                           | Beleg                                                                                                    |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| A    | PR 278 + `main`, mit Plugin                                      | `/auth`, `src/styles.css`, `/vendor/react-pdf/*.css` je HTTP 200; Dev-Server-Log ohne `devSourcemap`. Viewer: beide Stylesheets als `<link>` aus `/vendor/react-pdf/` geladen (46 und 18 Regeln), Text- und Linkebene `position: absolute`, 1 Canvas, 2 Textspannen. Auswahl ergibt „PR278 Testtext markierbar“, Klick auf den Link führt zu `/auth#pr278-link`. Konsole ohne Fehler. | Ausgabe `javascript_tool` und Konsole; Screenshot `screenshot-1793822941003-1.jpg` (Markierung sichtbar) |
| B    | wie A, Plugin im Arbeitsbaum entfernt (beide Pluginlisten)       | wie A: alle Abrufe 200, Log ohne `devSourcemap`, Stylesheets aus `/vendor/`, Text markierbar, Link klickbar, Konsole ohne Fehler. Kein Absturz, weder bei `styles.css` noch bei der react-pdf-CSS.                                                                                                                                                                                    | Ausgabe `javascript_tool`; Screenshot `screenshot-1793823189003-2.jpg`                                   |
| C    | `main` `f836ee87` ohne PR 278, Plugin entfernt                   | `/vendor/react-pdf/TextLayer.css` 404 (bestätigt den Stand ohne PR 278). react-pdf-CSS läuft als Import durch Vite (`style`-Tags aus `node_modules/react-pdf/dist/Page/*.css`), alle Abrufe 200, Log ohne `devSourcemap`. Viewer funktioniert. Kein Absturz.                                                                                                                          | Ausgabe `javascript_tool` (`viteStyles`, `vendorLinks: 0`)                                               |
| C2   | wie C, zusätzlich `css.devSourcemap` entfernt (Stand vor PR 275) | alle Abrufe 200, Log ohne `devSourcemap`. Kein Absturz.                                                                                                                                                                                                                                                                                                                               | Dev-Server-Log, `curl`-Ausgabe                                                                           |

Die Screenshots liegen lokal unter `C:\Users\bmarn\AppData\Local\Temp\claude-chrome-screenshots-yscoiK\` und sind nicht im Repo.

Nebenbeobachtung: In Fall C meldete die Konsole einmal „[vite] Failed to reload /src/components/PdfCanvasViewer.tsx“. Das war die Hot-Reload-Meldung des offenen Tabs aus Fall B beim Wechsel des Branches, kein Fehler des Prüfstands.

## 4 Bewertung

- Der lokale Vite-Dev-Server übergibt immer ein `css`-Objekt an die CSS-Verarbeitung. Der Fehler entsteht nur, wenn dieses Objekt fehlt, wie im Vorschau-Server von Lovable (Kommentar in `vite.config.ts`, PR 275 und 277). Lokal ist die Ursache deshalb weder zu bestätigen noch zu widerlegen.
- PR 278 entfernt die react-pdf-CSS aus der Vite-Verarbeitung. Er kann den Fehler bei `src/styles.css` (Tailwind-Einstieg) nicht beheben. Das Plugin bleibt deshalb voraussichtlich nötig.
- Die Funktion von PR 278 (Laden aus `public/`, Markieren, Links) ist lokal belegt.

## 5 Empfehlung

| Punkt                             | Empfehlung                                                                                                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR 278                            | Bereit zum Merge nach update-branch und grüner CI, **nach** Prüfung in der Lovable-Vorschau (Dokument mit Text und Link öffnen, Konsole ohne `devSourcemap`). Bis dahin Draft.     |
| Plugin `sysing:ensure-css-config` | Behalten. Entfernen nur in einem eigenen Folge-PR, wenn die Vorschau mit PR 278 und ohne Plugin fehlerfrei läuft.                                                                  |
| Lokaler Nachweis des Absturzes    | Nicht möglich mit dem Standard-Dev-Server. Ein Test, der `config.css` gezielt entfernt, wäre möglich (etwa 1 bis 2 Stunden), belegt aber nur die Annahme über den Vorschau-Server. |

## 6 Aufwand und offene Risiken

Aufwand dieses Tests: etwa 45 Minuten.

| Risiko                                                                                         | Bewertung                                                     |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Lovable-Vorschau verhält sich anders als lokal                                                 | Hauptrisiko; nur in der Vorschau prüfbar                      |
| Kurz ungestylte Text- und Linkebene beim ersten Öffnen (Stylesheets laden erst mit dem Viewer) | gering; lokal nicht sichtbar beobachtet                       |
| Kopien in `public/vendor/` veralten bei react-pdf-Updates                                      | gering; Test in PR 278 erzwingt den Abgleich                  |
| Pfad `/vendor/...` setzt Auslieferung an der Wurzeladresse voraus                              | gering; heute erfüllt                                         |
| Test mit Formularfeldern im PDF                                                                | nicht geprüft; das Test-PDF enthielt nur Text und Link        |
| Echter Aufruf über Export und Downloads mit Anmeldung                                          | lokal nicht geprüft (keine `.env`); in der Vorschau nachholen |

## 7 Arbeitsbaum

`vite.config.ts` zurückgesetzt, lokaler Branch `tmp/pr278-lokal` gelöscht, zurück auf `docs/2026-11-04-u7-abnahme`. `git status`: nur die schon vorher vorhandenen ungetrackten Ordner `playwright-report/` und `test-results/`.
