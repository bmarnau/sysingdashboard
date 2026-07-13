#!/usr/bin/env node
/**
 * Technical-Debt-Analyse.
 *
 * Aggregiert leicht messbare Debt-Signale zu einem JSON-Report:
 *  - Anzahl `TODO` / `FIXME` / `HACK` in `src/`
 *  - Anzahl `@ts-expect-error` / `@ts-ignore`
 *  - Anzahl Dateien > 500 Zeilen (Refactor-Kandidaten)
 *
 * Bricht nicht ab — dient als Trend-Metrik im technischen Prüfbericht.
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const SRC = resolve(ROOT, "src");
const REPORT_DIR = resolve(ROOT, "test-report");
const REPORT_FILE = join(REPORT_DIR, "tech-debt.json");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|mjs|js|jsx)$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(SRC);
let todos = 0;
let tsIgnores = 0;
const bigFiles = [];

for (const f of files) {
  const src = readFileSync(f, "utf8");
  const lines = src.split(/\r?\n/).length;
  if (lines > 500) bigFiles.push({ path: f.slice(ROOT.length + 1), lines });
  todos += (src.match(/\b(TODO|FIXME|HACK)\b/g) ?? []).length;
  tsIgnores += (src.match(/@ts-(expect-error|ignore)/g) ?? []).length;
}
bigFiles.sort((a, b) => b.lines - a.lines);

const report = {
  generatedAt: new Date().toISOString(),
  filesScanned: files.length,
  todos,
  tsIgnores,
  bigFiles: bigFiles.slice(0, 25),
};

mkdirSync(REPORT_DIR, { recursive: true });
writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

console.log(
  `[debt] ${files.length} Dateien, ${todos} TODO/FIXME/HACK, ${tsIgnores} ts-ignore, ${bigFiles.length} Dateien > 500 Zeilen`,
);
console.log(`[debt] Report: ${REPORT_FILE}`);
