import { useEffect, useState } from "react";
import { trySupabase } from "@/integrations/supabase/safe-client";
import { performLogout, type LogoutReason } from "@/lib/session/logout-service";
import {
  checkKioskSession,
  type KioskSessionCheckResult,
  type KioskSessionWatchdogClient,
} from "@/lib/kiosk/kiosk-session-watchdog";

export const KIOSK_SESSION_RECHECK_MS = 60_000;

export type KioskSessionWatchdogStatus = "checking" | "valid" | "unavailable";

export interface UseKioskSessionWatchdogOptions {
  userId: string;
  enabled?: boolean;
  check?: () => Promise<KioskSessionCheckResult>;
  logout?: (reason: LogoutReason) => Promise<boolean>;
}

async function defaultCheck(userId: string): Promise<KioskSessionCheckResult> {
  const result = trySupabase();
  if (!result.ok) return "unavailable";
  return checkKioskSession(result.client as unknown as KioskSessionWatchdogClient, userId);
}

async function defaultLogout(reason: LogoutReason): Promise<boolean> {
  return performLogout({ reason });
}

export function useKioskSessionWatchdog({
  userId,
  enabled = true,
  check,
  logout = defaultLogout,
}: UseKioskSessionWatchdogOptions): { status: KioskSessionWatchdogStatus } {
  const [status, setStatus] = useState<KioskSessionWatchdogStatus>(enabled ? "checking" : "valid");

  useEffect(() => {
    if (!enabled) {
      setStatus("valid");
      return;
    }

    let cancelled = false;
    const runCheck = check ?? (() => defaultCheck(userId));

    const validate = async () => {
      const result = await runCheck();
      if (cancelled) return;
      if (result === "valid") {
        setStatus("valid");
        return;
      }
      if (result === "unavailable") {
        setStatus("unavailable");
        return;
      }
      setStatus("checking");
      await logout(result === "inactive" ? "account_inactive" : "session_invalid");
    };

    void validate();
    const interval = window.setInterval(() => void validate(), KIOSK_SESSION_RECHECK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [check, enabled, logout, userId]);

  return { status };
}
