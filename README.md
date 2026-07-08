# NorthBit Engineer Console

Interaktives Dashboard für Systems Engineers eines IT-Systemhauses. Zeigt aktuelle Aufgaben, Projekte, Wochenstunden und Aufwände – mit Echtzeit-Eingabe, lokaler Datenspeicherung und PDF-Druckausgabe.

## Features

- **Aufgabenverwaltung** – Tickets mit Status, Priorität, Schätzung und Aufwand; inline editierbar
- **Projektübersicht** – Budget, Fortschritt, Deadline, Team und Risikostatus
- **Wochenstunden & Verrechenbarkeit** – Tagesbasierte Erfassung mit Billable-Ratio
- **Zeiterfassung** – Neue Logs direkt im Dashboard erfassen
- **PDF-Export** – Druckoptimierte Ansicht über Browser-Druckdialog (Strg+P / Cmd+P)
- **Responsive Design** – Optimiert für Desktop, Tablet und Mobile
- **Lokale Datenspeicherung** – Änderungen bleiben nach Refresh erhalten (localStorage)

---

## Voraussetzungen

- [Bun](https://bun.sh) >= 1.0 (empfohlen) oder Node.js >= 20 mit npm/yarn/pnpm
- Ein moderner Browser (Chrome, Firefox, Safari, Edge)

---

## Schritt-für-Schritt-Setup

### 1. Repository klonen

```bash
git clone <repository-url>
cd <projektordner>
```

### 2. Abhängigkeiten installieren

**Mit Bun (empfohlen):**

```bash
bun install
```

**Mit npm:**

```bash
npm install
```

**Mit yarn:**

```bash
yarn install
```

### 3. Entwicklungsserver starten

```bash
bun run dev
```

oder

```bash
npm run dev
```

Die App ist anschließend unter `http://localhost:3000` erreichbar.

---

## Build- und Startbefehle

| Befehl              | Beschreibung                                                     |
| ------------------- | ---------------------------------------------------------------- |
| `bun run dev`       | Startet den Vite-Entwicklungsserver mit Hot-Reload               |
| `bun run build`     | Erzeugt einen Production-Build (optimiert für Cloudflare Worker) |
| `bun run build:dev` | Erzeugt einen Development-Build                                  |
| `bun run preview`   | Startet einen lokalen Preview-Server für den Production-Build    |
| `bun run lint`      | Führt ESLint über die gesamte Codebase aus                       |
| `bun run format`    | Formatiert alle Dateien mit Prettier                             |

> **Hinweis:** Das Projekt nutzt TanStack Start v1 mit SSR. Die Build-Ausgabe ist für den Einsatz auf einer Edge-Runtime (z. B. Cloudflare Workers) optimiert.

---

## Lokale Datenspeicherung (localStorage)

Deine Änderungen im Dashboard werden **automatisch im Browser-Speicher (localStorage)** persistiert. Das bedeutet:

- Status-Updates, Aufwandsänderungen und neue Zeitlogs bleiben nach einem Seiten-Refresh erhalten
- Die Daten werden **nur lokal im Browser** gespeichert – sie werden nicht an einen Server übertragen
- Mehrere Browser oder Geräte haben jeweils eigene, unabhängige Datenstände

### Details

- **Speicher-Key:** `northbit-dashboard-v1`
- **Gespeicherte Daten:** Aufgaben, Zeitlogs, Wochenstunden
- **Nicht gespeichert:** Projektdaten (read-only im aktuellen Setup)

### Daten zurücksetzen

Über den **Reset**-Button in der oberen rechten Ecke der App (neben dem PDF-Button) kannst du alle lokalen Änderungen löschen und auf den initialen Zustand aus `src/data/dashboard.json` zurücksetzen.

Alternativ über die Browser-DevTools:

1. F12 drücken (DevTools öffnen)
2. Reiter **Anwendung** → **Lokaler Speicher** → `http://localhost:3000`
3. Den Eintrag `northbit-dashboard-v1` löschen
4. Seite neu laden

> **Wichtig:** Ein Browser-Cache-Clear oder das Löschen von Website-Daten entfernt ebenfalls die gespeicherten Dashboard-Daten.

---

## Projektstruktur

```
├── src/
│   ├── data/
│   │   └── dashboard.json          # Initiale Demo-Daten
│   ├── lib/
│   │   └── dashboard-data.ts     # TypeScript-Typen & Datenimport
│   ├── routes/
│   │   ├── index.tsx               # Haupt-Dashboard (Aufgaben, KPIs, Projekte)
│   │   └── __root.tsx              # Root-Layout (Provider, Meta, Error-Boundaries)
│   ├── components/ui/            # shadcn/ui Komponenten (~45 Stück)
│   ├── styles.css                  # Design-Tokens (Deep-Cobalt-Theme), Tailwind v4
│   ├── router.tsx                  # TanStack Router-Konfiguration
│   ├── server.ts                   # SSR-Error-Wrapper
│   └── start.ts                    # TanStack Start-Initialisierung
├── package.json
├── vite.config.ts
├── tsconfig.json
└── bun.lock
```

---

## Technologie-Stack

- **Framework:** TanStack Start v1 (React 19 + SSR + File-based Routing)
- **Build-Tool:** Vite 7
- **Styling:** Tailwind CSS v4 mit Custom-Design-Tokens (oklch-Farben)
- **UI-Komponenten:** shadcn/ui (Radix UI Primitives)
- **Icons:** Lucide React
- **State:** React Hooks (`useState`, `useEffect`, `useMemo`)
- **Daten:** JSON-basiert, client-seitige Persistenz via localStorage
- **Charts:** Recharts
- **TypeScript:** Strict Mode

---

## Weiterführende Dokumentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Systemübersicht, Modulgrenzen, Datenfluss
- [`docs/ADR/`](./docs/ADR/) — Architecture Decision Records (Entscheidungshistorie)
- [`docs/API.md`](./docs/API.md) — Server-Routen (`/api/status`, `/api/sync`)
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — Build, Cloudflare Worker, ENV, CI
- [`docs/DATA-SCHEMA.md`](./docs/DATA-SCHEMA.md) — Export-Format & Migrationsregeln
- [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) — Dev-Workflow, Branch-Strategie, Doku-Sync-Pflicht
- [`CHANGELOG.md`](./CHANGELOG.md) — Single Source of Truth der Dashboard-Version

---

## Lizenz

Privat / Intern – NorthBit IT-Systemhaus GmbH
