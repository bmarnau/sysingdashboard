#!/usr/bin/env node
/**
 * Zentraler technischer Prüfbericht (Prompt 2A.8, ADR-0017).
 *
 * Aggregator — reine Zusammenführung vorhandener Bereichsberichte in
 * `test-report/` und `tech-debt/`. Erzeugt Findings in einem einheitlichen
 * Schema, sortiert Maßnahmen, vergleicht gegen den letzten Bericht und
 * schreibt `technical-test-report.{json,md}`.
 *
 * Aggregator: führt Bereichsberichte zusammen. Offene Critical-Findings
 * setzen den Status auf blocked; akzeptierte historische Findings bleiben
 * dokumentiert, zählen aber nicht als offene Blocker.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = "test-report";
const OUT_JSON = path.join(OUT_DIR, "technical-test-report.json");
const OUT_MD = path.join(OUT_DIR, "technical-test-report.md");
const PREV_JSON = path.join(OUT_DIR, "technical-test-report.prev.json");

// ------------------------------------------------------------------ helpers

const readJson = (p, fallback = null) => {
  try {
    return JSON.parse(readFileSync(path.join(ROOT, p), "utf8"));
  } catch {
    return fallback;
  }
};
const readText = (p, fallback = "") => {
  try {
    return readFileSync(path.join(ROOT, p), "utf8");
  } catch {
    return fallback;
  }
};
const truncate = (s, n = 200) =>
  typeof s === "string" && s.length > n ? `${s.slice(0, n)}…` : s;
const sha8 = (s) => createHash("sha1").update(s).digest("hex").slice(0, 8);

// ------------------------------------------------------------------ identity

function readDashboardVersion() {
  const m = readText("CHANGELOG.md").match(/^##\s+([0-9][^\s]*)\s+-\s+\d{4}-\d{2}-\d{2}/m);
  return m ? m[1] : "0.0.0";
}
function readCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

const identity = {
  dashboardVersion: readDashboardVersion(),
  commit: readCommit(),
  buildTime: null, // aus Ops-Report übernommen, wenn vorhanden
  testTime: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    ci: !!process.env.CI,
  },
};

// ------------------------------------------------------------------ severity

const SEV = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
const normalizeSev = (s) => {
  const up = String(s ?? "").toUpperCase();
  if (up.startsWith("CRIT")) return "CRITICAL";
  if (up.startsWith("HIGH")) return "HIGH";
  if (up.startsWith("MED")) return "MEDIUM";
  if (up.startsWith("LOW")) return "LOW";
  return "INFO";
};

// ------------------------------------------------------------------ ordering

// Maßnahmen-Sortierreihenfolge exakt wie im Prompt 2A.8 vorgegeben.
const ORDER_BUCKETS = [
  "critical-security",
  "critical-data-integrity",
  "high-security",
  "high-functional",
  "auth-rbac-blocker",
  "azure-blocker",
  "backup-restore-blocker",
  "stability",
  "architecture",
  "test-gap",
  "performance",
  "documentation",
  "ui-improvement",
];

function bucketFor(f) {
  const sev = f.severity;
  const area = (f.area || "").toLowerCase();
  const cat = (f.category || "").toLowerCase();
  if (sev === "CRITICAL") {
    if (area.includes("backup") || area.includes("data") || area.includes("integrity"))
      return "critical-data-integrity";
    return "critical-security";
  }
  if (sev === "HIGH") {
    if (area.includes("auth") || area.includes("rbac") || area.includes("identity"))
      return "auth-rbac-blocker";
    if (area.includes("azure")) return "azure-blocker";
    if (area.includes("backup") || area.includes("restore")) return "backup-restore-blocker";
    if (cat.includes("security") || area.includes("security") || area.includes("logging"))
      return "high-security";
    return "high-functional";
  }
  if (cat.includes("stab") || area.includes("stab")) return "stability";
  if (cat.includes("arch")) return "architecture";
  if (cat.includes("test") || cat.includes("coverage")) return "test-gap";
  if (cat.includes("perf") || area.includes("perf")) return "performance";
  if (cat.includes("doc") || area.includes("doc")) return "documentation";
  if (cat.includes("ui") || area.includes("ui")) return "ui-improvement";
  return "architecture";
}

// ------------------------------------------------------------------ collectors

/** Einheitliches Finding-Schema. */
function makeFinding(partial) {
  const severity = normalizeSev(partial.severity);
  const base = {
    id: partial.id,
    severity,
    category: partial.category ?? "",
    area: partial.area ?? partial.category ?? "",
    title: truncate(partial.title ?? "(ohne Titel)", 200),
    description: truncate(partial.description ?? "", 800),
    cause: truncate(partial.cause ?? "", 400),
    impact: truncate(partial.impact ?? "", 400),
    evidence: {
      file: partial.evidence?.file ?? null,
      line: partial.evidence?.line ?? null,
      reportRef: partial.evidence?.reportRef ?? null,
    },
    components: partial.components ?? [],
    recommendation: truncate(partial.recommendation ?? "", 600),
    dependencies: partial.dependencies ?? [],
    effort: partial.effort ?? "M",
    status: partial.status ?? "open",
    source: partial.source ?? "auto",
    accepted: partial.accepted ?? false,
  };
  base.bucket = bucketFor(base);
  base.order = ORDER_BUCKETS.indexOf(base.bucket);
  return base;
}

