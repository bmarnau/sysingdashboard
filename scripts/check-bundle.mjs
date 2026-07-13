#!/usr/bin/env node
/**
 * Bundle-/Performance-Prüfung.
 *
 * Läuft **nach** `bun run build` und meldet die Größe der größten JS-Chunks
 * im `dist/`-Verzeichnis. Bricht nicht ab — Ziel ist ein reproduzierbarer
 * Bericht für den technischen Prüfbericht. Ein hartes Bundle-Budget wird
 * bewusst noch nicht gesetzt (siehe ADR-0006-Denkweise: erst messen, dann
 * gaten).
 */
import { existsSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const DIST = resolve(ROOT, "dist");
const REPORT_DIR = resolve(ROOT, "test-report");
const REPORT_FILE = join(REPORT_DIR, "bundle.json");

if (!existsSync(DIST)) {
  console.log("[bundle] dist/ fehlt — führe zuerst `bun run build` aus. Kein Fehler, überspringe.");
  process.exit(0);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (/\.(js|mjs|css)$/.test(name)) out.push({ path: full.slice(DIST.length + 1), size: st.size });
  }
  return out;
}

const files = walk(DIST).sort((a, b) => b.size - a.size);
const totalSize = files.reduce((a, f) => a + f.size, 0);
const top = files.slice(0, 15);

mkdirSync(REPORT_DIR, { recursive: true });
writeFileSync(
  REPORT_FILE,
  JSON.stringify({ generatedAt: new Date().toISOString(), totalSize, top, all: files }, null, 2),
);

console.log(`[bundle] Gesamt: ${(totalSize / 1024).toFixed(1)} KB, ${files.length} Assets`);
console.log("[bundle] Top 15:");
for (const f of top) {
  console.log(`  ${(f.size / 1024).toFixed(1).padStart(8)} KB  ${f.path}`);
}
console.log(`[bundle] Report: ${REPORT_FILE}`);
