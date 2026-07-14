#!/usr/bin/env node
/**
 * Ops – Build-Checks (Prompt 2A.7).
 *
 * Führt eine Reihe kurzer, defensive Checks aus und schreibt einen Bericht
 * nach `test-report/build-report.{json,md}`. Bricht **nicht** ab — der Report
 * ist die Deliverable. Harte CI-Gates liegen bei den existierenden Prüfungen
 * (docs:check, security:check etc.).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const CHECKS = [
  { id: "typescript", label: "TypeScript", cmd: "bunx", args: ["tsgo", "--noEmit"], soft: false },
  { id: "eslint", label: "ESLint", cmd: "bun", args: ["run", "lint"], soft: true },
  { id: "prettier", label: "Prettier", cmd: "bunx", args: ["prettier", "--check", "."], soft: true },
  { id: "docs-sync", label: "Doku-Sync", cmd: "bun", args: ["run", "docs:check"], soft: false },
  { id: "no-console", label: "No-Console-Guard", cmd: "bun", args: ["run", "lint:no-console"], soft: false },
  { id: "rbac", label: "RBAC-Parität", cmd: "bun", args: ["run", "rbac:check"], soft: false },
  { id: "security", label: "Security-Scan", cmd: "bun", args: ["run", "security:check"], soft: true },
];

function run(check) {
  const started = Date.now();
  const res = spawnSync(check.cmd, check.args, { encoding: "utf8", timeout: 300_000 });
  return {
    id: check.id,
    label: check.label,
    ok: res.status === 0,
    exitCode: res.status,
    soft: check.soft,
    durationMs: Date.now() - started,
    stdoutTail: (res.stdout ?? "").split("\n").slice(-15).join("\n"),
    stderrTail: (res.stderr ?? "").split("\n").slice(-15).join("\n"),
  };
}

const results = CHECKS.map(run);
const generatedAt = new Date().toISOString();
const report = { generatedAt, results };

mkdirSync("test-report", { recursive: true });
writeFileSync("test-report/build-report.json", JSON.stringify(report, null, 2));

const md = [
  "# Build-Report",
  "",
  `Erzeugt: ${generatedAt}`,
  "",
  "| Check | Status | Dauer | Soft-Gate |",
  "| --- | --- | --- | --- |",
  ...results.map(
    (r) =>
      `| ${r.label} | ${r.ok ? "OK" : "FAIL"} | ${(r.durationMs / 1000).toFixed(1)} s | ${r.soft ? "ja" : "nein"} |`,
  ),
  "",
  "## Details fehlgeschlagener Checks",
  "",
  ...results
    .filter((r) => !r.ok)
    .flatMap((r) => [
      `### ${r.label} (exit=${r.exitCode})`,
      "```",
      r.stderrTail || r.stdoutTail || "(keine Ausgabe)",
      "```",
      "",
    ]),
].join("\n");
writeFileSync("test-report/build-report.md", md);

const hardFails = results.filter((r) => !r.ok && !r.soft);
console.log(`[ops-build] ${results.length} Checks, ${hardFails.length} harte Fehler.`);
process.exit(hardFails.length > 0 ? 1 : 0);
