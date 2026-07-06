## Kritische Einordnung zuerst

Der Vorschlag im Prompt hat drei Schwachstellen, die ich nicht 1:1 umsetzen würde:

1. **„Context + useReducer für alles"** ist für dieses Projekt der falsche Default. Context ohne Selector-Layer erzwingt einen Re-Render bei jeder State-Änderung in *allen* Consumern. Bei ~3.000 Zeilen `index.tsx` mit vielen Sub-Views verschlechtert das die Performance eher, als sie zu verbessern — genau das, was das „Done Criteria" verhindern soll.
2. **Zustand als neue Abhängigkeit** ist unnötig. Das Projekt hat bereits einen etablierten Pub-Sub-Pattern (`src/lib/user-management.ts`, `src/lib/azure/azure-history-store.ts` mit `listeners`/`subscribe`). React 18 bietet mit `useSyncExternalStore` genau dafür die kanonische API — **null neue Dependencies, selector-fähig, SSR-safe**.
3. **Full-Blob `JSON.stringify` in einem `useEffect`** (aktuell Zeile 392 in `index.tsx`) ist der wahre Performance-Killer, nicht Prop-Drilling. Bei jedem Tastendruck in einer Activity wird der komplette Dashboard-State neu serialisiert. Das gehört in den Store selbst mit *scoped* Writes.

Zusätzlich: „Alle kritischen State in Context" ist zu grob. UI-State (Dialoge auf/zu, Suchtext, Menü offen) hat in einem globalen Store **nichts** verloren — das bläht den Store auf und macht Tests härter. Nur *Domain-State* wandert raus.

## Ziel

Domain-State (projects / workPackages / activities / engineer) aus `src/routes/index.tsx` in einen kleinen, selector-basierten Store extrahieren, konsistent mit dem bereits gelebten Pub-Sub-Pattern. UI-State bleibt lokal. Prop-Drilling verschwindet für alle Consumer, die heute Daten aus `index.tsx` weitergereicht bekommen. Persistenz wird debounced + scoped.

## 1. Store-Kern (`src/lib/store/dashboard-store.ts`)

Ein einzelnes Modul, kein Provider nötig:

```ts
type DashboardDomainState = {
  engineer: Engineer;
  projects: Project[];
  workPackages: WorkPackage[];
  activities: Activity[];
};

// intern
let state: DashboardDomainState = /* lazy load */;
const listeners = new Set<() => void>();
function emit() { listeners.forEach(l => l()); }

export const dashboardStore = {
  getState: () => state,
  subscribe: (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); },
  // Mutatoren (typsicher, granular)
  setProjects, setWorkPackages, setActivities, setEngineer,
  updateActivity(id, patch), addActivity(a), removeActivity(id),
  updateWorkPackage(id, patch), addWorkPackage(wp), removeWorkPackage(id),
  updateProject, addProject, removeProject,
  replaceAll(next),                 // für Import/Restore
  reset(),                          // für „Alles zurücksetzen"
};
```

Persistenz-Layer separat (`src/lib/store/dashboard-persistence.ts`):
- Debounced `localStorage.setItem` (300 ms) via `dashboardStore.subscribe`.
- **Scoped Keys** statt Full-Blob: `dashboard-v1.activities`, `dashboard-v1.workPackages`, `dashboard-v1.projects`, `dashboard-v1.engineer`. Nur der veränderte Slice wird serialisiert (Diff über letzte Referenz).
- Hydration einmalig bei App-Start; Fehler → `logger.warn` + Reset auf `dashboardData` (Fallback).
- `storage`-Event-Listener → externe Änderungen (anderer Tab) triggern `replaceAll` + `emit`.

## 2. React-Bindings (`src/lib/store/useDashboardStore.ts`)

```ts
export function useDashboardStore<T>(selector: (s: DashboardDomainState) => T): T {
  return useSyncExternalStore(
    dashboardStore.subscribe,
    () => selector(dashboardStore.getState()),
    () => selector(dashboardStore.getState()),
  );
}

// Convenience-Hooks (memoisierte Selektoren)
export const useActivities = () => useDashboardStore(s => s.activities);
export const useProjects   = () => useDashboardStore(s => s.projects);
export const useWorkPackages = () => useDashboardStore(s => s.workPackages);
export const useEngineer   = () => useDashboardStore(s => s.engineer);
export const useProjectById = (id: string) =>
  useDashboardStore(s => s.projects.find(p => p.id === id) ?? null);
```

Kein Provider, kein `useContext` nötig — Store ist Modul-Singleton. Passt zum bestehenden Muster in `user-management.ts` / `azure-history-store.ts`, die dadurch **nicht angefasst** werden müssen.

## 3. Migration von `src/routes/index.tsx`

Nur der Domain-Teil wandert raus:

| Vorher (Zeile) | Nachher |
|---|---|
| `useState<Project[]>(dashboardData.projects)` (262-265) | `const projects = useProjects()` |
| `setProjects(...)` beim Import (335-342, 407-410) | `dashboardStore.replaceAll(...)` / `.reset()` |
| Full-Blob `useEffect` (392-397) | ersatzlos — Persistenz macht der Store |

**Was bleibt lokal in `index.tsx`**: alle `showXyzDialog`-Booleans, `searchQ`, `periodOffset`, `hydrated`. Das ist UI-State, gehört nicht in den Store.

