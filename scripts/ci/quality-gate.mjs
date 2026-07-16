#!/usr/bin/env node
/**
 * Prompt 2A.10 – Zentrales Quality-Gate für CI.
 *
 * Liest ausschließlich `test-report/technical-test-report.json` und exit-1t,
 * falls dort das Feld `blockers[]` nicht leer ist. Damit ist die Blocker-
 * Definition **einmal** in `scripts/technical-report/build.mjs` gepflegt
 * (Prompt-Vorgabe: kritische Blocker als Single Source of Truth).
 *
 * Ausgabe im GitHub-Actions-kompatiblen Format (Group + Summary).
 */
import { readFileSync, existsSync, appendFileSync } from "node:fs";
import path from "node:path";

const REPORT = path.join(process.cwd(), "test-report", "technical-test-report.json");
const args = new Set(process.argv.slice(2));
const SOFT = args.has("--soft");

function fail(msg) {
  console.error(`::error ::${msg}`);
  process.exit(SOFT ? 0 : 1);
}

if (!existsSync(REPORT)) {
  fail(`Kein technischer Prüfbericht gefunden (${REPORT}). Führe zuerst \`bun run report:technical\` aus.`);
}

let report;
try {
  report = JSON.parse(readFileSync(REPORT, "utf8"));
} catch (err) {
  fail(`Prüfbericht ist kein gültiges JSON: ${err.message}`);
}

const blockers = Array.isArray(report.blockers) ? report.blockers : [];
const summary = report.summary ?? {};

const lines = [];
lines.push(`# CI Quality Gate`);
lines.push("");
lines.push(`- Status: **${report.status}**`);
lines.push(`- Findings: total ${summary.total ?? 0} · CRIT ${summary.critical ?? 0} · HIGH ${summary.high ?? 0}`);
lines.push(`- Blocker: **${blockers.length}**`);
lines.push("");

if (blockers.length === 0) {
  lines.push(`Keine harten Blocker — Gate ist grün.`);
  writeSummary(lines);
  console.log(`[quality-gate] OK — 0 Blocker (status=${report.status}).`);
  process.exit(0);
}

lines.push(`| # | Blocker-ID | Grund | Detail |`);
lines.push(`| ---: | --- | --- | --- |`);
blockers.forEach((b, i) => {
  lines.push(`| ${i + 1} | \`${b.id}\` | ${escape(b.reason)} | ${escape(b.detail ?? "—")} |`);
});
writeSummary(lines);

console.error(`::group::Quality-Gate Blocker (${blockers.length})`);
for (const b of blockers) {
  console.error(`::error title=${b.id}::${b.reason}${b.detail ? ` — ${b.detail}` : ""}`);
}
console.error(`::endgroup::`);

if (SOFT) {
  console.warn(`[quality-gate] SOFT-Modus — ${blockers.length} Blocker vorhanden, Exit 0.`);
  process.exit(0);
}
console.error(`[quality-gate] FAIL — ${blockers.length} Blocker.`);
process.exit(1);

function escape(s) {
  return String(s).replace(/\|/g, "\\|").replace(/\r?\n/g, " ").slice(0, 200);
}

function writeSummary(l) {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (!target) return;
  try {
    appendFileSync(target, l.join("\n") + "\n");
  } catch {
    /* ignore */
  }
}
