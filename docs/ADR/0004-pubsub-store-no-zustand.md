# ADR-0004: Pub-Sub-Store statt Zustand/Redux/Jotai

- **Status**: Accepted
- **Datum**: 2026-07-08

## Kontext
Das Dashboard hatte viele Komponenten mit eigenen `useState`- und
`useEffect`-Hooks für dieselben Daten (Projekte, Arbeitspakete, Aktivitäten).
Folgen: Prop-Drilling, unerwartete Re-Renders, State-Divergenz beim schnellen
Bearbeiten.

## Entscheidung
Ein eigener modul-globaler **Pub-Sub-Store** (`src/lib/store/dashboard-store.ts`)
plus React 18 `useSyncExternalStore` in Selektor-Hooks
(`src/lib/store/useDashboardStore.ts`). Patch-basierte Mutation, die
Referenz-Gleichheit unveränderter Slices bewahrt. Keine externe Abhängigkeit.

## Alternativen
- **Zustand** — hätte gepasst, aber +1 Dependency für ~150 LOC eigenen Code;
  identische API-Fläche für unsere Zwecke.
- **Redux Toolkit** — Overkill (Reducer, Selectors, Middleware) für vier
  Domain-Slices; kein DevTools-Bedarf, der die Bundle-Größe rechtfertigt.
- **Jotai** — atom-basiertes Modell passt schlecht zu „gemeinsam persistierte
  Domäne mit gesamter Serialisierung".
- **React Context pur** — jeder Provider-Update rendert alle Consumer neu;
  Selektoren mit Referenz-Stabilität waren die eigentliche Anforderung.

## Konsequenzen
Positiv:
- Zero Runtime Dependency; ~150 LOC Store-Code, testbar isoliert.
- Selektoren re-rendern nur bei tatsächlicher Slice-Änderung.
- `window.__dashboardStore` in DEV für Debugging.

Negativ:
- Kein integriertes DevTools-Panel — bei komplexem State-Debugging manuell
  loggen.
- Team muss Pub-Sub-Muster verstehen (statt „`useZustand` importieren").
- Falls später doch komplexere State-Machines nötig sind (undo/redo,
  time-travel), müssten wir migrieren.
