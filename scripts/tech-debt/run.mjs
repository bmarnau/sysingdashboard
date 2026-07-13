#!/usr/bin/env node
/**
 * Tech-Debt-Runner (Prompt 2A.2).
 *
 * Führt alle Detektoren aus, lädt den kuratierten Manual-Katalog, validiert,
 * mergt, priorisiert und schreibt Report-Artefakte inkl. Diff gegen den
 * vorherigen Lauf.
 *
 * Ausgabe (`test-report/`):
 *   - tech-debt.json              maschinenlesbarer Voll-Report
 *   - tech-debt.md                Human-readable Volldruck
 *   - tech-debt-summary.md        Management-Zusammenfassung
 *   - tech-debt-actions.md        priorisierte Maßnahmenliste
 *   - tech-debt-diff.json         Delta zu tech-debt.prev.json
 *
 * Exit-Code:
 *   0 — kein Critical-Fund
 *   2 — mindestens ein Critical-Fund (CI-Gate)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { resolve, dirname, join } from "node:path";

import { PRIORITY_TAGS, SEVERITY_RANK, validateFinding } from "./schema.mjs";
import { detectLayerViolations } from "./detectors/layer-violations.mjs";
import { detectOversizeModules } from "./detectors/oversize-modules.mjs";
import { detectEndpointGuards } from "./detectors/endpoint-guards.mjs";
import { detectCyclicDeps } from "./detectors/cyclic-deps.mjs";
import { detectOrphanModules } from "./detectors/orphan-modules.mjs";
import { detectDocDrift } from "./detectors/doc-drift.mjs";
import { detectCoverageGaps } from "./detectors/coverage-gaps.mjs";
import { detectConsoleUsage } from "./detectors/console-usage.mjs";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const REPORT_DIR = resolve(ROOT, "test-report");
const OUT_JSON = join(REPORT_DIR, "tech-debt.json");
const OUT_MD = join(REPORT_DIR, "tech-debt.md");
const OUT_SUMMARY = join(REPORT_DIR, "tech-debt-summary.md");
const OUT_ACTIONS = join(REPORT_DIR, "tech-debt-actions.md");
const OUT_DIFF = join(REPORT_DIR, "tech-debt-diff.json");
const PREV_JSON = join(REPORT_DIR, "tech-debt.prev.json");

// Version aus CHANGELOG (oberster Eintrag) — vereinfachte Extraktion.
function readCurrentVersion() {
  try {
    const cl = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
    const m = cl.match(/^##\s+([\d.]+)/m);
    return m?.[1] ?? "unknown";
  } catch {
    return "unknown";
  }
}
process.env.TECH_DEBT_VERSION = readCurrentVersion();

/* ------------------------- Detektoren ausführen ------------------------- */

console.log(`[debt] Version: ${process.env.TECH_DEBT_VERSION}`);
const detectorResults = await Promise.all([
  Promise.resolve(detectCyclicDeps(ROOT)),
  Promise.resolve(detectLayerViolations(ROOT)),
  Promise.resolve(detectOversizeModules(ROOT)),
  Promise.resolve(detectEndpointGuards(ROOT)),
  Promise.resolve(detectOrphanModules(ROOT)),
  Promise.resolve(detectDocDrift(ROOT)),
  Promise.resolve(detectCoverageGaps(ROOT)),
  Promise.resolve(detectConsoleUsage(ROOT)),
]);
const automated = detectorResults.flat();

/* --------------------------- Manual-Katalog ---------------------------- */

let manual = [];
const manualFile = join(ROOT, "tech-debt/findings.json");
if (existsSync(manualFile)) {
  try {
    manual = JSON.parse(readFileSync(manualFile, "utf8"));
    if (!Array.isArray(manual)) {
      console.error("[debt] tech-debt/findings.json ist kein Array — ignoriert.");
      manual = [];
    }
  } catch (err) {
    console.error(`[debt] tech-debt/findings.json parse-error: ${err.message}`);
    process.exit(2);
  }
}

/* -------------------------- Validierung -------------------------------- */

