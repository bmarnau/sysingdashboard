#!/usr/bin/env node
/**
 * No-Console-Check (Sprint 05B).
 *
 * Prüft den gesamten Produktivcode (`src/`, `backend/`, `config/`) auf direkte
 * `console.*`-Aufrufe. Zulässig sind ausschließlich:
 *
 *   - Logger-Interna (der Sink selbst)
 *   - Nicht-Produktivcode (Tests, Skripte, E2E)
 *   - dokumentierte Ausnahmen aus `scripts/console-policy.mjs`
 *
 * Aufruf: `bun run lint:no-console`. Exit 1 bei Verstoß.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { classify, CONSOLE_LINE_RE } from "./console-policy.mjs";

const ROOT = resolve(new URL("..", import.meta.url).pathname);

const ROOTS = ["src", "backend", "config"];

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
    const child = join(rel, name).replace(/\\/g, "/");
    const s = statSync(resolve(ROOT, child));
    if (s.isDirectory()) out.push(...walk(child));
    else if (/\.(ts|tsx|mjs|js)$/.test(name)) out.push(child);
  }
  return out;
}

const violations = [];
const exceptions = [];

for (const r of ROOTS) {
  for (const file of walk(r)) {
    const verdict = classify(file);
    const src = readFileSync(resolve(ROOT, file), "utf8");
    src.split(/\r?\n/).forEach((line, i) => {
      if (!CONSOLE_LINE_RE.test(line)) return;
      const entry = `${file}:${i + 1}  ${line.trim()}`;
      if (verdict.kind === "violation") violations.push(entry);
      else if (verdict.kind === "exception")
        exceptions.push(`${file}:${i + 1}  [${verdict.exception.id}]`);
    });
  }
}

if (exceptions.length > 0) {
  console.log(`ℹ No-Console-Check: ${exceptions.length} dokumentierte Ausnahme(n):`);
  for (const e of exceptions) console.log(`  · ${e}`);
}

if (violations.length > 0) {
  console.error("\nNo-Console-Check: Verstöße gefunden:");
  for (const v of violations) console.error(`  ✗ ${v}`);
  console.error(
    "\nBitte `logger.*` aus `src/lib/logger.ts` bzw. `backend/services/logger.mjs` verwenden\n" +
      "oder eine begründete Ausnahme in `scripts/console-policy.mjs` eintragen.",
  );
  process.exit(1);
}

console.log("✓ No-Console-Check: Produktivcode nutzt durchgängig den Logger.");
