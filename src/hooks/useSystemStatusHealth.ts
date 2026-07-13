/**
 * useSystemStatusHealth
 *
 * Flüchtiger In-Memory-Health-Check für `/api/status`. Wird beim Start
 * (in `__root.tsx`) einmal getriggert und kann aus dem
 * `SystemStatusDialog` manuell erneut ausgelöst werden. Bewusst keine
 * Persistenz — nach Reload zählt nur der aktuelle Build.
 *
 * Sicherheit: das Frontend liest niemals ENV. Alle ENV-/Secret-/Azure-
 * Informationen kommen ausschließlich aus dem secret-freien Payload
 * von `/api/status` (nur Booleans und Variablennamen).
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";

export interface AzureComponentStatus {
  configured: boolean;
}

export interface SystemStatusPayload {
  application?: {
    name?: string | null;
    mode?: "development" | "production" | null;
    startedAt?: string | null;
  };
  github?: {
    repositoryUrl?: string | null;
    branch?: string | null;
    commit?: string | null;
  };
  lovable?: {
    projectId?: string | null;
    publishedUrl?: string | null;
    lastDeploymentAt?: string | null;
    status?: "configured" | "not_configured" | null;
  };
  azure?: {
    allowed?: boolean | null;
    authMode?: string | null;
    sql?: AzureComponentStatus | null;
    table?: AzureComponentStatus | null;
    storage?: AzureComponentStatus | null;
    lastConnectionTestAt?: string | null;
    missingEnv?: string[] | null;
  };
  security?: {
    authMode?: string | null;
    rbac?: { enabled?: boolean; rolesCount?: number; permissionsCount?: number } | null;
    secretManager?: { enabled?: boolean; missing?: string[] } | null;
    envValidation?: { ok?: boolean; missing?: string[] } | null;
    keyVault?: { configured?: boolean } | null;
  };
  data?: {
    lastAzureExportAt?: string | null;
    lastAzureImportAt?: string | null;
  };
  sync?: { lastRun?: string | null; lastError?: string | null } | null;
  mode?: "development" | "production" | null;
  timestamp?: string | null;
}

export interface SystemStatusHealth {
  checkedAt: string | null;
  apiReachable: boolean | null;
  mode: "development" | "production" | null;
  azureAllowed: boolean | null;
  lastError: string | null;
  /** Correlation-ID der letzten Antwort (aus X-Correlation-Id-Header). */
  lastCorrelationId: string | null;
  inFlight: boolean;
  payload: SystemStatusPayload | null;
}

const initial: SystemStatusHealth = {
  checkedAt: null,
  apiReachable: null,
  mode: null,
  azureAllowed: null,
  lastError: null,
  lastCorrelationId: null,
  inFlight: false,
  payload: null,
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
    const json = (await res.json()) as SystemStatusPayload;
    setState({
      checkedAt: new Date().toISOString(),
      apiReachable: true,
      mode: json.application?.mode ?? json.mode ?? null,
      azureAllowed: json.azure?.allowed ?? null,
      lastError: null,
      inFlight: false,
      payload: json,
    });
  } catch (err) {
    setState({
      checkedAt: new Date().toISOString(),
      apiReachable: false,
      lastError: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
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
