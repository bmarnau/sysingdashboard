#!/usr/bin/env node
/**
 * Erzeugt für den zentralen technischen Prüfbericht einen laufaktuellen
 * Operations-/Build-Nachweis direkt aus den GitHub-Actions-`needs`-Ergebnissen.
 *
 * Hintergrund: `test-report/` enthält historisch versionierte Berichte. Ein
 * frischer CI-Lauf darf diese Dateien nicht still als aktuellen Nachweis
 * wiederverwenden. Dieses Skript schreibt deshalb nur Evidenz des aktuellen
 * Workflow-Laufs und ergänzt – sofern vorhanden – den aktuellen Bundle-Report.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT_DIR = "test-report";
const SOFT_JOBS = new Set(["a11y", "debt"]);

function readJson(path, fallback = null) {
  try {
    return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback;
  } catch {
    return fallback;
  }
}

function parseNeeds() {
  const raw = process.env.CI_JOB_RESULTS;
  if (!raw) throw new Error("CI_JOB_RESULTS fehlt");
  const needs = JSON.parse(raw);
  return Object.entries(needs).map(([id, value]) => {
    const result = value?.result ?? "unknown";
    return {
      id,
      label: id,
      ok: result === "success",
      result,
      exitCode: result === "success" ? 0 : 1,
      soft: SOFT_JOBS.has(id),
      durationMs: null,
      stdoutTail: `GitHub Actions job result: ${result}`,
      stderrTail: "",
    };
  });
}

function main() {
  const results = parseNeeds();
  const generatedAt = new Date().toISOString();
  const hardFails = results.filter((r) => !r.ok && !r.soft);
  const softFails = results.filter((r) => !r.ok && r.soft);
  const bundle = readJson(`${OUT_DIR}/bundle.json`);
  const bundleTotals = bundle
    ? {
        totalKB: +((bundle.totalSize ?? 0) / 1024).toFixed(1),
        entryKB: null,
        lazyKB: null,
      }
    : null;
  const warnings = softFails.map((r) => `Warn-Only-Job ${r.id}: ${r.result}`);

  mkdirSync(OUT_DIR, { recursive: true });

  const buildReport = {
    generatedAt,
    source: "github-actions-needs",
    runId: process.env.GITHUB_RUN_ID ?? null,
    testedSha: process.env.CI_TESTED_SHA ?? process.env.GITHUB_SHA ?? null,
    results,
  };
  writeFileSync(`${OUT_DIR}/build-report.json`, JSON.stringify(buildReport, null, 2));
  writeFileSync(
    `${OUT_DIR}/build-report.md`,
    [
      "# Build-Report — aktueller CI-Lauf",
      "",
      `Erzeugt: ${generatedAt}`,
      `Run: ${buildReport.runId ?? "—"}`,
      `Getesteter Commit: ${buildReport.testedSha ?? "—"}`,
      "",
      "| Job | Ergebnis | Gate |",
      "| --- | --- | --- |",
      ...results.map(
        (r) => `| ${r.id} | ${r.result} | ${r.soft ? "warn-only" : "hart"} |`,
      ),
      "",
    ].join("\n"),
  );

  const opsReport = {
    generatedAt,
    source: "github-actions-needs",
    run: {
      id: process.env.GITHUB_RUN_ID ?? null,
      sha: buildReport.testedSha,
      event: process.env.GITHUB_EVENT_NAME ?? null,
    },
    snapshot: {
      build: {
        hardFails: hardFails.length,
        softFails: softFails.length,
        total: results.length,
      },
      bundle: bundleTotals,
      perf: null,
      stability: null,
    },
    baseline: null,
    warnings,
  };
  writeFileSync(`${OUT_DIR}/ops-report.json`, JSON.stringify(opsReport, null, 2));
  writeFileSync(
    `${OUT_DIR}/ops-report.md`,
    [
      "# Ops-Report — aktueller CI-Lauf",
      "",
      `Erzeugt: ${generatedAt}`,
      `Run: ${opsReport.run.id ?? "—"}`,
      `Getesteter Commit: ${opsReport.run.sha ?? "—"}`,
      "",
      "## CI-Gates",
      `- Jobs gesamt: ${results.length}`,
      `- Harte Fehler: ${hardFails.length}`,
      `- Warn-Only-Fehler: ${softFails.length}`,
      "",
      "## Bundle",
      bundleTotals ? `- Gesamt: ${bundleTotals.totalKB} KB` : "- Kein aktueller Bundle-Report verfügbar.",
      "",
      "## Warnungen",
      warnings.length ? warnings.map((w) => `- ${w}`).join("\n") : "Keine.",
      "",
    ].join("\n"),
  );

  console.log(
    `[ci-evidence] ${results.length} Jobs · hard=${hardFails.length} · soft=${softFails.length} · bundle=${bundle ? "yes" : "no"}`,
  );
}

main();
