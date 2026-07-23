/**
 * Startup-Env-Check für die drei Vite-Client-Variablen.
 *
 * Läuft einmal beim App-Start. Wird eine Variable nicht ins Bundle inlined
 * (typischerweise weil der Build-Runner sie nicht kannte), wird eine klare,
 * secret-freie Anleitung in der Konsole ausgegeben. Optional wird ein
 * globaler Marker gesetzt, den UI-Komponenten lesen können.
 */

import { getAuthConfigurationStatus } from "./config";

// Statischer Zugriff — Vite ersetzt diese Ausdrücke bei jedem Build.
const RAW_URL = import.meta.env.VITE_SUPABASE_URL;
const RAW_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const RAW_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

export interface StartupEnvCheckResult {
  ok: boolean;
  missing: string[];
  invalidReason?: string;
  ranAt: string;
}

function present(v: unknown): boolean {
  return typeof v === "string" && v.length > 0;
}

function buildInstruction(missing: string[], invalidReason?: string): string {
  const lines: string[] = [];
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("  SysIng Dashboard – Auth-Konfiguration unvollständig");
  lines.push("═══════════════════════════════════════════════════════════════");
  if (invalidReason) {
    lines.push(`Grund: ${invalidReason}`);
  }
  if (missing.length > 0) {
    lines.push("Fehlende Vite-Variablen im aktuellen Bundle:");
    for (const key of missing) lines.push(`  • ${key}`);
  }
  lines.push("");
  lines.push("So beheben:");
  lines.push("  1. Sicherstellen, dass Lovable Cloud mit dem Projekt verbunden ist");
  lines.push("     (Sidebar → Backend). Verbindung liefert alle drei Werte");
  lines.push("     automatisch in Preview- und Publish-Build.");
  lines.push("  2. Lokal: Werte in .env eintragen (siehe .env.example) und");
  lines.push("     Dev-Server neu starten. Vite ersetzt VITE_*-Variablen");
  lines.push("     ausschließlich zur Build-Zeit über statische Zugriffe.");
  lines.push("  3. Veröffentlichte App: Im Publish-Dialog „Update" ausführen,");
  lines.push("     damit ein frischer Build mit den aktuellen Env-Werten");
  lines.push("     erzeugt wird.");
  lines.push("");
  lines.push("Hinweis: Es werden keine URLs oder Keys geloggt (secret-frei).");
  lines.push("═══════════════════════════════════════════════════════════════");
  return lines.join("\n");
}

let cached: StartupEnvCheckResult | null = null;

export function runStartupEnvCheck(): StartupEnvCheckResult {
  if (cached) return cached;

  const missing: string[] = [];
  if (!present(RAW_URL)) missing.push("VITE_SUPABASE_URL");
  if (!present(RAW_KEY)) missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!present(RAW_PROJECT_ID)) missing.push("VITE_SUPABASE_PROJECT_ID");

  const authStatus = getAuthConfigurationStatus();
  const invalidReason =
    authStatus.status === "invalid" ? authStatus.invalidReason : undefined;

  const ok = missing.length === 0 && authStatus.status === "configured";

  cached = {
    ok,
    missing,
    invalidReason,
    ranAt: new Date().toISOString(),
  };

  if (!ok) {
    // Ein kompakter Header + mehrzeilige Anleitung.
    console.warn(buildInstruction(missing, invalidReason));

    if (typeof window !== "undefined") {
      try {
        (window as unknown as { __sysing_env_check?: StartupEnvCheckResult }).__sysing_env_check =
          cached;
      } catch {
        // Marker ist optional; Fehler ignorieren.
      }
    }
  } else {
    console.info(
      "[SysIng] Auth-Konfiguration verifiziert (VITE_SUPABASE_URL, _PUBLISHABLE_KEY, _PROJECT_ID vorhanden).",
    );
  }

  return cached;
}

export function getLastStartupEnvCheck(): StartupEnvCheckResult | null {
  return cached;
}
