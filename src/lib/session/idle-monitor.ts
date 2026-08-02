/**
 * Providerneutrale Inaktivitätsüberwachung.
 *
 * Bewusst OHNE Auth-Bezug: der Monitor kennt nur Zeitstempel und ruft
 * Callbacks. Der Auth-Adapter (`logout-service.ts`) hängt daran — damit ist
 * ein späterer Wechsel (z. B. Entra ID) ohne Änderung dieser Datei möglich.
 *
 * Arbeitet mit absoluten Zeitstempeln (`Date.now()`), nicht mit `setTimeout`-
 * Restlaufzeiten: Standby, gedrosselte Hintergrund-Timer und Zeitsprünge
 * werden beim nächsten Tick korrekt erkannt.
 */

export interface IdleMonitorOptions {
  /** Timeout in Millisekunden. */
  timeoutMs: number;
  /** Vorwarnzeit in Millisekunden (vor Ablauf). */
  warningMs: number;
  /** Tick-Intervall; Standard 1000 ms. */
  tickMs?: number;
  onWarn: (msRemaining: number) => void;
  onTick: (msRemaining: number) => void;
  onExpire: () => void;
  /** Wird bei erkannter Nutzeraktivität aufgerufen (z. B. Broadcast). */
  onActivity?: (timestamp: number) => void;
  /** Startwert für die letzte Aktivität (z. B. aus Storage nach Reload). */
  initialLastActivity?: number;
  now?: () => number;
}

export interface IdleMonitorHandle {
  /** Aktivität von außen melden (fremder Tab, „Angemeldet bleiben"). */
  notifyActivity: (timestamp?: number) => void;
  /** Letzter bekannter Aktivitätszeitpunkt. */
  getLastActivity: () => number;
  /** Alle Listener und Timer entfernen. */
  stop: () => void;
}

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "pointerdown",
  "keydown",
  "wheel",
  "scroll",
  "touchstart",
] as const;

const ACTIVITY_THROTTLE_MS = 2000;

export function startIdleMonitor(options: IdleMonitorOptions): IdleMonitorHandle {
  const now = options.now ?? (() => Date.now());
  const tickMs = options.tickMs ?? 1000;

  let lastActivity = options.initialLastActivity ?? now();
  let lastBroadcast = 0;
  let warned = false;
  let expired = false;
  let stopped = false;

  function markActivity(timestamp: number, broadcast: boolean) {
    if (expired || stopped) return;
    if (timestamp <= lastActivity) return;
    lastActivity = timestamp;
    warned = false;
    if (broadcast && timestamp - lastBroadcast >= ACTIVITY_THROTTLE_MS) {
      lastBroadcast = timestamp;
      options.onActivity?.(timestamp);
    }
  }

  function handleUserEvent() {
    markActivity(now(), true);
  }

  function check() {
    if (stopped || expired) return;
    const elapsed = now() - lastActivity;
    const remaining = options.timeoutMs - elapsed;
    if (remaining <= 0) {
      expired = true;
      options.onExpire();
      return;
    }
    if (remaining <= options.warningMs) {
      if (!warned) {
        warned = true;
        options.onWarn(remaining);
      }
      options.onTick(remaining);
    }
  }

  function handleVisibility() {
    // Sichtbarwerden ist KEINE Aktivität — nur eine sofortige Neubewertung.
    if (typeof document !== "undefined" && document.visibilityState === "visible") check();
  }

  const interval = setInterval(check, tickMs);

  if (typeof window !== "undefined") {
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, handleUserEvent, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibility);
  }

  return {
    notifyActivity: (timestamp?: number) => markActivity(timestamp ?? now(), false),
    getLastActivity: () => lastActivity,
    stop: () => {
      if (stopped) return;
      stopped = true;
      clearInterval(interval);
      if (typeof window !== "undefined") {
        for (const evt of ACTIVITY_EVENTS) {
          window.removeEventListener(evt, handleUserEvent);
        }
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    },
  };
}
