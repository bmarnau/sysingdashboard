/**
 * Security-Suite — AVKK / Reference Data / Customer Data.
 *
 * Statische Absicherung der Architektur- und Sicherheitsgrenzen:
 *  1. Supabase-Zugriff ausschließlich in den Adaptermodulen (Layer-Regel);
 *     UI und Hooks können RLS damit nicht umgehen.
 *  2. Kein Aufruf privilegierter Serverclients (`client.server`, Service-Role)
 *     aus den Fachmodulen.
 *  3. Schreibpfade laufen über die Fassade, nicht am Service vorbei.
 *  4. Die bewusst akzeptierte Linterwarnung zu `avkk_can_write` ist als
 *     begründetes Finding hinterlegt — sie darf nicht stillschweigend
 *     verschwinden.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MODULES = [
  join(ROOT, "src", "lib", "avkk"),
  join(ROOT, "src", "lib", "reference-data"),
  join(ROOT, "src", "lib", "customer-data"),
];

function filesOf(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(dir, f));
}

describe("AVKK / Reference Data / Customer Data — Zugriffsgrenzen", () => {
  it("should_importSupabaseClientOnlyInAdapter_when_scanningDomainModules", () => {
    const offenders: string[] = [];
    for (const dir of MODULES) {
      for (const file of filesOf(dir)) {
        const src = readFileSync(file, "utf8");
        if (/@\/integrations\/supabase\/client/.test(src) && !file.endsWith("adapter.ts")) {
          offenders.push(file.replace(ROOT, ""));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("should_notUsePrivilegedServerClient_when_scanningDomainModules", () => {
    const offenders: string[] = [];
    for (const dir of MODULES) {
      for (const file of filesOf(dir)) {
        const src = readFileSync(file, "utf8");
        if (/client\.server|supabaseAdmin|SERVICE_ROLE/.test(src)) {
          offenders.push(file.replace(ROOT, ""));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("should_notAccessAvkkTablesFromUiLayer_when_scanningComponentsAndHooks", () => {
    const offenders: string[] = [];
    const scan = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) scan(full);
        else if (/\.(ts|tsx)$/.test(entry.name)) {
          const src = readFileSync(full, "utf8");
          if (/from\("(avkk_|reference_)/.test(src)) offenders.push(full.replace(ROOT, ""));
        }
      }
    };
    scan(join(ROOT, "src", "components"));
    scan(join(ROOT, "src", "hooks"));
    expect(offenders).toEqual([]);
  });

  it("should_keepReferenceDataCacheFreeOfCredentials_when_snapshotWritten", () => {
    const cache = readFileSync(join(ROOT, "src", "lib", "reference-data", "cache.ts"), "utf8");
    // sessionStorage/localStorage sind erlaubt; Zugangsdaten nicht.
    expect(cache).not.toMatch(/access_token|refresh_token|password|apiKey|bearer/i);
  });
});

describe("avkk_can_write — akzeptierte, begründete Ausnahme", () => {
  const findings = JSON.parse(
    readFileSync(join(ROOT, "scripts", "technical-report", "manual-findings.json"), "utf8"),
  ) as { findings: { id: string; status?: string; description?: string }[] };

  it("should_documentAcceptedFinding_when_functionExecutableByAuthenticated", () => {
    const entry = findings.findings.find((f) => f.id === "man:avkk-can-write-execute");
    expect(entry, "Finding man:avkk-can-write-execute fehlt in manual-findings.json").toBeDefined();
    expect(entry?.status).toBe("accepted");
    expect(entry?.description ?? "").toMatch(/ADR-0025/);
  });

  it("should_documentAcceptedFinding_when_peopleDirectoryIsSecurityDefiner", () => {
    const entry = findings.findings.find((f) => f.id === "man:avkk-people-directory-definer");
    expect(
      entry,
      "Finding man:avkk-people-directory-definer fehlt in manual-findings.json",
    ).toBeDefined();
    expect(entry?.status).toBe("accepted");
  });
});

/**
 * SEC-01 (Issue #89) — die Härtung ist Bestandteil einer Migration und muss
 * auch nach einem Neuaufbau aus `supabase/migrations` gelten. Der Test prüft
 * daher die Migrationsquelle, nicht den Live-Stand.
 */
describe("SEC-01 — Härtung ist in der Migrationsquelle verankert", () => {
  const migrationDir = join(ROOT, "supabase", "migrations");
  const sql = readdirSync(migrationDir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(migrationDir, f), "utf8"))
    .join("\n");

  it("should_restrictAppSettingsReads_when_migrationsApplied", () => {
    expect(sql).toMatch(/DROP POLICY IF EXISTS app_settings_read_authenticated/);
    expect(sql).toMatch(/app_settings_read_public_keys/);
    expect(sql).toMatch(/idle_timeout_minutes/);
    expect(sql).toMatch(/app_settings_read_admin/);
    expect(sql).toMatch(/users\.manage/);
  });

  it("should_hardenSecurityDefinerFunctions_when_migrationsApplied", () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.avkk_can_write/);
    expect(sql).toMatch(/SET search_path = ''/);
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.avkk_can_write\(uuid\) FROM PUBLIC/);
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.avkk_people_directory\(\) FROM PUBLIC/);
  });

  it("should_provideReproducibleDatabaseTest_when_sec01Applied", () => {
    const test = readFileSync(
      join(ROOT, "supabase", "tests", "sec01-settings-and-avkk-definer.sql"),
      "utf8",
    );
    expect(test).toMatch(/id,display_name,role,status/);
    expect(test).toMatch(/sec01\.probe\.private/);
    expect(test).toMatch(/ROLLBACK;/);
  });
});
