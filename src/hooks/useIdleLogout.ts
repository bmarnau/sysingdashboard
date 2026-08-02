/**
 * Verdrahtung: Inaktivitätsmonitor + Tab-Synchronisierung + Logout-Adapter.
 *
 * Wird ausschließlich innerhalb des geschützten Bereichs (`_authenticated`)
 * gemountet — auf `/auth`, `/reset-password` und der Startseite läuft keine
 * Überwachung.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  loadIdleTimeoutConfig,
  warningSecondsFor,
  type IdleTimeoutConfig,
} from "@/lib/session/idle-config";
import { startIdleMonitor, type IdleMonitorHandle } from "@/lib/session/idle-monitor";
import {
  openIdleChannel,
  persistLastActivity,
  readLastActivity,
  type IdleChannelHandle,
} from "@/lib/session/idle-channel";
import { performLogout } from "@/lib/session/logout-service";

export interface UseIdleLogoutResult {
  /** Wirksame Konfiguration (null, solange sie geladen wird). */
  config: IdleTimeoutConfig | null;
  /** Warnung sichtbar. */
  warning: boolean;
  /** Verbleibende Sekunden bis zur Abmeldung. */
  secondsRemaining: number;
  /** „Angemeldet bleiben". */
  staySignedIn: () => void;
  /** „Jetzt abmelden". */
  logoutNow: () => void;
}

export function useIdleLogout(enabled = true): UseIdleLogoutResult {
  const navigate = useNavigate();
  const [config, setConfig] = useState<IdleTimeoutConfig | null>(null);
  const [warning, setWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const monitorRef = useRef<IdleMonitorHandle | null>(null);
  const channelRef = useRef<IdleChannelHandle | null>(null);

  const go = useCallback(
    (target: string) => {
      // Router-Navigation bevorzugt; harte Navigation als Fallback.
      try {
        void navigate({ to: target, replace: true });
      } catch {
        window.location.replace(target);
      }
    },
    [navigate],
  );

  useEffect(() => {
    let cancelled = false;
    void loadIdleTimeoutConfig().then((c) => {
      if (!cancelled) setConfig(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !config || typeof window === "undefined") return;

    const timeoutMs = config.minutes * 60_000;
    const warningMs = warningSecondsFor(config.minutes) * 1000;

    const channel = openIdleChannel((message) => {
      if (message.type === "logout") {
        setWarning(false);
        void performLogout({ reason: "idle_timeout", navigate: go });
        return;
      }
      monitorRef.current?.notifyActivity(message.timestamp);
      setWarning(false);
    });
    channelRef.current = channel;

    const restored = readLastActivity(timeoutMs);
    const monitor = startIdleMonitor({
      timeoutMs,
      warningMs,
      ...(restored !== null ? { initialLastActivity: restored } : {}),
      onActivity: (timestamp) => {
        persistLastActivity(timestamp);
        channel.post({ type: "activity", timestamp });
        setWarning(false);
      },
      onWarn: (remaining) => {
        setWarning(true);
        setSecondsRemaining(Math.ceil(remaining / 1000));
      },
      onTick: (remaining) => setSecondsRemaining(Math.max(0, Math.ceil(remaining / 1000))),
      onExpire: () => {
        setWarning(false);
        channel.post({ type: "logout", timestamp: Date.now() });
        void performLogout({ reason: "idle_timeout", navigate: go });
      },
    });
    monitorRef.current = monitor;
    persistLastActivity(monitor.getLastActivity());

    return () => {
      monitor.stop();
      channel.close();
      monitorRef.current = null;
      channelRef.current = null;
    };
  }, [enabled, config, go]);

  const staySignedIn = useCallback(() => {
    const timestamp = Date.now();
    monitorRef.current?.notifyActivity(timestamp);
    persistLastActivity(timestamp);
    channelRef.current?.post({ type: "activity", timestamp });
    setWarning(false);
  }, []);

  const logoutNow = useCallback(() => {
    setWarning(false);
    channelRef.current?.post({ type: "logout", timestamp: Date.now() });
    void performLogout({ reason: "manual", navigate: go });
  }, [go]);

  return { config, warning, secondsRemaining, staySignedIn, logoutNow };
}
