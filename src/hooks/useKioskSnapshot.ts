import { useEffect, useState } from "react";
import {
  KIOSK_REFRESH_MS,
  type KioskDataProvider,
  type KioskSnapshot,
} from "@/lib/kiosk/kiosk-contract";

export interface KioskSnapshotState {
  status: "loading" | "ready" | "error";
  snapshot: KioskSnapshot | null;
  refreshError: string | null;
  lastRefreshedAt: string | null;
}

export function useKioskSnapshot(provider: KioskDataProvider): KioskSnapshotState {
  const [state, setState] = useState<KioskSnapshotState>({
    status: "loading",
    snapshot: null,
    refreshError: null,
    lastRefreshedAt: null,
  });

  useEffect(() => {
    let cancelled = false;
    let lastGood: KioskSnapshot | null = null;

    const load = async () => {
      try {
        const snapshot = await provider.getSnapshot();
        if (cancelled) return;
        lastGood = snapshot;
        setState({
          status: "ready",
          snapshot,
          refreshError: null,
          lastRefreshedAt: snapshot.generatedAt,
        });
      } catch {
        if (cancelled) return;
        if (lastGood) {
          setState((current) => ({
            ...current,
            status: "ready",
            snapshot: lastGood,
            refreshError: "Aktualisierung fehlgeschlagen",
          }));
        } else {
          setState({
            status: "error",
            snapshot: null,
            refreshError: "Aktualisierung fehlgeschlagen",
            lastRefreshedAt: null,
          });
        }
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), KIOSK_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [provider]);

  return state;
}