// -- Security --------------------------------------------------------------
function collectSecurity() {
  const rep = readJson(`${OUT_DIR}/security-report.json`);
  if (!rep) return { status: "not-run", findings: [] };
  const findings = (rep.findings ?? []).map((f) =>
    makeFinding({
      id: `sec:${f.id}`,
      severity: f.severity,
      category: "security",
      area: f.area,
      title: f.title,
      description: f.reproduction,
      cause: f.reproduction,
      impact: `Blockiert Release-Phase: ${f.blocksReleasePhase ?? "—"}`,
      recommendation: f.recommendation,
      components: [f.location].filter(Boolean),
      evidence: { file: f.location, reportRef: `${OUT_DIR}/security-report.md#${f.id}` },
      status: f.accepted ? "accepted" : "open",
      accepted: !!f.accepted,
      effort: f.severity === "critical" ? "L" : "M",
    }),
  );
  return {
    status: rep.counts?.critical > 0 ? "failed" : findings.length ? "passed-with-findings" : "passed",
    findings,
    summary: rep.counts,
  };
}

// -- API Discovery ---------------------------------------------------------
function collectApi() {
  const smoke = readJson(`${OUT_DIR}/api-smoke-report.json`);
  const functional = readJson(`${OUT_DIR}/api-functional-report.json`);
  const matrix = readJson(`${OUT_DIR}/api-matrix.json`);
  const findingsMd = readText(`${OUT_DIR}/api-findings.md`);
  const findings = [];

  // Findings aus api-findings.md extrahieren (best-effort: Zeilen "### <ID> — <Titel>")
  const re = /^###\s+([A-Z][A-Z0-9\-_]+)\s+—\s+(.+)$/gm;
  const sevRe = /^##\s+(CRITICAL|HIGH|MEDIUM|LOW)\s+\(/gm;
  let currentSev = "MEDIUM";
  for (const line of findingsMd.split(/\r?\n/)) {
    const sm = /^##\s+(CRITICAL|HIGH|MEDIUM|LOW)\s+\(/.exec(line);
    if (sm) {
      currentSev = sm[1];
      continue;
    }
    const m = /^###\s+([A-Z][A-Z0-9\-_]+)\s+—\s+(.+)$/.exec(line);
    if (m) {
      findings.push(
        makeFinding({
          id: `api:${m[1]}`,
          severity: currentSev,
          category: "api",
          area: "api",
          title: m[2],
          description: `API-Discovery-Befund. Details siehe ${OUT_DIR}/api-findings.md`,
          recommendation: "Siehe api-findings.md — Registry oder Route korrigieren.",
          evidence: { reportRef: `${OUT_DIR}/api-findings.md` },
          effort: currentSev === "CRITICAL" ? "L" : "S",
        }),
      );
    }
    sevRe.lastIndex = 0;
    re.lastIndex = 0;
  }

  const counts = smoke?.counts ?? {};
  const status =
    !smoke && !functional
      ? "not-run"
      : counts.failed > 0
        ? "failed"
        : findings.some((f) => f.severity === "CRITICAL")
          ? "failed"
          : findings.length
            ? "passed-with-findings"
            : "passed";
  return { status, findings, summary: { smoke: counts, matrix: matrix?.summary ?? null } };
}

