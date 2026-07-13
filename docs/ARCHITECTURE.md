# NorthBit Dashboard — Architektur

Stand: 2026-07-08 · Version: siehe `CHANGELOG.md` (Single Source of Truth)

Dieses Dokument beschreibt den **Ist-Zustand** der Codebasis, nicht Wunsch-Architektur.
Entscheidungen mit Trade-offs sind in [`docs/ADR/`](./ADR/) einzeln dokumentiert.

## 1. Überblick

| Ebene       | Technologie                                                            |
| ----------- | ---------------------------------------------------------------------- |
| Frontend    | React 19 + TanStack Start v1 (SSR, File-based Routing) + Vite 7        |
| Styling     | Tailwind CSS v4 + oklch-Design-Tokens in `src/styles.css`              |
| UI-Kit      | shadcn/ui (Radix Primitives) + Lucide Icons                            |
| State       | Pub-Sub-Store (`src/lib/store/`) + `useSyncExternalStore` + localStorage |
| Persistenz  | Browser: `localStorage` (user-scoped) · `IndexedDB` nur für Logs        |
| Backend     | TanStack Server-Routes auf Cloudflare Worker (`nodejs_compat`)         |
| Services    | `backend/services/` — framework-freie ESM-Module, von Server-Routes importiert |

| Auth        | **Aktuell keine** — lokale User-Verwaltung; RBAC nur UX (siehe ADR-0002) |
| CI          | GitHub Actions: lint, docs:check, test, build, security-scan           |

## 2. Modulgrenzen

```text
src/
├── routes/            TanStack file-based routing
│   ├── __root.tsx     Shell (head, Providers)
│   ├── index.tsx      Dashboard (Hauptseite)
│   └── api/           Server-Routes (status, sync)
├── components/        UI + Dialoge (shadcn-basiert)
├── hooks/             useCurrentUser, usePermission, useSafeAsync, …
├── lib/
│   ├── store/         Dashboard-Store (Pub-Sub) + Persistence
│   ├── rbac/          Permission-Matrix (mirrored in backend/)
│   ├── azure/         Azure-Sync-Client
│   ├── i18n/          de/en
│   ├── logger.ts      Frontend-Logger + IndexedDB-Ringbuffer
│   ├── errors.ts      Domain-Error-Klassen
│   └── *-service.ts   Backup, Export, Import, PDF, …
├── server.ts          Worker-Entry (TanStack SSR)
└── styles.css         Tailwind v4 + Design-Tokens

backend/               Node-ESM Standalone (lokal / CLI)
├── server.mjs
├── routes/            HTTP-Adapter
└── services/          syncService, statusService, logger, rbac

config/                Env-/Secret-Validation, Entra-Mapping
scripts/               docs:check, check-rbac, security-check
docs/                  Diese Dokumentation
```

## 3. Datenfluss

```text
┌──────────────┐  edit    ┌──────────────────┐  patch  ┌─────────────────┐
│ React Views  │ ───────▶ │ dashboard-store  │ ──────▶ │  localStorage   │
│ (routes/*)   │ ◀─────── │ (Pub-Sub)        │ ◀────── │ (user-scoped)   │
└──────┬───────┘ snapshot └────────┬─────────┘ load    └─────────────────┘
       │                           │
       │ manual sync               │ log
       ▼                           ▼
┌──────────────┐ HTTPS   ┌──────────────────┐
│ /api/sync    │ ──────▶ │ Azure (SQL/Table/│
│ /api/status  │         │  Blob Storage)   │
└──────────────┘         └──────────────────┘
```

**Prinzip: Local-First.** Alle Edits landen sofort in `localStorage` (debounced 300 ms).
Azure-Sync ist ein bewusster, benutzerausgelöster Vorgang — kein Live-Two-Way-Sync.
Details: [ADR-0003](./ADR/0003-local-first-localstorage.md).

## 4. Runtime-Grenzen (Cloudflare Worker)

Server-Code läuft in Workerd mit `nodejs_compat`. Konsequenzen:

- **Erlaubt**: `fs`, `path`, `crypto`, `Buffer`, `stream`, `url`, `zlib`, `http(s)`, `net`.
- **Nicht erlaubt**: `child_process`, `sharp`/`canvas`/`puppeteer`, `fs.watch`,
  Native-Addons, Packages mit `node-gyp`/Prebuilds.
