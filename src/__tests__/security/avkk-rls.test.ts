/**
 * Security-Suite — AVKK / Reference Data (Sprint 07B).
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
const MODULES = [join(ROOT, "src", "lib", "avkk"), join(ROOT, "src", "lib", "reference-data")];

function filesOf(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(dir, f));
}

describe("AVKK / Reference Data — Zugriffsgrenzen", () => {
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
    expect(cache).not.toMatch(/token|password|access_token|session/i);
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
});
