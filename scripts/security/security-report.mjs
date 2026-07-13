#!/usr/bin/env node
/**
 * Security-Report-Generator.
 *
 * Liest:
 *  - `scripts/security/static-findings.json` (Design- und Infrastruktur-
 *    Findings, vom Team gepflegt).
 *  - optional `test-report/security-vitest.json` (Vitest-JSON-Reporter-
 *    Ausgabe der Security-Suite), um fehlgeschlagene Tests als
 *    dynamische Findings zu ergänzen. Fehlt die Datei, wird der Report
 *    nur aus statischen Findings gebaut.
 *
 * Schreibt:
 *  - `test-report/security-report.md`  — menschenlesbar
 *  - `test-report/security-report.json` — maschinenlesbar (Header +
 *    Findings-Array). Wird von `security:gate` gelesen.
 *
 * CLI-Flags:
 *   --strict-high   HIGH-Findings zählen als Blocker.
 *   --gate          Exit != 0, wenn Blocker offen sind.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { RELEASE_RULES, SEVERITY_ORDER, shouldBlockRelease, countBySeverity } from "./release-rules.mjs";

const ROOT = process.cwd();
const STATIC = join(ROOT, "scripts/security/static-findings.json");
const VITEST_JSON = join(ROOT, "test-report/security-vitest.json");
const OUT_MD = join(ROOT, "test-report/security-report.md");
const OUT_JSON = join(ROOT, "test-report/security-report.json");

const args = new Set(process.argv.slice(2));
const strictHigh = args.has("--strict-high");
const gate = args.has("--gate");

function loadStatic() {
  const raw = readFileSync(STATIC, "utf8");
  return JSON.parse(raw).findings ?? [];
}

function loadDynamic() {
  if (!existsSync(VITEST_JSON)) return [];
  try {
    const raw = readFileSync(VITEST_JSON, "utf8");
    const parsed = JSON.parse(raw);
    const findings = [];
    const walk = (nodes) => {
      for (const node of nodes ?? []) {
        if (Array.isArray(node.tasks) || Array.isArray(node.children)) {
          walk(node.tasks || node.children);
        }
        if (node.result && node.result.state === "fail") {
          findings.push({
            id: `SEC-DYN-${(node.id ?? node.name ?? "unknown").toString().slice(0, 32)}`,
            severity: "high",
            area: "regression",
            title: `Vitest-Regression: ${node.name ?? node.id}`,
            location: node.file ?? "src/__tests__/security/*",
            reproduction: (node.result.errors?.[0]?.message ?? "").slice(0, 400),
            recommendation: "Test wieder grün stellen — die Suite war zuletzt konsistent.",
            blocksReleasePhase: "all",
            accepted: false,
            source: "vitest",
          });
        }
      }
    };
    walk(parsed.testResults ?? parsed.tasks ?? parsed.files ?? []);
    return findings;
  } catch {
    return [];
  }
}

function severityRank(s) {
  const i = SEVERITY_ORDER.indexOf(s);
  return i < 0 ? 99 : i;
}

function ensureDir(p) {
  mkdirSync(dirname(p), { recursive: true });
}

function buildMarkdown(findings, counts) {
  const now = new Date().toISOString();
  const blocked = shouldBlockRelease(findings, { strictHigh });
  const lines = [];
  lines.push("# Security Report");
  lines.push("");
  lines.push(`Generated: ${now}`);
  lines.push(`Strict-High: ${strictHigh ? "yes" : "no"}`);
  lines.push(`Release blocked: **${blocked ? "YES" : "no"}**`);
  lines.push("");
  lines.push("## Zusammenfassung");
  lines.push("");
  lines.push(`- CRITICAL: **${counts.critical}**`);
  lines.push(`- HIGH: **${counts.high}**`);
  lines.push(`- MEDIUM: ${counts.medium}`);
  lines.push(`- LOW: ${counts.low}`);
  lines.push(`- akzeptiert (dokumentiert): ${counts.accepted}`);
  lines.push("");
  lines.push("## Release-Regeln");
  for (const sev of SEVERITY_ORDER) {
    const rule = RELEASE_RULES[sev];
    lines.push(`- **${sev.toUpperCase()}** — blockiert Release: ${rule.blocksRelease ? "ja" : "nein"}${rule.blocksPhases ? `, Phasen: ${rule.blocksPhases.join(", ")}` : ""}${rule.requiresAcceptance ? ", benötigt dokumentierte Akzeptanz" : ""}`);
  }
  lines.push("");
  lines.push("## Grenzen der Suite");
  lines.push("");
  lines.push("- Keine Pen-Test-Ersatzleistung, kein Fuzzing, keine Kryptoanalyse.");
  lines.push("- Kein produktiver Auth-Provider — Session-/Claims-Kategorien sind Findings, keine grünen Tests.");
  lines.push("- UI-Sichtbarkeit ist kein Sicherheitsnachweis; Serverseite wird durch Middleware in einem Folge-Prompt eingezogen.");
  lines.push("- Kein Anspruch auf Zertifizierung (ISO/IEC 27001, SOC 2, BSI o. ä.).");
  lines.push("");
  const byArea = new Map();
  for (const f of [...findings].sort((a, b) => severityRank(a.severity) - severityRank(b.severity))) {
    if (!byArea.has(f.area)) byArea.set(f.area, []);
    byArea.get(f.area).push(f);
  }
  for (const [area, list] of byArea) {
    lines.push(`## Bereich: ${area}`);
    lines.push("");
    for (const f of list) {
      lines.push(`### ${f.id} · ${f.severity.toUpperCase()} · ${f.title}`);
      lines.push("");
      lines.push(`- **Location**: \`${f.location}\``);
      lines.push(`- **Reproduktion**: ${f.reproduction}`);
      lines.push(`- **Empfehlung**: ${f.recommendation}`);
      lines.push(`- **Blockiert Phase**: ${f.blocksReleasePhase ?? "-"}`);
      if (f.accepted) lines.push(`- **Akzeptiert**: ${f.acceptanceReason ?? "-"}`);
      if (f.source) lines.push(`- **Quelle**: ${f.source}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

const findings = [...loadStatic(), ...loadDynamic()];
const counts = countBySeverity(findings);
const md = buildMarkdown(findings, counts);
const json = {
  generatedAt: new Date().toISOString(),
  strictHigh,
  blocked: shouldBlockRelease(findings, { strictHigh }),
  counts,
  findings,
};

ensureDir(OUT_MD);
writeFileSync(OUT_MD, md, "utf8");
writeFileSync(OUT_JSON, JSON.stringify(json, null, 2), "utf8");

// eslint-disable-next-line no-console
console.log(
  `[security-report] critical=${counts.critical} high=${counts.high} medium=${counts.medium} low=${counts.low} accepted=${counts.accepted} → ${OUT_MD}`,
);

if (gate && json.blocked) {
  // eslint-disable-next-line no-console
  console.error("[security-report] Release GEBLOCKT durch offene Findings.");
  process.exit(1);
}
