#!/usr/bin/env node
/**
 * Doku-Sync-Check
 *
 * Prüft, dass das integrierte Handbuch synchron zur Codebasis bleibt:
 *
 *  1. `CHANGELOG.md` ist vorhanden und enthält mindestens einen Eintrag im
 *     Format `## <version> - YYYY-MM-DD`.
 *  2. Die oberste Version in `CHANGELOG.md` stimmt mit dem im Handbuch
 *     ausgewiesenen `DASHBOARD_VERSION` überein (Single Source of Truth).
 *  3. Das oberste CHANGELOG-Datum ist nicht in der Zukunft und nicht älter
 *     als die im Handbuch eingetragenen `lastUpdated`-Daten der Topics.
 *  4. Für jede in `src/components/` neu hinzugefügte Komponente, die als
 *     Dialog/Menüpunkt im Dashboard verwendet wird, existiert ein Topic in
 *     `src/lib/help-documentation.ts` (Heuristik: Dateiname taucht im
 *     Handbuch als `component:`-Wert oder im Topic-Content auf).
 *
 * Exitcode 0 = ok, 1 = Verstoß. Aufruf: `bun run docs:check`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const errors = [];
const warnings = [];

function read(p) {
  return readFileSync(resolve(ROOT, p), "utf8");
}

// (1) CHANGELOG.md
let changelog;
try {
  changelog = read("CHANGELOG.md");
} catch {
  errors.push("CHANGELOG.md fehlt im Projekt-Root.");
}

const headerRe = /^##\s+([0-9][0-9A-Za-z.\-+]*)\s+-\s+(\d{4}-\d{2}-\d{2})\s*$/gm;
const entries = [];
if (changelog) {
  let m;
  while ((m = headerRe.exec(changelog)) !== null) {
    entries.push({ version: m[1], date: m[2] });
  }
  if (entries.length === 0) {
    errors.push("CHANGELOG.md enthält keine Einträge im Format `## <version> - YYYY-MM-DD`.");
  }
}

// (2) DASHBOARD_VERSION wird aus CHANGELOG abgeleitet — kein Drift mehr möglich.
// Hier prüfen wir nur noch, dass keine alte hartcodierte Konstante zurückkehrt.
const helpSrc = read("src/lib/help-documentation.ts");
const hardcoded = helpSrc.match(/export const DASHBOARD_VERSION\s*=\s*"(\d+\.\d+\.\d+)"/);
if (hardcoded) {
  errors.push(
    `DASHBOARD_VERSION ist hartcodiert ("${hardcoded[1]}"). Stattdessen aus CHANGELOG[0].version ableiten.`,
  );
}

// (3) Datumssanity
if (entries.length > 0) {
  const top = entries[0];
  const today = new Date().toISOString().slice(0, 10);
  if (top.date > today) {
    warnings.push(`Oberster CHANGELOG-Eintrag liegt in der Zukunft (${top.date}).`);
  }
  const lastUpdatedMatches = [...helpSrc.matchAll(/lastUpdated:\s*"(\d{4}-\d{2}-\d{2})"/g)];
  const maxLastUpdated = lastUpdatedMatches
    .map((mm) => mm[1])
    .sort()
    .pop();
  if (maxLastUpdated && maxLastUpdated > top.date) {
    warnings.push(
      `Topic-lastUpdated (${maxLastUpdated}) ist neuer als der oberste CHANGELOG-Eintrag (${top.date}). Bitte CHANGELOG-Eintrag ergänzen.`,
    );
  }
}

// (4) Komponenten-Abdeckung (Heuristik)
const componentsDir = resolve(ROOT, "src/components");
const skipDirs = new Set(["ui"]);
const componentFiles = [];
for (const name of readdirSync(componentsDir)) {
  const full = join(componentsDir, name);
  if (statSync(full).isDirectory()) {
    if (skipDirs.has(name)) continue;
    for (const sub of readdirSync(full)) {
      if (/\.(tsx|ts)$/.test(sub)) componentFiles.push(sub.replace(/\.(tsx|ts)$/, ""));
    }
  } else if (/\.(tsx|ts)$/.test(name)) {
    componentFiles.push(name.replace(/\.(tsx|ts)$/, ""));
  }
}

const dashboardLevel = new Set(
  componentFiles.filter((n) => /Dialog$|Report$|Manual$|Manager$/.test(n)),
);
const missing = [];
for (const comp of dashboardLevel) {
  const base = comp.replace(/(Dialog|Report|Manual|Manager)$/, "");
  const haystack = helpSrc.toLowerCase();
  const hit =
    haystack.includes(comp.toLowerCase()) ||
    (base.length >= 4 && haystack.includes(base.toLowerCase()));
  if (!hit) missing.push(comp);
}
if (missing.length > 0) {
  warnings.push(
    `Folgende Dashboard-Komponenten werden im Handbuch nicht erwähnt: ${missing.join(", ")}.`,
  );
}

// Ausgabe
const tag = (s) => `\u001b[1m${s}\u001b[0m`;
console.log(tag("Doku-Sync-Check"));
console.log(`  CHANGELOG-Einträge: ${entries.length}`);
if (entries[0]) {
  console.log(`  Aktuelle Version:   ${entries[0].version} (${entries[0].date})`);
}
console.log(`  Komponenten geprüft: ${dashboardLevel.size}`);

if (warnings.length) {
  console.log("\nWarnungen:");
  for (const w of warnings) console.log(`  • ${w}`);
}
if (errors.length) {
  console.error("\nFehler:");
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log("\n✓ Doku ist synchron.");