// -- Backup / Restore ------------------------------------------------------
function collectBackup() {
  const rep = readJson(`${OUT_DIR}/backup-integrity-report.json`);
  if (!rep) return { status: "not-run", findings: [] };
  const findings = [];
  for (const [cat, val] of Object.entries(rep.categories ?? {})) {
    for (const f of val.findings ?? []) {
      findings.push(
        makeFinding({
          id: `backup:${cat}:${sha8(JSON.stringify(f))}`,
          severity: f.severity ?? "MEDIUM",
          category: "data-integrity",
          area: "backup",
          title: f.title ?? `Backup-Finding (${cat})`,
          description: f.description ?? f.message ?? "",
          recommendation: f.recommendation ?? "Testlauf und Fixture prüfen.",
          evidence: { reportRef: `${OUT_DIR}/backup-integrity-report.md` },
        }),
      );
    }
  }
  const s = rep.summary ?? {};
  const status = s.failed > 0 ? "failed" : findings.length ? "passed-with-findings" : "passed";
  return { status, findings, summary: s };
}

// -- Tech Debt -------------------------------------------------------------
function collectTechDebt() {
  const rep = readJson(`${OUT_DIR}/tech-debt.json`);
  if (!rep) return { status: "not-run", findings: [] };
  const findings = (rep.findings ?? [])
    .filter((f) => f.status !== "geschlossen")
    .map((f) =>
      makeFinding({
        id: `td:${f.id}`,
        severity: f.severity,
        category: f.category ?? "tech-debt",
        area: f.category ?? "architecture",
        title: f.title,
        description: f.description,
        cause: f.rootCause,
        impact: f.impact,
        recommendation: f.recommendation,
        components: [f.location].filter(Boolean),
        evidence: { file: f.location, reportRef: `${OUT_DIR}/tech-debt.md` },
        effort: f.effort === "klein" ? "S" : f.effort === "groß" ? "L" : "M",
        source: f.source === "manual" ? "manual" : "auto",
        status: f.status === "offen" ? "open" : (f.status ?? "open"),
      }),
    );
  const highCrit = findings.filter((f) => f.severity === "CRITICAL").length;
  const status = highCrit > 0 ? "failed" : findings.length ? "passed-with-findings" : "passed";
  return { status, findings, summary: rep.summary?.counts ?? {} };
}

// -- Ops (Build/Bundle/Perf/Stability) -------------------------------------
function collectOps() {
  const rep = readJson(`${OUT_DIR}/ops-report.json`);
  if (!rep) return { status: "not-run", findings: [], areas: {} };
  const findings = (rep.warnings ?? []).map((w, i) =>
    makeFinding({
      id: `ops:warn:${sha8(w + i)}`,
      severity: "MEDIUM",
      category: "performance",
      area: "ops",
      title: w,
      description: "Delta gegenüber Baseline überschreitet 20 %.",
      recommendation: "Ursache analysieren, ggf. Baseline nach Refactor neu setzen.",
      evidence: { reportRef: `${OUT_DIR}/ops-report.md` },
      effort: "S",
    }),
  );
  const build = rep.snapshot?.build ?? {};
  if (build.hardFails > 0) {
    findings.push(
      makeFinding({
        id: `ops:build:hardfails`,
        severity: "HIGH",
        category: "build",
        area: "backend",
        title: `${build.hardFails} harte Build-/Check-Fehler`,
        description: "build-checks.mjs meldet nicht-soft Fehler.",
        recommendation: "Siehe test-report/build-report.json.",
        evidence: { reportRef: `${OUT_DIR}/build-report.json` },
        effort: "M",
      }),
    );
  }
  const status = build.hardFails > 0 ? "failed" : findings.length ? "passed-with-findings" : "passed";
  return {
    status,
    findings,
    summary: rep.snapshot ?? {},
  };
}

// -- Docs sync -------------------------------------------------------------
function collectDocs() {
  try {
    execSync("node scripts/check-docs-sync.mjs", { stdio: "ignore" });
    return { status: "passed", findings: [] };
  } catch {
    return {
      status: "failed",
      findings: [
        makeFinding({
          id: "docs:sync",
          severity: "MEDIUM",
          category: "documentation",
          area: "documentation",
          title: "Doku-Sync-Prüfung fehlgeschlagen",
          description: "`scripts/check-docs-sync.mjs` liefert Non-Zero-Exit.",
          recommendation: "`bun run docs:check` lokal ausführen und Handbuch/Changelog synchronisieren.",
          evidence: { reportRef: "scripts/check-docs-sync.mjs" },
          effort: "S",
        }),
      ],
    };
  }
}

