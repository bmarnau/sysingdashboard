/**
 * Refresh-Signal für Daten-Hooks.
 *
 * Hooks hängen den Rückgabewert in ihre Effekt-Abhängigkeiten; nach einem
 * zentralen Refresh laden sie damit über ihre bestehende Fassade neu.
 */
import { useSyncExternalStore } from "react";
import { refreshGeneration, subscribeRefresh } from "@/lib/refresh/refresh-coordinator";

export function useRefreshSignal(): number {
  return useSyncExternalStore(
    (cb) => subscribeRefresh(cb),
    () => refreshGeneration(),
    () => 0,
  );
}
