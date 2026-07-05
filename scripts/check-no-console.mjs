#!/usr/bin/env node
/**
 * No-Console-Check.
 *
 * Verbietet direkte `console.*`-Aufrufe in kritischen Services, in denen
 * ausschließlich der Logger genutzt werden darf. Erlaubt bleiben:
 *
 *   - `src/lib/logger.ts` und `src/lib/logger.indexeddb.ts`
 *   - `backend/services/logger.mjs`
 *
 * Aufruf: `bun run lint:no-console`. Exit 1 bei Verstoß.
 *
 * Heuristik: nur echte Aufrufe am Zeilenanfang (ggf. mit Einrückung /
 * `void ` / `await `) werden geflaggt — String-Literale mit dem Wort
 * „console" bleiben unangetastet.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);

const TARGETS = [
  "src/lib/backup-service.ts",
  "src/lib/json-import-service.ts",
  "src/lib/azure",
  "backend/services",
];

const ALLOW = new Set([
  "src/lib/logger.ts",
  "src/lib/logger.indexeddb.ts",
  "backend/services/logger.mjs",
]);

const LINE_RE = /^\s*(?:void\s+|await\s+)?console\.(log|debug|info|warn|error)\b/;

function walk(rel) {
  const abs = resolve(ROOT, rel);
  let st;
  try {
    st = statSync(abs);
  } catch {
    return [];
  }
  if (st.isFile()) return [rel];
  const out = [];
  for (const name of readdirSync(abs)) {
    const child = join(rel, name);
    const s = statSync(resolve(ROOT, child));
    if (s.isDirectory()) out.push(...walk(child));
    else if (/\.(ts|tsx|mjs|js)$/.test(name)) out.push(child);
  }
  return out;
}

const violations = [];
for (const t of TARGETS) {
  for (const file of walk(t)) {
    if (ALLOW.has(file.replace(/\\/g, "/"))) continue;
    const src = readFileSync(resolve(ROOT, file), "utf8");
    const lines = src.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (LINE_RE.test(line)) {
        violations.push(`${file}:${i + 1}  ${line.trim()}`);
      }
    });
  }
}

if (violations.length > 0) {
  console.error("\nNo-Console-Check: Verstöße gefunden:");
  for (const v of violations) console.error(`  ✗ ${v}`);
  console.error(
    "\nBitte `logger.*` aus `src/lib/logger.ts` bzw. `backend/services/logger.mjs` verwenden.",
  );
  process.exit(1);
}

console.log("✓ No-Console-Check: alle Ziel-Dateien nutzen den Logger.");