// -- Manual findings -------------------------------------------------------
function collectManual() {
  const raw = readJson("scripts/technical-report/manual-findings.json", { findings: [] });
  const findings = (raw.findings ?? []).map((f) =>
    makeFinding({
      ...f,
      id: f.id?.startsWith("man:") ? f.id : `man:${f.id ?? sha8(f.title ?? "")}`,
      source: "manual",
    }),
  );
  const status = findings.some((f) => f.severity === "CRITICAL")
    ? "failed"
    : findings.length
      ? "passed-with-findings"
      : "passed";
  return { status, findings };
}

// ------------------------------------------------------------------ areas

const AREA_MAP = {
  Frontend: ["ops"],
  Backend: ["ops", "build"],
  API: ["api"],
  "UI/E2E": ["ops"],
  RBAC: ["security"],
  Auth: ["security"],
  Azure: ["security"],
  Datenintegrität: ["backup"],
  "Backup/Restore": ["backup"],
  Accessibility: ["ops"],
  Performance: ["ops"],
  Dokumentation: ["docs"],
  "Technische Schulden": ["techdebt"],
};

// ------------------------------------------------------------------ build

function computeAreaStatuses(sources) {
  const rows = {};
  for (const [area, keys] of Object.entries(AREA_MAP)) {
    const statuses = keys.map((k) => sources[k]?.status ?? "not-run");
    const findings = keys.flatMap((k) => sources[k]?.findings ?? []);
    const openCritical = findings.filter((f) => f.severity === "CRITICAL" && !f.accepted).length;
    const openHigh = findings.filter((f) => f.severity === "HIGH" && !f.accepted).length;
    let status = "passed";
    if (statuses.every((s) => s === "not-run")) status = "not-run";
    else if (statuses.some((s) => s === "failed")) status = "failed";
    else if (statuses.some((s) => s === "passed-with-findings")) status = "passed-with-findings";
    rows[area] = { status, openCritical, openHigh, sourceKeys: keys };
  }
  return rows;
}

function overallStatus(allFindings, sources) {
  if (Object.values(sources).some((s) => s.status === "not-run" && s.mandatory))
    return "blocked";
  const openCritical = allFindings.filter((f) => f.severity === "CRITICAL" && !f.accepted).length;
  if (openCritical > 0) return "failed";
  const openIssues = allFindings.filter((f) => f.severity !== "INFO" && !f.accepted).length;
  return openIssues > 0 ? "passed-with-findings" : "passed";
}

function releaseRecommendation(allFindings, sources) {
  const openCrit = allFindings.filter((f) => f.severity === "CRITICAL" && !f.accepted).length;
  const openHigh = allFindings.filter((f) => f.severity === "HIGH" && !f.accepted).length;
  const authOpen = allFindings.some(
    (f) => !f.accepted && ["CRITICAL", "HIGH"].includes(f.severity) && /auth|identity|rbac/i.test(f.area),
  );
  const azureOpen = allFindings.some(
    (f) => !f.accepted && ["CRITICAL", "HIGH"].includes(f.severity) && /azure/i.test(f.area),
  );
  if (openCrit > 0) return { level: "not-production", reason: `${openCrit} offene CRITICAL-Findings.` };
  if (authOpen) return { level: "restricted-pilot", reason: "Auth-/RBAC-Blocker offen — Pilot nur ohne Produktivdaten." };
  if (azureOpen) return { level: "restricted-pilot", reason: "Azure-Blocker offen — Pilot ohne Live-Azure-Anbindung." };
  if (openHigh > 0) return { level: "pilot-ready", reason: `${openHigh} HIGH-Findings — für Pilot geeignet, für Produktion nicht.` };
  if (sources.security?.status === "passed" && sources.backup?.status === "passed")
    return { level: "next-phase", reason: "Alle Pflichtbereiche grün." };
  return { level: "continue-development", reason: "Weiterentwicklung empfohlen." };
}

// ------------------------------------------------------------------ diff

