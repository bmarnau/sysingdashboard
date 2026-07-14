#!/usr/bin/env node
/**
 * Ops – Betriebs-Checks (Health, ENV-Payload, Rollback-Doku).
 * Startet den Dev-Server NICHT — nutzt Playwright-Fixtures dafür.
 * Prüft nur statisch: (a) Rollback-Doku vorhanden, (b) status-Payload-Regeln
 * (statischer Regex-Scan über statusService.mjs, damit Secrets nicht
 * versehentlich zurückgegeben werden).
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";

const OUT = "test-report/ops-checks.json";
mkdirSync("test-report", { recursive: true });

const rollbackDocumented = (() => {
  try {
    const src = readFileSync("docs/DEPLOYMENT.md", "utf8").toLowerCase();
    return src.includes("rollback");
  } catch { return false; }
})();

const secretLeaks = (() => {
  try {
    const src = readFileSync("backend/services/statusService.mjs", "utf8");
    // Payload darf keine Werte von AZURE_*_CONNECTION o.ä. herausgeben — nur Booleans.
    // Wir prüfen: kein `process.env.AZURE_*_CONNECTION` wird direkt in den return-payload gestreamt.
    const dangerous = /return[\s\S]*?process\.env\.(AZURE_[A-Z_]+_CONNECTION|AZURE_STORAGE_SAS|AZURE_CLIENT_SECRET)/;
    return dangerous.test(src) ? 1 : 0;
  } catch { return 0; }
})();

const backupAvailable = existsSync("src/lib/backup-service.ts");
const envValidation = existsSync("config/envValidator.mjs");

const report = {
  generatedAt: new Date().toISOString(),
  healthOk: null, // wird von Playwright-Ops-Spec gesetzt (falls verfügbar)
  secretLeaks,
  rollbackDocumented,
  backupAvailable,
  envValidation,
};

writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`[ops-checks] Rollback-Doku: ${rollbackDocumented} · Secret-Leak-Signale: ${secretLeaks} · Backup: ${backupAvailable}`);
