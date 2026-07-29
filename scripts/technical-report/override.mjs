#!/usr/bin/env node
/**
 * override.mjs — setzt eine manuelle Freigabestufen-Abweichung.
 *
 * Aufruf:
 *   node scripts/technical-report/override.mjs \
 *     --stage=pilot --reason="…" --ticket=SPRINT-05-XY --by=engineering-lead
 *
 * Effekt:
 *   1. `test-report/release-override.json` wird geschrieben.
 *   2. `audit_log`-Zeile für spätere Server-seitige Übernahme angehängt an
 *      `test-report/release-override.audit.log` (JSONL).
 *
 * Der nächste `report:technical`-Lauf liest die Override-Datei und schreibt
 * `releaseStage.effective` + `releaseStage.overridden` in den Report.
 */
import { existsSync, appendFileSync, writeFileSync } from "node:fs";
import { STAGES } from "./release-gate.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  }),
);

if (args.clear) {
  writeFileSync("test-report/release-override.json", JSON.stringify({ cleared: true }, null, 2));
  appendFileSync(
    "test-report/release-override.audit.log",
    JSON.stringify({
      at: new Date().toISOString(),
      action: "override.clear",
      by: args.by ?? process.env.USER ?? "unknown",
    }) + "\n",
  );
  console.log("[override] Override entfernt.");
  process.exit(0);
}

if (!args.stage || !STAGES.includes(args.stage)) {
  console.error(`[override] --stage muss einer sein: ${STAGES.join(", ")}`);
  process.exit(1);
}
if (!args.reason) {
  console.error(`[override] --reason ist Pflicht.`);
  process.exit(1);
}
if (!args.ticket) {
  console.error(`[override] --ticket ist Pflicht (Audit-Nachweis).`);
  process.exit(1);
}

const payload = {
  stage: args.stage,
  reason: args.reason,
  ticket: args.ticket,
  by: args.by ?? process.env.USER ?? "unknown",
  at: new Date().toISOString(),
};
writeFileSync("test-report/release-override.json", JSON.stringify(payload, null, 2));
appendFileSync(
  "test-report/release-override.audit.log",
  JSON.stringify({ ...payload, action: "override.set" }) + "\n",
);
console.log(`[override] Freigabestufe manuell gesetzt auf ${args.stage} (${args.ticket}).`);