function diffReports(current, prev) {
  const prevMap = new Map((prev?.findings ?? []).map((f) => [f.id, f]));
  const curMap = new Map(current.findings.map((f) => [f.id, f]));
  const newer = [];
  const fixed = [];
  const worse = [];
  const same = [];
  const reappeared = [];
  for (const [id, f] of curMap) {
    const p = prevMap.get(id);
    if (!p) newer.push(id);
    else if (SEV[f.severity] > SEV[p.severity]) worse.push(id);
    else if (p.status === "closed" && f.status !== "closed") reappeared.push(id);
    else same.push(id);
  }
  for (const [id, p] of prevMap) {
    if (!curMap.has(id)) fixed.push(id);
  }
  return { new: newer, fixed, worse, same, reappeared };
}

// ------------------------------------------------------------------ blockers

/**
 * Prompt 2A.10 – Quality-Gate-Blocker.
 *
 * Erzeugt eine kanonische Liste harter CI-Blocker aus den aggregierten
 * Findings und den Roh-Vitest-Reports der Bereiche Backup und Security.
 * `scripts/ci/quality-gate.mjs` liest ausschließlich dieses Feld — es gibt
 * keine zweite Wahrheit.
 */
function collectVitestFailures(reportPath) {
  const rep = readJson(reportPath);
  if (!rep) return [];
  const failures = [];
  const walk = (node) => {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.type === "test" || node.tasks === undefined) {
      // vitest json v2: results tree with `testResults[].assertionResults[]`
    }
    if (Array.isArray(node.testResults)) {
      for (const file of node.testResults) {
        for (const t of file.assertionResults ?? []) {
          if (t.status === "failed") failures.push(`${file.name}::${t.fullName ?? t.title}`);
        }
      }
    }
  };
  walk(rep);
  return failures;
}

function computeBlockers(allFindings, sources) {
  const blockers = [];
  const push = (id, reason, detail) => blockers.push({ id, reason, detail });

  // 1. Critical Findings (jede Kategorie)
  for (const f of allFindings) {
    if (f.severity === "CRITICAL" && !f.accepted) {
      push("critical-finding", `Critical Finding offen: ${f.id}`, f.title);
    }
  }
  // 2. High Security Findings
  for (const f of allFindings) {
    if (f.severity === "HIGH" && !f.accepted && f.id.startsWith("sec:")) {
      push("high-security-finding", `High Security Finding: ${f.id}`, f.title);
    }
  }
  // 3. Datenintegritätsfehler (Backup, CRIT/HIGH)
  for (const f of allFindings) {
    if (
      !f.accepted &&
      (f.severity === "CRITICAL" || f.severity === "HIGH") &&
      f.id.startsWith("backup:")
    ) {
      push("data-integrity", `Datenintegritätsfehler: ${f.id}`, f.title);
    }
  }
  // 4. Offener privilegierter Endpoint
  for (const f of allFindings) {
    if (!f.accepted && f.id.startsWith("api:") && /unprotected|privileged|open-endpoint/i.test(`${f.id} ${f.title}`)) {
      push("unprotected-privileged-endpoint", `Privilegierter Endpoint ungeschützt: ${f.id}`, f.title);
    }
  }
  // 5. Secret Leak
  for (const f of allFindings) {
    if (!f.accepted && /secret-leak|gitleaks|leaked-secret/i.test(`${f.id} ${f.title}`)) {
      push("secret-leak", `Secret-Leak-Verdacht: ${f.id}`, f.title);
    }
  }
  // 6. RBAC-Lockout-Test failed → security-vitest.json
  const secFailures = collectVitestFailures(`${OUT_DIR}/security-vitest.json`);
  for (const name of secFailures) {
    if (/admin.?lockout|lockout|last-admin/i.test(name)) {
      push("rbac-lockout-failed", "RBAC-Lockout-Test fehlgeschlagen", name);
    }
  }
  // 7. Backup-/Restore-Kerntest failed → backup-vitest.json
  const backupFailures = collectVitestFailures(`${OUT_DIR}/backup-vitest.json`);
  for (const name of backupFailures) {
    if (/restore|integrity|create\.test|backup-service/i.test(name)) {
      push("backup-restore-core-failed", "Backup-/Restore-Kerntest fehlgeschlagen", name);
    }
  }
  // 8. Docs oder Security-Bereich nicht ausgeführt (Pflichtbereiche)
  for (const key of ["security", "backup", "docs"]) {
    if (sources[key]?.status === "not-run" && sources[key]?.mandatory) {
      push("mandatory-source-missing", `Pflichtbereich ohne Bericht: ${key}`, "Report fehlt");
    }
  }
  return blockers;
}


