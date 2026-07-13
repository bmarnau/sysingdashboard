#!/usr/bin/env node
/**
 * Erzeugt `e2e/reports/test-report.md` aus dem Playwright-JSON-Report.
 * Läuft nach `bun run test:e2e`. Bricht nicht ab, wenn kein Report da ist
 * (dann ist die Suite entweder gecrashed oder wurde nicht ausgeführt).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const JSON_PATH = resolve(ROOT, "playwright-report/results.json");
const OUT_PATH = resolve(ROOT, "e2e/reports/test-report.md");

function ensureDir(p) {
  const d = dirname(p);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function collect(suite, acc) {
  for (const s of suite.suites ?? []) collect(s, acc);
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const result = t.results?.[t.results.length - 1];
      acc.push({
        file: spec.file,
        title: spec.title,
        status: result?.status ?? "unknown",
        duration: result?.duration ?? 0,
      });
    }
  }
}

function main() {
  ensureDir(OUT_PATH);
  if (!existsSync(JSON_PATH)) {
    writeFileSync(
      OUT_PATH,
      `# E2E Test-Report\n\n_Kein Playwright-JSON-Report unter \`${JSON_PATH}\` gefunden._\n`,
    );
    console.log(`[e2e-report] no results.json – wrote stub to ${OUT_PATH}`);
    return;
  }
  const data = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const rows = [];
  for (const suite of data.suites ?? []) collect(suite, rows);
  const total = rows.length;
  const passed = rows.filter((r) => r.status === "passed").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const skipped = rows.filter((r) => r.status === "skipped").length;

  const lines = [];
  lines.push(`# E2E Test-Report`);
  lines.push("");
  lines.push(`- Gesamt: **${total}**`);
  lines.push(`- Passed: **${passed}**`);
  lines.push(`- Failed: **${failed}**`);
  lines.push(`- Skipped: **${skipped}**`);
  lines.push(`- Erzeugt: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("| Datei | Test | Status | Dauer (ms) |");
  lines.push("|---|---|---|---|");
  for (const r of rows) {
    lines.push(`| \`${r.file}\` | ${r.title} | ${r.status} | ${Math.round(r.duration)} |`);
  }
  writeFileSync(OUT_PATH, lines.join("\n") + "\n");
  console.log(`[e2e-report] wrote ${OUT_PATH} (${total} tests)`);
}

main();
