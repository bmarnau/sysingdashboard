## Ziel
Den Systemstatus-Dialog so umbauen, dass er die verfügbare Breite voll nutzt, keine horizontalen Scrollbalken erzeugt und bei Bedarf maximierbar ist.

## Umsetzung (nur `src/components/SystemStatusDialog.tsx`)

1. **Responsives Label/Wert-Grid statt `flex justify-between`**
   - `Row`-Komponente neu: `grid grid-cols-1 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)] gap-x-4 gap-y-1 items-start`
   - Label linksbündig oben, Wert nimmt restliche Breite ein, kein leerer Mittelraum mehr.
   - Wert-Container: `min-w-0 break-words [overflow-wrap:anywhere]`, Links mit `break-all`, damit Repository-URL/IDs umbrechen statt zu scrollen.
   - Status-Icon (Check/Cross) als `shrink-0` neben dem Wert in einer inneren Flex-Zeile.

2. **Sektionen & Container**
   - Jede Sektion (`<section>`): `min-w-0`, Inhalte ohne `whitespace-nowrap`.
   - Root-Wrapper im Dialog: `min-w-0 overflow-x-hidden`, vertikal weiter scrollbar (`overflow-y-auto`).
   - Versions-Block (aktuell `flex flex-wrap` mit `<span>`-Chips) ebenfalls auf das Grid-Pattern oder ein `grid sm:grid-cols-2 lg:grid-cols-3` umstellen.

3. **Maximieren-Funktion**
   - Lokaler State `expanded: boolean`.
   - Im Header (neben dem bestehenden „Jetzt prüfen"-Bereich / DialogTitle) zwei Icon-Buttons aus `lucide-react`: `Maximize2` / `Minimize2` mit `aria-label` „Maximieren" / „Minimieren".
   - `DialogContent`-Klassen abhängig von `expanded`:
     - Standard: `max-w-2xl max-h-[85vh]`
     - Maximiert: `max-w-[100vw] w-screen h-[100dvh] sm:max-w-[100vw] rounded-none p-4 sm:p-6`
   - Kein echtes `requestFullscreen` (Dialog liegt im Portal, FS-API auf Dialog-Wrapper bricht Radix-Focus-Trap) — stattdessen Vollflächen-Modal, was die Anforderung erfüllt und konsistenter ist.
   - State auf `false` zurücksetzen, wenn der Dialog schließt (`onOpenChange`).

4. **Responsive Breakpoints**
   - Mobile (Default): einspaltig (`grid-cols-1`), Label oberhalb des Werts.
   - ≥ `sm`: zweispaltig Label/Wert.
   - Maximierte Ansicht zusätzlich ab `lg`: Sektionen in `lg:grid-cols-2`-Wrapper, damit der Platz auf großen Screens genutzt wird.

5. **Kleine Aufräumarbeiten**
   - Repository-Zeile: URL als eigene Zeile unter dem Label, `font-mono text-xs break-all`.
   - Lange Werte (Commit-SHA, Projekt-ID) ebenfalls `font-mono break-all`.
   - Keine festen `min-w`-/`w-`-Werte mehr, die Overflow erzwingen.

## Nicht im Scope
- Keine Änderungen an `/api/status`, Hook, Services, Build-Info, Doku-Inhalt.
- Kein Design-Direction-Loop (rein funktional-strukturelles Layout-Fix).
- Keine neue Route — der Systemstatus bleibt ein Dialog (kein eigener Page-Pfad), Maximieren-Modus ersetzt die geforderte „Vollbildseite".

## Doku-Sync
- `CHANGELOG.md`: neuer Eintrag `1.17.1` mit Bullet zu Layout-Fix & Maximieren.
- `src/lib/help-documentation.ts`: HelpTopic „Systemstatus" um Absatz zu Maximieren-Button und Umbruchverhalten ergänzen, `lastUpdated` aktualisieren.
- `bun run docs:check` vor Abschluss.

## Kritische Anmerkung / Alternative
Wenn der Systemstatus regelmäßig in voller Breite gebraucht wird, wäre eine eigene Route `/_authenticated/system-status` (statt Dialog) die sauberere Lösung — bookmarkbar, deep-linkbar, kein Modal-Layering. Der Maximieren-Toggle ist hier der kleinere Eingriff; sag Bescheid, wenn du stattdessen den Routen-Umbau willst.