- Alle npm-Pakete müssen **build-time gebundelt** sein — keine Laufzeit-Auflösung.
- `process.env.*` ist im Server-Kontext gültig, aber nur **innerhalb** von
  `.handler()`-Bodies lesen (Env wird zum Call-Zeitpunkt injiziert).

## 5. Trust-Boundaries

| Boundary                       | Wer vertraut wem                                | Enforcement            |
| ------------------------------ | ----------------------------------------------- | ---------------------- |
| Browser ↔ Server-Route         | Server vertraut Browser **nicht**               | Input-Validation (Zod) |
| Server-Route ↔ Azure           | Beidseitig authentifiziert (SAS/Client-ID)     | `config/secretManager` |
| Frontend-RBAC (`can()`)        | UI-Komfort — **keine** Security-Boundary        | Siehe ADR-0002         |
| Backend-RBAC (`backend/rbac`)  | Wird zur echten Boundary, sobald Auth aktiv ist | `scripts/check-rbac`   |
| Logs → IndexedDB               | Lokal, kein Netzwerk-Export ohne User-Aktion    | `logger.indexeddb.ts`  |

## 6. State-Management

Ein modul-globaler Pub-Sub-Store (`dashboardStore`) verwaltet `engineer`,
`projects`, `workPackages`, `activities`. React-Komponenten binden via
Selektor-Hooks (`useProjects`, `useActivities`, …) auf Basis von
`useSyncExternalStore`. Details + Alternativen-Bewertung: [ADR-0004](./ADR/0004-pubsub-store-no-zustand.md).

Persistenz-Regeln:
- Storage-Keys sind **user-scoped** (`<key>::<userId>`) — `userScopedKey()` in
  `src/lib/user-management.ts`.
- Cross-Tab-Sync über `storage`-Event.
- Kein IndexedDB für Domänendaten (nur Logger-Ringbuffer).

## 7. Fehler & Logging

- **`logger.*()` statt `console.*()`** — CI-Check `scripts/check-no-console.mjs`.
- Log-Levels: `debug` / `info` / `warn` / `error`. In DEV zusätzlich Console-Ausgabe,
  in PROD nur IndexedDB-Ringbuffer (`src/lib/logger.indexeddb.ts`).
- Domain-Fehler → typisierte Klassen in `src/lib/errors.ts`.
- Kein externer Error-Tracker (Sentry o. ä.): [ADR-0005](./ADR/0005-frontend-logger-no-sentry.md).

## 8. Performance

**Grundprinzip**: Optimieren, was gemessen ist — keine spekulativen Wraps.

- **Lazy-Loading der Dashboard-Dialoge**: 11 selten geöffnete Dialoge
  (`ExportDialog`, `PerformanceReport`, `SystemStatusDialog`, `AzureDataDialog`,
  `UserManualDialog`, …) sind via `React.lazy` + `Suspense` ausgelagert und
  werden gegen ihren `open`-State gegated — die schwergewichtigen Chunks
  `jspdf`, `jspdf-autotable` und `recharts` verlassen den Initial-Bundle
  vollständig und laden erst beim ersten Öffnen.
- **Bundle-Analyse**: `bun run analyze` erzeugt `dist/stats.html` (opt-in via
  `rollup-plugin-visualizer` + `ANALYZE=1`) — gitignored, kein
  Default-Build-Overhead.
- **Keine spekulative Memoisierung**: Referenz-Stabilität liefert bereits der
  Pub-Sub-Store (ADR-0004). `React.memo` nur mit gemessenem Hotspot.
- **Kein Virtual Scrolling** (Stand v1.25.0): [ADR-0006](./ADR/0006-no-virtual-scrolling.md)
  dokumentiert, warum und wann das ADR neu geöffnet wird.

## 9. Weiterführend

- [`docs/API.md`](./API.md) — Server-Routen
- [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md) — Build & Ops
- [`docs/DATA-SCHEMA.md`](./DATA-SCHEMA.md) — Export-Format & Versionierung
- [`docs/CONTRIBUTING.md`](./CONTRIBUTING.md) — Dev-Workflow & Doku-Sync-Pflicht
- [`docs/ADR/`](./ADR/) — Alle Architekturentscheidungen
