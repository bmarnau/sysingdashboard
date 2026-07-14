#!/usr/bin/env node
/**
 * Ops – Aggregator-Report (Prompt 2A.7).
 *
 * Fasst die Einzelberichte (Build/Bundle/Perf/Stability/Compat/Betrieb) zu
 * einem konsolidierten `test-report/ops-report.{json,md}` zusammen und
 * schreibt beim ersten Lauf `test-report/ops-baseline.json`. Danach werden
 * Deltas > 20 % als Warnung (nicht Fail) markiert. Kein Hard-Gate.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const BASE = "test-report/ops-baseline.json";
const OUT_JSON = "test-report/ops-report.json";
const OUT_MD = "test-report/ops-report.md";

function readJson(p, fallback = null) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return fallback; }
}

const build = readJson("test-report/build-report.json", { results: [] });
const bundle = readJson("test-report/bundle-report.json", null);
const perf = readJson("test-report/perf-raw.json", null);
const stability = readJson("test-report/stability-raw.json", null);
const ops = readJson("test-report/ops-checks.json", null);

const generatedAt = new Date().toISOString();
const snapshot = {
  build: {
    hardFails: build.results.filter((r) => !r.ok && !r.soft).length,
    softFails: build.results.filter((r) => !r.ok && r.soft).length,
    total: build.results.length,
  },
  bundle: bundle ? bundle.totals : null,
  perf: perf ? { startupMs: perf.startupMs ?? null } : null,
  stability: stability ? { dialogLoopMs: stability.dialogLoopMs ?? null } : null,
};

const baseline = existsSync(BASE) ? readJson(BASE) : null;
if (!baseline) {
  mkdirSync("test-report", { recursive: true });
  writeFileSync(BASE, JSON.stringify({ createdAt: generatedAt, ...snapshot }, null, 2));
}

function pctDelta(current, prev) {
  if (prev == null || current == null || prev === 0) return null;
  return +(((current - prev) / prev) * 100).toFixed(1);
}

const warnings = [];
if (baseline && bundle) {
  const d = pctDelta(bundle.totals.totalKB, baseline.bundle?.totalKB);
  if (d != null && Math.abs(d) > 20)
    warnings.push(`Bundle-Gesamtgröße ${d > 0 ? "+" : ""}${d}% gegenüber Baseline (${baseline.bundle.totalKB} KB → ${bundle.totals.totalKB} KB).`);
}
if (baseline && perf?.startupMs && baseline.perf?.startupMs) {
  const d = pctDelta(perf.startupMs, baseline.perf.startupMs);
  if (d != null && d > 20) warnings.push(`Startzeit +${d}% ggü. Baseline.`);
}

const report = { generatedAt, snapshot, baseline, warnings };
writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

const md = [
  "# Ops-Report",
  "",
  `Erzeugt: ${generatedAt}`,
  "",
  "## Build",
  `- Checks gesamt: ${snapshot.build.total} · Harte Fehler: ${snapshot.build.hardFails} · Soft-Fehler: ${snapshot.build.softFails}`,
  "",
  "## Bundle",
  bundle
    ? `- Gesamt ${bundle.totals.totalKB} KB · Entry ${bundle.totals.entryKB} KB · Lazy ${bundle.totals.lazyKB} KB · Heavy-Libs in Entry: ${bundle.heavyInEntry.length} · Duplikate: ${bundle.duplicates.length}`
    : "- Kein Bundle-Report verfügbar.",
  "",
  "## Performance",
  perf ? `- Startzeit (ms): ${perf.startupMs ?? "n/a"}` : "- Kein Perf-Raw verfügbar (Playwright-Suite noch nicht gelaufen).",
  "",
  "## Stabilität",
  stability ? `- Dialog-Loop (ms): ${stability.dialogLoopMs ?? "n/a"}` : "- Kein Stability-Raw verfügbar.",
  "",
  "## Kompatibilität",
  "- Chromium (Standard). Firefox opt-in via `RUN_FIREFOX=1`, WebKit via `RUN_WEBKIT=1`.",
  "",
  "## Betrieb",
  ops ? `- Health OK: ${ops.healthOk} · Secrets in Payload: ${ops.secretLeaks} · Rollback-Doku vorhanden: ${ops.rollbackDocumented}` : "- Kein Ops-Check verfügbar.",
  "",
  "## Trends / Warnungen",
  warnings.length === 0 ? "Keine." : warnings.map((w) => `- ${w}`).join("\n"),
  "",
  "## Bekannte Einschränkungen",
  "- Baselines sind maschinenabhängig — CI-Runner-Wechsel verzerrt Trends.",
  "- `performance.memory` nur in Chromium verfügbar.",
  "- WebKit- und Firefox-Läufe sind opt-in wegen CI-Kosten.",
  "- Kein Load-/Stress-Testing.",
].join("\n");
writeFileSync(OUT_MD, md);

console.log(`[ops-report] Warnungen: ${warnings.length}`);
if (!baseline) console.log(`[ops-report] Baseline geschrieben: ${BASE}`);
console.log(`[ops-report] ${OUT_MD}`);
