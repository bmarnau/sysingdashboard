#!/usr/bin/env node
/**
 * Aggregiert Ergebnisse der Testinstanz zu einem einheitlichen Report unter
 * `test-report/summary.json` + `summary.md`. Fehlende Teilartefakte werden
 * toleriert — der Report zeigt sie als „nicht ausgeführt".
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const REPORT_DIR = resolve(ROOT, "test-report");
mkdirSync(REPORT_DIR, { recursive: true });

function safeReadJson(p) {
  try {
    return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
  } catch {
    return null;
  }
}

const coverage = safeReadJson(join(ROOT, "coverage/coverage-summary.json"));
const bundle = safeReadJson(join(REPORT_DIR, "bundle.json"));
const debt = safeReadJson(join(REPORT_DIR, "tech-debt.json"));
// Der zentrale CI-Bericht darf nur den im aktuellen Lauf eingesammelten
// Security-Report verwenden. `security-report/findings.json` kann als lokales
// Scanner-Artefakt historisch im Checkout liegen und ist kein Laufnachweis.
const security = safeReadJson(join(REPORT_DIR, "security-report.json"));

const summary = {
  generatedAt: new Date().toISOString(),
  sections: {
    coverage: coverage ? { present: true, total: coverage.total ?? null } : { present: false },
    bundle: bundle ? { present: true, totalSize: bundle.totalSize } : { present: false },
    techDebt: debt
      ? {
          present: true,
          totalFindings: debt.summary?.totalFindings ?? debt.todos ?? 0,
          critical: debt.summary?.counts?.Critical ?? 0,
          high: debt.summary?.counts?.High ?? 0,
        }
      : { present: false },
    security: security
      ? {
          present: true,
          findings: Array.isArray(security) ? security.length : (security.findings?.length ?? 0),
        }
      : { present: false },
  },
};

writeFileSync(join(REPORT_DIR, "summary.json"), JSON.stringify(summary, null, 2));

const md = [
  "# Testinstanz — Prüfbericht",
  "",
  `Erzeugt: ${summary.generatedAt}`,
  "",
  "| Bereich | Status | Kennzahl |",
  "| ------- | ------ | -------- |",
  `| Coverage | ${summary.sections.coverage.present ? "OK" : "fehlt"} | ${
    summary.sections.coverage.total
      ? JSON.stringify(summary.sections.coverage.total).slice(0, 80)
      : "—"
  } |`,
  `| Bundle | ${summary.sections.bundle.present ? "OK" : "fehlt"} | ${
    summary.sections.bundle.totalSize
      ? (summary.sections.bundle.totalSize / 1024).toFixed(1) + " KB"
      : "—"
  } |`,
  `| Technical Debt | ${summary.sections.techDebt.present ? "OK" : "fehlt"} | ${
    summary.sections.techDebt.present
      ? `${summary.sections.techDebt.totalFindings} Findings (Critical: ${summary.sections.techDebt.critical}, High: ${summary.sections.techDebt.high})`
      : "—"
  } |`,
  `| Security | ${summary.sections.security.present ? "OK" : "fehlt"} | ${
    summary.sections.security.present ? `${summary.sections.security.findings} Findings` : "—"
  } |`,
  "",
];
writeFileSync(join(REPORT_DIR, "summary.md"), md.join("\n"));

console.log(`[report] geschrieben nach ${REPORT_DIR}/summary.{json,md}`);
