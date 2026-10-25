#!/usr/bin/env node
/**
 * Projektdoku-Aktualitätscheck (ergänzt `docs:check`, das nur das Handbuch prüft).
 *
 *  1. Der Tracker `docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml` ist gültiges YAML.
 *  2. Jeder im Tracker, in README.md und in docs/CURRENT-STATUS.md genannte
 *     Pfad `docs/….md|yaml` existiert (keine toten Verweise).
 *  3. `Stand:` in docs/CURRENT-STATUS.md ist nicht älter als der jüngste
 *     Fortschrittseintrag des Trackers (Toleranz: 0 Tage).
 *  4. `Stand:` im Entwicklungstagebuch ist nicht älter als der jüngste Eintrag
 *     des Trackers (Toleranz: 0 Tage).
 *  5. Die Version im Tagebuch-Kopf entspricht der obersten CHANGELOG-Version.
 *
 * Exitcode 0 = ok, 1 = Verstoß. Aufruf: `npm run docs:project`.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const errors = [];
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

let tracker;
try {
  tracker = parse(read("docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml"));
} catch (e) {
  errors.push(`Tracker nicht lesbar oder kein gültiges YAML: ${e.message}`);
}

const files = {
  tracker: "docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml",
  status: "docs/CURRENT-STATUS.md",
  diary: "docs/ENTWICKLUNGSTAGEBUCH.md",
  readme: "README.md",
};

// (2) tote Verweise
const pathRe = /\b(docs\/[A-Za-z0-9_./-]+\.(?:md|yaml))\b/g;
for (const f of [files.tracker, files.status, files.readme]) {
  const text = read(f);
  const seen = new Set();
  for (const m of text.matchAll(pathRe)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    if (m[1].includes("*") || m[1].includes("<")) continue;
    if (!existsSync(resolve(ROOT, m[1]))) errors.push(`${f}: Verweis auf fehlende Datei ${m[1]}`);
  }
}

// (3)/(4) Stand-Daten
const latestTracker = (tracker?.fortschritt ?? [])
  .map((e) => String(e.datum ?? "").slice(0, 10))
  .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  .sort()
  .at(-1);

function standOf(file) {
  const m = read(file).match(/^Stand:\s*(\d{4}-\d{2}-\d{2})/m);
  return m ? m[1] : null;
}
for (const f of [files.status, files.diary]) {
  const s = standOf(f);
  if (!s) errors.push(`${f}: Zeile "Stand: YYYY-MM-DD" fehlt.`);
  else if (latestTracker && s < latestTracker)
    errors.push(`${f}: Stand ${s} ist älter als der jüngste Tracker-Eintrag ${latestTracker}.`);
}

// (5) Version im Tagebuch-Kopf
const clTop = read("CHANGELOG.md").match(
  /^##\s+([0-9][0-9A-Za-z.\-+]*)\s+-\s+\d{4}-\d{2}-\d{2}/m,
)?.[1];
const diaryVersion = read(files.diary).match(/Dashboard-Version\s+([0-9][0-9A-Za-z.\-+]*)/)?.[1];
if (clTop && diaryVersion && clTop !== diaryVersion)
  errors.push(`Tagebuch nennt Version ${diaryVersion}, CHANGELOG ${clTop}.`);

if (errors.length) {
  console.error("✗ Projektdoku nicht aktuell:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`✓ Projektdoku konsistent (Tracker-Stand ${latestTracker ?? "?"}).`);
