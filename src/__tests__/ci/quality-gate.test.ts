/**
 * Prompt 2A.10 – Unit-Tests für `scripts/ci/quality-gate.mjs`.
 *
 * Der Gate liest ausschließlich `test-report/technical-test-report.json`.
 * Wir schreiben pro Fall eine Fixture in einen temporären Report-Ordner
 * und rufen das Script als Kindprozess auf. Damit prüfen wir die
 * Exit-Semantik jeder Blocker-Kategorie ohne Vitest-Mocking von Node-APIs.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import "../env/test-instance";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SCRIPT = path.resolve(process.cwd(), "scripts/ci/quality-gate.mjs");

let workdir: string;

function writeReport(blockers: Array<Record<string, string>>, extra: Record<string, unknown> = {}) {
  const dir = path.join(workdir, "test-report");
  mkdirSync(dir, { recursive: true });
  const report = {
    schemaVersion: "1.1.0",
    generatedAt: new Date().toISOString(),
    status: blockers.length ? "failed" : "passed",
    summary: { total: blockers.length, critical: 0, high: 0, medium: 0, low: 0, accepted: 0 },
    findings: [],
    blockers,
    ...extra,
  };
  writeFileSync(path.join(dir, "technical-test-report.json"), JSON.stringify(report));
}

function runGate(args: string[] = []): { code: number; stderr: string; stdout: string } {
  const res = spawnSync("node", [SCRIPT, ...args], {
    cwd: workdir,
    encoding: "utf8",
  });
  return { code: res.status ?? -1, stderr: res.stderr ?? "", stdout: res.stdout ?? "" };
}

describe("CI Quality Gate", () => {
  beforeEach(() => {
    workdir = mkdtempSync(path.join(tmpdir(), "qg-"));
  });
  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  it("should_exitZero_when_reportHasNoBlockers", () => {
    writeReport([]);
    const r = runGate();
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/0 Blocker/);
  });

  it("should_exitOne_when_criticalFindingBlockerPresent", () => {
    writeReport([{ id: "critical-finding", reason: "Critical Finding offen: sec:X", detail: "SQL-Injection" }]);
    const r = runGate();
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/critical-finding/);
  });

  it.each([
    ["high-security-finding", "sec:AUTH-01"],
    ["data-integrity", "backup:restore:corrupt"],
    ["unprotected-privileged-endpoint", "api:sync unprotected"],
    ["secret-leak", "sec:secret-leak in .env"],
    ["rbac-lockout-failed", "admin-lockout regression"],
    ["backup-restore-core-failed", "restore.test.ts failed"],
    ["mandatory-source-missing", "docs report missing"],
  ])("should_exitOne_when_blockerCategory_%s_present", (id, detail) => {
    writeReport([{ id, reason: id, detail }]);
    const r = runGate();
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(new RegExp(id));
  });

  it("should_exitZero_when_softFlagSet_evenWithBlockers", () => {
    writeReport([{ id: "critical-finding", reason: "x", detail: "y" }]);
    const r = runGate(["--soft"]);
    expect(r.code).toBe(0);
  });

  it("should_exitOne_when_reportFileMissing", () => {
    const r = runGate();
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/Kein technischer Prüfbericht/);
  });

  it("should_exitOne_when_reportJsonInvalid", () => {
    const dir = path.join(workdir, "test-report");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "technical-test-report.json"), "not-json");
    const r = runGate();
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/kein gültiges JSON/);
  });
});