const all = [...automated, ...manual];
const validationErrors = [];
for (const f of all) {
  const { ok, errors } = validateFinding(f);
  if (!ok) validationErrors.push({ id: f?.id ?? "<no-id>", errors });
}
if (validationErrors.length) {
  console.error(`[debt] ${validationErrors.length} Schema-Fehler:`);
  for (const v of validationErrors.slice(0, 20)) console.error(`  ${v.id}: ${v.errors.join(", ")}`);
  process.exit(2);
}

/* -------------------------- Deduplizierung ----------------------------- */

const byId = new Map();
for (const f of all) {
  // Manuelle Einträge dominieren automatische mit derselben ID (unwahrscheinlich,
  // aber ermöglicht Override/Kontext-Annotationen).
  if (byId.has(f.id) && byId.get(f.id).source === "manual") continue;
  byId.set(f.id, f);
}
const findings = [...byId.values()];

/* -------------------------- Priorisierung ------------------------------ */

function priorityKey(f) {
  const pTag = PRIORITY_TAGS.indexOf(f.priorityTag ?? "");
  const p = pTag === -1 ? PRIORITY_TAGS.length : pTag;
  return [p, SEVERITY_RANK[f.severity] ?? 99, f.recommendedOrder ?? 100];
}
findings.sort((a, b) => {
  const ka = priorityKey(a);
  const kb = priorityKey(b);
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
  return a.id.localeCompare(b.id);
});

/* ------------------------------ Diff ----------------------------------- */

let prev = null;
if (existsSync(PREV_JSON)) {
  try {
    prev = JSON.parse(readFileSync(PREV_JSON, "utf8"));
  } catch {
    prev = null;
  }
}
const prevIds = new Set((prev?.findings ?? []).map((f) => f.id));
const currIds = new Set(findings.map((f) => f.id));
const newIds = [...currIds].filter((id) => !prevIds.has(id));
const resolvedIds = [...prevIds].filter((id) => !currIds.has(id));
const persistent = [...currIds].filter((id) => prevIds.has(id));
const diff = {
  new: newIds,
  resolved: resolvedIds,
  persistent: persistent.length,
  previousVersion: prev?.summary?.version ?? null,
  currentVersion: process.env.TECH_DEBT_VERSION,
};

/* ----------------------------- Summary --------------------------------- */

const counts = { Critical: 0, High: 0, Medium: 0, Low: 0, Informational: 0 };
for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;
const summary = {
  generatedAt: new Date().toISOString(),
  version: process.env.TECH_DEBT_VERSION,
  totalFindings: findings.length,
  counts,
  bySource: {
    automated: findings.filter((f) => f.source === "automated").length,
    manual: findings.filter((f) => f.source === "manual").length,
  },
};

/* ----------------------------- Reports --------------------------------- */

mkdirSync(REPORT_DIR, { recursive: true });

// Vorheriger Report → prev (nur bei erfolgreicher Neu-Erstellung).
if (existsSync(OUT_JSON)) {
  try {
    renameSync(OUT_JSON, PREV_JSON);
  } catch {
    /* ignore */
  }
}

writeFileSync(OUT_JSON, JSON.stringify({ summary, findings, diff }, null, 2));
writeFileSync(OUT_DIFF, JSON.stringify(diff, null, 2));
writeFileSync(OUT_MD, renderFullMarkdown(summary, findings, diff));
writeFileSync(OUT_SUMMARY, renderSummary(summary, findings, diff));
writeFileSync(OUT_ACTIONS, renderActions(findings));

console.log(
  `[debt] ${findings.length} Findings — Critical:${counts.Critical} High:${counts.High} Medium:${counts.Medium} Low:${counts.Low} Info:${counts.Informational}`,
);
console.log(
  `[debt] Diff: ${newIds.length} neu, ${resolvedIds.length} behoben, ${persistent.length} bestehend`,
);
console.log(`[debt] Reports: ${OUT_JSON}, ${OUT_SUMMARY}, ${OUT_ACTIONS}, ${OUT_MD}, ${OUT_DIFF}`);

if (counts.Critical > 0) {
  console.error(`[debt] FAIL: ${counts.Critical} Critical-Fund(e) — siehe ${OUT_SUMMARY}.`);
  process.exit(2);
}

/* --------------------------- Renderer ---------------------------------- */