function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const sources = {
    security: { ...collectSecurity(), mandatory: true },
    api: { ...collectApi(), mandatory: false },
    backup: { ...collectBackup(), mandatory: true },
    techdebt: { ...collectTechDebt(), mandatory: false },
    ops: { ...collectOps(), mandatory: false },
    docs: { ...collectDocs(), mandatory: true },
    manual: { ...collectManual(), mandatory: false },
  };

  // Build-Zeit aus Ops übernehmen, wenn vorhanden.
  const opsRaw = readJson(`${OUT_DIR}/ops-report.json`);
  if (opsRaw?.generatedAt) identity.buildTime = opsRaw.generatedAt;

  const allFindings = Object.values(sources)
    .flatMap((s) => s.findings)
    .sort((a, b) => SEV[b.severity] - SEV[a.severity] || a.order - b.order);

  const areas = computeAreaStatuses(sources);
  const status = overallStatus(allFindings, sources);
  const recommendation = releaseRecommendation(allFindings, sources);

  const prev = existsSync(PREV_JSON) || existsSync(OUT_JSON)
    ? readJson(PREV_JSON) ?? readJson(OUT_JSON)
    : null;

  const blockers = computeBlockers(allFindings, sources);

  const report = {
    schemaVersion: "1.1.0",
    generatedAt: new Date().toISOString(),
    identity,
    status,
    recommendation,
    summary: {
      total: allFindings.length,
      critical: allFindings.filter((f) => f.severity === "CRITICAL").length,
      high: allFindings.filter((f) => f.severity === "HIGH").length,
      medium: allFindings.filter((f) => f.severity === "MEDIUM").length,
      low: allFindings.filter((f) => f.severity === "LOW").length,
      accepted: allFindings.filter((f) => f.accepted).length,
      sources: Object.fromEntries(
        Object.entries(sources).map(([k, v]) => [k, { status: v.status, count: v.findings.length }]),
      ),
    },
    areas,
    findings: allFindings,
    actionOrder: ORDER_BUCKETS.map((bucket) => ({
      bucket,
      findings: allFindings.filter((f) => f.bucket === bucket).map((f) => f.id),
    })).filter((b) => b.findings.length > 0),
    diff: prev ? diffReports({ findings: allFindings }, prev) : null,
    blockers,
  };

  // Rotate: aktueller Bericht wird zur prev.
  if (existsSync(OUT_JSON)) {
    try {
      renameSync(OUT_JSON, PREV_JSON);
    } catch {
      /* ignore */
    }
  }
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  writeFileSync(OUT_MD, renderMarkdown(report));

  console.log(
    `[technical-report] status=${status} findings=${report.summary.total} (C:${report.summary.critical} H:${report.summary.high} M:${report.summary.medium} L:${report.summary.low}) → ${OUT_JSON}`,
  );
}

// ------------------------------------------------------------------ render

const AREA_LABELS = Object.keys(AREA_MAP);
const STATUS_LABEL = {
  passed: "bestanden",
  "passed-with-findings": "bestanden mit Findings",
  failed: "fehlgeschlagen",
  blocked: "blockiert",
  "not-run": "nicht ausgeführt",
};
const REC_LABEL = {
  "continue-development": "Entwicklung fortsetzen",
  "pilot-ready": "für Pilot geeignet",
  "restricted-pilot": "nur eingeschränkt pilotfähig",
  "not-pilot": "nicht pilotfähig",
  "not-production": "nicht produktionsfähig",
  "next-phase": "für nächste Phase freigegeben",
};

