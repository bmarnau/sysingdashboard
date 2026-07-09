# ADR-0006: Kein Virtual Scrolling (bis Messnachweis)

- **Status**: Accepted
- **Datum**: 2026-07-09

## Kontext
Bei der Performance-Optimierung (v1.25.0) wurde `@tanstack/react-virtual`
für die Listen (Projekte, Arbeitspakete, Tätigkeiten) vorgeschlagen.

## Entscheidung
**Nicht einführen — vorerst.** Die realen Datenmengen liegen typischerweise
unter 100 Einträgen pro Liste. Ohne Messnachweis wäre Virtual Scrolling eine
zusätzliche Dependency plus DOM-/Scroll-Komplexität ohne feststellbaren Nutzen.

Der eigentliche Hebel für schnellere Initial-Renders liegt woanders und wurde
in v1.25.0 umgesetzt: Lazy-Loading der schweren Dashboard-Dialoge (jspdf,
recharts) via `React.lazy` + `Suspense`.

## Alternativen
- **`@tanstack/react-virtual` sofort einführen** — verworfen: neue Dependency
  + Höhen-Messungen + Scroll-Restore-Handling ohne belegten Bedarf.
- **`react-window`** — dito.
- **Manuelles "Zeige erste 50, Button ‚Mehr laden'"** — verworfen als
  UX-Regress ohne Messnachweis.

## Konsequenzen
Positiv:
- Keine zusätzliche Dependency, keine DOM-/Höhen-Fallen.
- Listen behalten natives Browser-Scrolling (inkl. Ctrl+F).

Negativ:
- Wenn ein Nutzer real >1000 Einträge in einer Liste hat, wird das Rendering
  spürbar langsam. Kriterium für Reopen dieses ADRs: **gemessene** Frame-Zeit
  >16 ms beim Öffnen einer Domain-Liste in einem echten Nutzer-Datensatz.

## Reopen-Trigger
Ein neues ADR (Supersedes: ADR-0006) wenn:
1. Ein realer Nutzer-Datensatz >500 Einträge pro Liste erreicht **und**
2. React DevTools Profiler eine Render-Zeit >16 ms für die betroffene Liste
   zeigt.