function renderFullMarkdown(s, list, d) {
  const lines = [
    `# Technical-Debt-Bericht`,
    ``,
    `- **Version**: ${s.version}`,
    `- **Erzeugt**: ${s.generatedAt}`,
    `- **Findings gesamt**: ${s.totalFindings} (automated: ${s.bySource.automated}, manual: ${s.bySource.manual})`,
    `- **Severity-Verteilung**: Critical ${s.counts.Critical} · High ${s.counts.High} · Medium ${s.counts.Medium} · Low ${s.counts.Low} · Informational ${s.counts.Informational}`,
    `- **Diff zum Vorlauf**: ${d.new.length} neu, ${d.resolved.length} behoben, ${d.persistent} bestehend`,
    ``,
    `> Analyseverfahren und Grenzen: siehe Handbuch-Kapitel „Technical-Debt-Analyse".`,
    ``,
  ];
  const byCat = groupBy(list, (f) => f.category);
  for (const [cat, items] of byCat) {
    lines.push(`## ${cat} (${items.length})`, ``);
    for (const f of items) lines.push(renderFinding(f));
  }
  return lines.join("\n");
}

function renderFinding(f) {
  return [
    `### [${f.severity}] ${f.title}`,
    `- **ID**: \`${f.id}\``,
    `- **Location**: ${f.location}`,
    `- **Quelle**: ${f.source}${f.automatedRule ? ` (\`${f.automatedRule}\`)` : ""}`,
    `- **Beschreibung**: ${f.description}`,
    `- **Ursache**: ${f.rootCause}`,
    `- **Auswirkung**: ${f.impact}`,
    `- **Empfehlung**: ${f.recommendation}`,
    `- **Aufwand**: ${f.effort} · **Wahrscheinlichkeit**: ${f.likelihood} · **Status**: ${f.status}`,
    `- **Erstmals**: ${f.firstDetected} · **Zuletzt geprüft**: ${f.lastChecked} · **Version**: ${f.version}`,
    ``,
  ].join("\n");
}

function renderSummary(s, list, d) {
  const top = list.slice(0, 10);
  return [
    `# Management-Zusammenfassung — Technical Debt`,
    ``,
    `**Version ${s.version}** · ${s.generatedAt.slice(0, 10)}`,
    ``,
    `| Kategorie | Wert |`,
    `| --------- | ---- |`,
    `| Findings gesamt | ${s.totalFindings} |`,
    `| Critical | ${s.counts.Critical} |`,
    `| High | ${s.counts.High} |`,
    `| Medium | ${s.counts.Medium} |`,
    `| Low + Info | ${s.counts.Low + s.counts.Informational} |`,
    `| Neu seit Vorlauf | ${d.new.length} |`,
    `| Behoben seit Vorlauf | ${d.resolved.length} |`,
    ``,
    `## Top-10 nach Priorität`,
    ``,
    ...top.map(
      (f, i) => `${i + 1}. **[${f.severity}]** ${f.title} — \`${f.location}\` (\`${f.id}\`)`,
    ),
    ``,
    `## Interpretation`,
    ``,
    `- **Critical** blockiert die CI (Exit 2). Aktuell: ${s.counts.Critical}.`,
    `- **High/Medium** sind Trend-Metriken — keine harte Gate, aber Steuerungssignal.`,
    `- Manuelle Findings pflegen Team-Wissen ab, das kein Detektor erkennt.`,
    ``,
    `Vollständiger Bericht: \`test-report/tech-debt.md\`. Maßnahmenliste: \`test-report/tech-debt-actions.md\`.`,
    ``,
  ].join("\n");
}

function renderActions(list) {
  const actionable = list.filter((f) => f.status === "offen" || f.status === "geplant");
  const lines = [`# Maßnahmenliste (sortiert nach Priorität)`, ``];
  actionable.forEach((f, i) => {
    lines.push(
      `${i + 1}. **[${f.severity}/${f.effort}]** ${f.title}`,
      `   - Ort: \`${f.location}\``,
      `   - Empfehlung: ${f.recommendation}`,
      `   - Finding-ID: \`${f.id}\``,
      ``,
    );
  });
  if (actionable.length === 0) lines.push(`_Keine offenen Maßnahmen._`, ``);
  return lines.join("\n");
}

function groupBy(arr, key) {
  const map = new Map();
  for (const item of arr) {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

// Verweis, damit `dirname/join` nicht als unused importiert werden.
void dirname;
