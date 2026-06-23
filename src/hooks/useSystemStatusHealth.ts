/**
 * useSystemStatusHealth
 *
 * Flüchtiger In-Memory-Health-Check für `/api/status`. Wird beim Start
 * (in `__root.tsx`) einmal getriggert und kann aus dem
 * `SystemStatusDialog` manuell erneut ausgelöst werden. Bewusst keine
 * Persistenz — nach Reload zählt nur der aktuelle Build.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";

export interface SystemStatusHealth {
  checkedAt: string | null;
  apiReachable: boolean | null;
  mode: "development" | "production" | null;
  azureAllowed: boolean | null;
  lastError: string | null;
  inFlight: boolean;
}

const initial: SystemStatusHealth = {
  checkedAt: null,
  apiReachable: null,
  mode: null,
  azureAllowed: null,
  lastError: null,
  inFlight: false,
};

let state: SystemStatusHealth = initial;
const listeners = new Set<() => void>();

function setState(patch: Partial<SystemStatusHealth>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return initial;
}

export async function runSystemStatusCheck(): Promise<void> {
  if (typeof window === "undefined") return;
  if (state.inFlight) return;
  setState({ inFlight: true });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch("/api/status", { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as {
      mode?: "development" | "production";
      azure?: { allowed?: boolean };
    };
    setState({
      checkedAt: new Date().toISOString(),
      apiReachable: true,
      mode: json.mode ?? null,
      azureAllowed: json.azure?.allowed ?? null,
      lastError: null,
      inFlight: false,
    });
  } catch (err) {
    setState({
      checkedAt: new Date().toISOString(),
      apiReachable: false,
      lastError: err instanceof Error ? err.message : String(err),
      inFlight: false,
    });
  } finally {
    clearTimeout(timer);
  }
}

let bootstrapped = false;
export function bootstrapSystemStatusCheck(): void {
  if (bootstrapped || typeof window === "undefined") return;
  bootstrapped = true;
  // Nicht blockierend, nach dem Mount triggern.
  setTimeout(() => {
    void runSystemStatusCheck();
  }, 250);
}

export function useSystemStatusHealth() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const refresh = useCallback(() => {
    void runSystemStatusCheck();
  }, []);
  useEffect(() => {
    if (snapshot.checkedAt === null && !snapshot.inFlight) {
      void runSystemStatusCheck();
    }
  }, [snapshot.checkedAt, snapshot.inFlight]);
  return { ...snapshot, refresh };
}
