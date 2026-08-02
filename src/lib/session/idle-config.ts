/**
 * Konfiguration der automatischen Abmeldung bei Inaktivität (Sprint 05C).
 *
 * Priorität des wirksamen Wertes:
 *   1. Systemeinstellung `app_settings.idle_timeout_minutes` (serverseitig, RLS)
 *   2. Umgebungsvariable `VITE_IDLE_TIMEOUT_MINUTES` (Build-Zeit)
 *   3. Standard (5 Minuten)
 *
 * Ungültige Werte werden verworfen (nie „kein Timeout"), der Fallback greift
 * und wird protokolliert — ohne den Rohwert auszugeben.
 */

import { logger } from "@/lib/logger";
import { trySupabase } from "@/integrations/supabase/safe-client";

export const DEFAULT_IDLE_TIMEOUT_MINUTES = 5;
export const MIN_IDLE_TIMEOUT_MINUTES = 1;
export const MAX_IDLE_TIMEOUT_MINUTES = 480;
export const DEFAULT_WARNING_SECONDS = 60;

export const IDLE_TIMEOUT_SETTING_KEY = "idle_timeout_minutes";

export type IdleTimeoutSource = "setting" | "env" | "default";

export interface IdleTimeoutConfig {
  /** Wirksamer Timeout in Minuten. */
  minutes: number;
  /** Herkunft des wirksamen Wertes. */
  source: IdleTimeoutSource;
  /** Grund, falls ein vorhandener Wert verworfen wurde. */
  invalidReason?: string;
}

/**
 * Validiert einen Rohwert (String | Zahl | unbekannt) zu einer gültigen
 * Minutenzahl. Liefert `null`, wenn der Wert unbrauchbar ist.
 */
export function parseIdleTimeoutValue(
  raw: unknown,
): { minutes: number } | { minutes: null; reason: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { minutes: null, reason: "leer" };
  }
  const num = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(num)) return { minutes: null, reason: "keine Zahl" };
  if (!Number.isInteger(num)) return { minutes: null, reason: "keine ganze Zahl" };
  if (num < MIN_IDLE_TIMEOUT_MINUTES) return { minutes: null, reason: "kleiner als Minimum" };
  if (num > MAX_IDLE_TIMEOUT_MINUTES) return { minutes: null, reason: "größer als Maximum" };
  return { minutes: num };
}

/** Ermittelt den Wert aus Systemeinstellung/Env/Standard (rein funktional). */
export function resolveIdleTimeout(input: {
  settingValue?: unknown;
  envValue?: unknown;
}): IdleTimeoutConfig {
  const reasons: string[] = [];

  if (input.settingValue !== undefined && input.settingValue !== null) {
    const parsed = parseIdleTimeoutValue(input.settingValue);
    if (parsed.minutes !== null) return { minutes: parsed.minutes, source: "setting" };
    reasons.push(`Systemeinstellung ungültig (${parsed.reason})`);
  }

  if (input.envValue !== undefined && input.envValue !== null && input.envValue !== "") {
    const parsed = parseIdleTimeoutValue(input.envValue);
    if (parsed.minutes !== null) {
      return {
        minutes: parsed.minutes,
        source: "env",
        ...(reasons.length > 0 ? { invalidReason: reasons.join("; ") } : {}),
      };
    }
    reasons.push(`Umgebungsvariable ungültig (${parsed.reason})`);
  }

  return {
    minutes: DEFAULT_IDLE_TIMEOUT_MINUTES,
    source: "default",
    ...(reasons.length > 0 ? { invalidReason: reasons.join("; ") } : {}),
  };
}

/** Warnzeit in Sekunden: höchstens 60 s, aber nie mehr als 20 % des Timeouts. */
export function warningSecondsFor(minutes: number): number {
  const twentyPercent = Math.floor((minutes * 60) / 5);
  return Math.max(10, Math.min(DEFAULT_WARNING_SECONDS, twentyPercent));
}

function envIdleTimeout(): string | undefined {
  try {
    const raw = import.meta.env.VITE_IDLE_TIMEOUT_MINUTES;
    return typeof raw === "string" ? raw : undefined;
  } catch {
    return undefined;
  }
}

/** Liest die Systemeinstellung; Fehler führen zum Fallback, nie zum Absturz. */
export async function loadIdleTimeoutConfig(): Promise<IdleTimeoutConfig> {
  let settingValue: unknown;
  try {
    const result = trySupabase();
    if (result.ok) {
      const { data, error } = await result.client
        .from("app_settings")
        .select("value")
        .eq("key", IDLE_TIMEOUT_SETTING_KEY)
        .maybeSingle();
      if (!error && data) settingValue = data.value;
    }
  } catch {
    // Netzwerk/Konfiguration — Fallback greift.
  }

  const config = resolveIdleTimeout({ settingValue, envValue: envIdleTimeout() });
  if (config.invalidReason) {
    logger.warn("Ungültige Timeout-Konfiguration verworfen", {
      operation: "idle.config",
      reason: config.invalidReason,
      effectiveMinutes: config.minutes,
      source: config.source,
    });
  }
  return config;
}

/** Schreibt die Systemeinstellung (RLS erzwingt `users.manage`). */
export async function saveIdleTimeoutSetting(minutes: number): Promise<void> {
  const parsed = parseIdleTimeoutValue(minutes);
  if (parsed.minutes === null) {
    throw new Error(
      `Wert muss zwischen ${MIN_IDLE_TIMEOUT_MINUTES} und ${MAX_IDLE_TIMEOUT_MINUTES} Minuten liegen.`,
    );
  }
  const result = trySupabase();
  if (!result.ok) throw new Error("Backend ist derzeit nicht erreichbar.");
  const { data: userData } = await result.client.auth.getUser();
  const { error } = await result.client.from("app_settings").upsert(
    {
      key: IDLE_TIMEOUT_SETTING_KEY,
      value: parsed.minutes,
      updated_by: userData.user?.id ?? null,
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message || "Speichern nicht möglich.");
}
