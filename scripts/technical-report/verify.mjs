#!/usr/bin/env node
/**
 * verify.mjs — Prüft den Integritäts-Hash eines Report-Snapshots.
 *
 * Aufruf:
 *   node scripts/technical-report/verify.mjs [pfad-zum-report.json]
 *
 * Exit 0 bei Übereinstimmung, Exit 1 bei Mismatch, Exit 2 bei Read-Error.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { computeIntegrityHash } from "./canonical.mjs";

const arg = process.argv[2] ?? "test-report/technical-test-report.json";
const file = path.resolve(process.cwd(), arg);

let report;
try {
  report = JSON.parse(readFileSync(file, "utf8"));
} catch (e) {
  console.error(`[verify] Datei nicht lesbar: ${file}\n${e.message}`);
  process.exit(2);
}

const declared = report.integrity?.value;
if (!declared) {
  console.error(`[verify] Report ohne integrity.value — nicht verifizierbar.`);
  process.exit(2);
}

const recomputed = computeIntegrityHash(report);
if (recomputed.value !== declared) {
  console.error(
    `[verify] Hash-Mismatch für ${arg}\n  erwartet: ${declared}\n  berechnet: ${recomputed.value}`,
  );
  process.exit(1);
}

console.log(`[verify] OK — ${arg} (${recomputed.value})`);
process.exit(0);