function renderMarkdown(r) {
  const lines = [];
  lines.push(`# Technischer Prüfbericht`);
  lines.push("");
  lines.push(`_Generiert: ${r.generatedAt}_`);
  lines.push("");
  lines.push(`## 1. Prüfidentität`);
  lines.push(`- Dashboard-Version: **${r.identity.dashboardVersion}**`);
  lines.push(`- Commit: \`${r.identity.commit}\``);
  lines.push(`- Build-Zeit: ${r.identity.buildTime ?? "—"}`);
  lines.push(`- Testzeit: ${r.identity.testTime}`);
  lines.push(
    `- Umgebung: Node ${r.identity.environment.node} · ${r.identity.environment.platform} · CI=${r.identity.environment.ci}`,
  );
  lines.push("");
  lines.push(`## 2. Gesamtstatus`);
  lines.push(`**${STATUS_LABEL[r.status] ?? r.status}**`);
  lines.push("");
  lines.push(`## 3. Executive Summary`);
  lines.push(
    `- Findings gesamt: ${r.summary.total} (CRITICAL ${r.summary.critical} · HIGH ${r.summary.high} · MEDIUM ${r.summary.medium} · LOW ${r.summary.low} · akzeptiert ${r.summary.accepted}).`,
  );
  lines.push(`- Freigabeempfehlung: **${REC_LABEL[r.recommendation.level]}** — ${r.recommendation.reason}`);
  lines.push("");
  lines.push(`## 4. Testergebnisse nach Bereich`);
  lines.push("");
  lines.push(`| Bereich | Status | CRIT offen | HIGH offen |`);
  lines.push(`| --- | --- | ---: | ---: |`);
  for (const a of AREA_LABELS) {
    const row = r.areas[a];
    lines.push(`| ${a} | ${STATUS_LABEL[row.status] ?? row.status} | ${row.openCritical} | ${row.openHigh} |`);
  }
  lines.push("");
  lines.push(`## 5. Findings`);
  if (!r.findings.length) lines.push("_Keine._");
  for (const f of r.findings) {
    lines.push("");
    lines.push(`### ${f.id} · ${f.severity} · ${f.title}`);
    lines.push(`- **Kategorie**: ${f.category} / ${f.area}`);
    lines.push(`- **Quelle**: ${f.source}${f.accepted ? " (akzeptiert)" : ""}`);
    if (f.description) lines.push(`- **Beschreibung**: ${f.description}`);
    if (f.cause) lines.push(`- **Ursache**: ${f.cause}`);
    if (f.impact) lines.push(`- **Auswirkung**: ${f.impact}`);
    if (f.components?.length) lines.push(`- **Komponenten**: ${f.components.join(", ")}`);
    if (f.evidence?.reportRef) lines.push(`- **Nachweis**: ${f.evidence.reportRef}`);
    if (f.recommendation) lines.push(`- **Empfehlung**: ${f.recommendation}`);
    lines.push(`- **Aufwand**: ${f.effort} · **Bearbeitungsreihenfolge**: ${f.bucket} · **Status**: ${f.status}`);
  }
  lines.push("");
  lines.push(`## 6. Sortierte Maßnahmenliste`);
  for (const b of r.actionOrder) {
    lines.push(`- **${b.bucket}** (${b.findings.length}): ${b.findings.join(", ")}`);
  }
  if (!r.actionOrder.length) lines.push("_Keine offenen Maßnahmen._");
  lines.push("");
  lines.push(`## 7. Vergleich zum vorherigen Bericht`);
  if (!r.diff) {
    lines.push("_Kein Vorbericht — dies ist der erste Lauf._");
  } else {
    lines.push(`- Neu: ${r.diff.new.length}`);
    lines.push(`- Behoben: ${r.diff.fixed.length}`);
    lines.push(`- Verschlechtert: ${r.diff.worse.length}`);
    lines.push(`- Unverändert: ${r.diff.same.length}`);
    lines.push(`- Wieder aufgetreten: ${r.diff.reappeared.length}`);
  }
  lines.push("");
  lines.push(`## 8. Freigabeempfehlung`);
  lines.push(`**${REC_LABEL[r.recommendation.level]}** — ${r.recommendation.reason}`);
  lines.push("");
  lines.push(`## 9. Quality-Gate-Blocker (Prompt 2A.10)`);
  if (!r.blockers?.length) {
    lines.push("_Keine — CI-Gate ist grün._");
  } else {
    for (const b of r.blockers) {
      lines.push(`- **${b.id}** — ${b.reason}${b.detail ? ` _(${b.detail})_` : ""}`);
    }
  }
  lines.push("");
  lines.push(`## Bekannte Grenzen`);
  lines.push(`- Reine Aggregation: Qualität hängt an den Einzelberichten.`);
  lines.push(`- Bereichs-Status \`not-run\` heißt fehlender Vorbericht, nicht „grün".`);
  lines.push(`- Diff-Match über Finding-ID; Bereichsberichte ohne stabile IDs erhalten einen Titel-Hash.`);
  return lines.join("\n") + "\n";
}

main();
