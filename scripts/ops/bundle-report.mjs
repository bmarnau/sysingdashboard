#!/usr/bin/env node
/**
 * Ops – Bundle-Report (Prompt 2A.7).
 *
 * Läuft nach `bun run build`. Erzeugt `test-report/bundle-report.{json,md}`
 * mit Gesamt-/Chunk-Größen, Trend gegen letzten Lauf und einer Heuristik,
 * welche schweren Libs im Initial-Bundle landen.
 */
import { existsSync, readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const DIST = "dist";
const OUT_JSON = "test-report/bundle-report.json";
const OUT_MD = "test-report/bundle-report.md";
const PREV = "test-report/bundle-report.prev.json";

if (!existsSync(DIST)) {
  console.log("[ops-bundle] dist/ fehlt — bitte zuerst `bun run build`. Überspringe.");
  process.exit(0);
}

function walk(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const full = join(dir, n);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (/\.(js|mjs|css)$/.test(n)) out.push({ path: full.slice(DIST.length + 1), size: st.size });
  }
  return out;
}

const HEAVY_LIBS = [
  "jspdf", "jspdf-autotable", "pdfjs", "react-pdf",
  "recharts", "embla-carousel", "fflate", "date-fns",
];

const files = walk(DIST).sort((a, b) => b.size - a.size);
const totalSize = files.reduce((a, f) => a + f.size, 0);
const jsFiles = files.filter((f) => f.path.endsWith(".js") || f.path.endsWith(".mjs"));

// Entry-Heuristik: alles im _worker.js Bereich oder Chunks ohne Lazy-Hash-Präfix.
// Da @cloudflare/vite-plugin die Struktur bestimmt, sind Assets in `assets/` typisch Lazy-Chunks.
const entryFiles = jsFiles.filter((f) => !f.path.startsWith("assets/") && !/\.lazy\./.test(f.path));
const lazyFiles = jsFiles.filter((f) => f.path.startsWith("assets/"));
const entrySize = entryFiles.reduce((a, f) => a + f.size, 0);
const lazySize = lazyFiles.reduce((a, f) => a + f.size, 0);

// Heavy-Libs im Initial-Bundle: grep über Entry-Chunk-Inhalte (Namen genügen als Signal).
const heavyInEntry = [];
for (const f of entryFiles) {
  try {
    const src = readFileSync(join(DIST, f.path), "utf8");
    for (const lib of HEAVY_LIBS) {
      if (src.includes(`node_modules/${lib}/`) || src.includes(`from"${lib}"`) || src.includes(`from'${lib}'`)) {
        heavyInEntry.push({ chunk: f.path, lib });
      }
    }
  } catch {
    /* binär oder zu groß — ignorieren */
  }
}

// Duplikat-Erkennung via `bun pm ls --all`
let duplicates = [];
try {
  const res = spawnSync("bun", ["pm", "ls", "--all"], { encoding: "utf8", timeout: 30_000 });
  if (res.status === 0) {
    const map = new Map();
    for (const line of res.stdout.split("\n")) {
      const m = /(@?[a-z0-9\-][a-z0-9\-_/.]*)@([0-9]+)\.[0-9]+\.[0-9]+/i.exec(line);
      if (!m) continue;
      const [_, name, major] = m;
      if (name.startsWith("bun:")) continue;
      if (!map.has(name)) map.set(name, new Set());
      map.get(name).add(major);
    }
    for (const [name, majors] of map) {
      if (majors.size > 1) duplicates.push({ name, majors: [...majors] });
    }
  }
} catch {
  /* bun nicht verfügbar */
}

const generatedAt = new Date().toISOString();
const report = {
  generatedAt,
  totals: { totalKB: +(totalSize / 1024).toFixed(1), entryKB: +(entrySize / 1024).toFixed(1), lazyKB: +(lazySize / 1024).toFixed(1) },
  counts: { files: files.length, entryChunks: entryFiles.length, lazyChunks: lazyFiles.length },
  topChunks: files.slice(0, 20).map((f) => ({ path: f.path, kb: +(f.size / 1024).toFixed(1) })),
  heavyInEntry,
  duplicates,
};

// Trend
let prev = null;
try {
  prev = JSON.parse(readFileSync(PREV, "utf8"));
} catch { /* first run */ }
const trend = prev
  ? {
      totalKBDelta: +(report.totals.totalKB - prev.totals.totalKB).toFixed(1),
      entryKBDelta: +(report.totals.entryKB - prev.totals.entryKB).toFixed(1),
      lazyKBDelta: +(report.totals.lazyKB - prev.totals.lazyKB).toFixed(1),
    }
  : { note: "keine Baseline vorhanden" };
report.trend = trend;

mkdirSync("test-report", { recursive: true });
// letzten Report vor Überschreiben nach .prev.json sichern
try {
  if (existsSync(OUT_JSON)) renameSync(OUT_JSON, PREV);
} catch { /* ignore */ }
writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

const md = [
  "# Bundle-Report",
  "",
  `Erzeugt: ${generatedAt}`,
  "",
  `- Gesamt: **${report.totals.totalKB} KB** (${report.counts.files} Dateien)`,
  `- Entry: ${report.totals.entryKB} KB (${report.counts.entryChunks} Chunks)`,
  `- Lazy: ${report.totals.lazyKB} KB (${report.counts.lazyChunks} Chunks)`,
  "",
  "## Trend vs. letzter Lauf",
  prev
    ? `- Gesamt: ${trend.totalKBDelta >= 0 ? "+" : ""}${trend.totalKBDelta} KB · Entry: ${trend.entryKBDelta >= 0 ? "+" : ""}${trend.entryKBDelta} KB · Lazy: ${trend.lazyKBDelta >= 0 ? "+" : ""}${trend.lazyKBDelta} KB`
    : "- Erste Messung — Baseline geschrieben.",
  "",
  "## Top 20 Chunks",
  "| Größe | Datei |",
  "| --- | --- |",
  ...report.topChunks.map((c) => `| ${c.kb} KB | \`${c.path}\` |`),
  "",
  "## Schwere Libs im Initial-Bundle",
  heavyInEntry.length === 0
    ? "Keine gefunden."
    : heavyInEntry.map((h) => `- \`${h.lib}\` in \`${h.chunk}\``).join("\n"),
  "",
  "## Doppelte Abhängigkeiten (Major-Konflikt)",
  duplicates.length === 0
    ? "Keine erkannt."
    : duplicates.map((d) => `- \`${d.name}\`: ${d.majors.map((m) => `v${m}.x`).join(", ")}`).join("\n"),
].join("\n");
writeFileSync(OUT_MD, md);

console.log(`[ops-bundle] Gesamt ${report.totals.totalKB} KB · Entry ${report.totals.entryKB} KB · Lazy ${report.totals.lazyKB} KB`);
console.log(`[ops-bundle] Heavy-Libs in Entry: ${heavyInEntry.length} · Duplikate: ${duplicates.length}`);
console.log(`[ops-bundle] Report: ${OUT_MD}`);