Downstream-Komponenten (`PerformanceReport`, `ExportDialog`, `ImportPreviewDialog`, `BackupDialog`, `UserManagementDialog` etc.) bekommen ihre Daten heute per Prop. Migration in **zwei Wellen**:
- **Welle A (dieser PR)**: Container in `index.tsx` liest über Hooks, gibt Props weiter wie bisher → Store läuft, aber Consumer bleiben unverändert. Kein Bruch.
- **Welle B (später, ausdrücklich *nicht* Teil dieses Auftrags)**: Consumer, die Re-Render-Hotspots sind, ziehen direkt auf `useActivities()` etc. um. Vorher messen (React DevTools Profiler), dann migrieren — sonst optimieren wir blind.

Das erfüllt „Prop Drilling reduziert" ehrlich: Der Baum *kann* jetzt direkt lesen, wo es nötig ist; wir schleifen aber nicht spekulativ jede Komponente um.

## 4. Import / Backup / Reset

Bestehende Services (`json-import-service.ts`, `backup-service.ts`) rufen heute `setProjects/...`-Setter, die via `onDataChange`-Callback aus `index.tsx` gereicht werden. Neu:

- Diese Services bekommen keinen neuen Import auf den Store — der Callback-Weg bleibt (weniger Kopplung, testbar).
- `index.tsx` mappt den Callback auf `dashboardStore.replaceAll(next)`. Ein Aufrufer, klarer Grenzverlauf.

## 5. Tests (`src/__tests__/lib/store/`)

- `dashboard-store.test.ts`: `getState` / `subscribe` / `emit` bei jedem Mutator, `replaceAll` triggert genau einen Listener-Call, `reset` stellt Fixture wieder her, Referenz-Gleichheit unveränderter Slices bleibt erhalten (wichtig für Selector-Optimierung).
- `dashboard-persistence.test.ts`: Debounce (fake timers), scoped Keys werden geschrieben, korrupter `localStorage`-Eintrag → Fallback + `logger.warn`, `storage`-Event von anderem Tab führt zu `replaceAll`.
- `useDashboardStore.test.tsx`: React-Testing-Library, Selector-Update rendert Consumer neu, unveränderter Selector rendert **nicht** neu (Regression gegen naives Context).
- Erwartete Test-Anzahl: 78 → ≥ 90.

## 6. Handbuch + CHANGELOG (Pflicht per Core-Memory)

- Neuer HelpTopic `state-management` in `src/lib/help-documentation.ts`: was der Store enthält, wie Persistenz funktioniert, warum UI-State lokal bleibt, Debug-Zugriff (`window.__dashboardStore` nur in DEV).
- Erweiterung von `fehlerbehandlung-logging` um Hinweis auf `logger.warn` bei Hydration-Fallback.
- `CHANGELOG.md` Eintrag `1.22.0 - 2026-07-06`.
- `bun run docs:check` grün.

## Nicht Teil dieses Plans (bewusst)

- **Kein zustand-Package.** Wenn wir später Selector-Middleware oder Devtools brauchen, evaluieren wir es dann.
- **Kein globaler UI-State-Store.** Dialoge/Menüs bleiben `useState`.
- **Keine spekulative Migration aller ~30 Komponenten.** Nur Container umziehen; Detail-Migration nach Profiler-Messung.
- **`user-management.ts` und `azure-history-store.ts` bleiben unangetastet** — sie sind bereits gut isolierte Stores mit demselben Pattern. Zusammenlegen wäre reine Kosmetik.

## Technische Details

```text
src/lib/store/
  dashboard-store.ts           (neu)  Singleton, Pub-Sub, Mutatoren
  dashboard-persistence.ts     (neu)  debounced scoped writes + hydration
  useDashboardStore.ts         (neu)  useSyncExternalStore-Bindings
src/__tests__/lib/store/
  dashboard-store.test.ts      (neu)
  dashboard-persistence.test.ts (neu)
  useDashboardStore.test.tsx   (neu)
src/routes/index.tsx           (edit) Domain-useStates raus, Hooks rein
src/lib/help-documentation.ts  (edit) neuer HelpTopic
CHANGELOG.md                   (edit)
```

- Keine neuen Runtime-Dependencies.
- SSR-safe: `useSyncExternalStore` ruft `getServerSnapshot` — liefert Fixture aus `dashboardData`.
- DevTools: `if (import.meta.env.DEV) window.__dashboardStore = dashboardStore;` beim ersten Import.

## Done Criteria

- Domain-State (projects/workPackages/activities/engineer) lebt im Store, nicht in `index.tsx`.
- Persistenz debounced + per-Slice, kein Full-Blob-Write mehr.
- Keine neue Dependency.
- `bun run test` grün, ≥ 90 Tests.
- Consumer, die heute Props bekommen, funktionieren weiter (Welle A). Direct-Read-Migration ist explizit für einen Folge-PR mit Profiler-Evidenz reserviert.
- HelpTopic + CHANGELOG vorhanden, `docs:check` grün.
- Runtime-Fehler (Hydration-Mismatch bei „System-Administrator" vs „Senior Systems Engineer" in `index.tsx:775`) wird nebenbei geprüft — der SSR-Snapshot des Stores liefert deterministische Daten, wodurch der Mismatch verschwinden sollte.
