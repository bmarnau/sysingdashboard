#!/usr/bin/env node
/**
 * Erzeugt aus `api-inventory.json` + Runner-Outputs die konsolidierten
 * Berichte `api-smoke-report.json` und `api-functional-report.json`.
 *
 * Der Smoke-Vitest-Runner schreibt Rohdaten unter
 * `test-report/api-smoke-raw.json`; dieses Skript aggregiert sie zu
 * dem im Prompt geforderten Format. Fehlt der Rohbericht (z. B. weil
 * Tests nicht ausgeführt wurden), wird jeder Endpoint als
 * `skipped` markiert — niemals als `passed`.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const INVENTORY = join(ROOT, "test-report", "api-inventory.json");
const SMOKE_RAW = join(ROOT, "test-report", "api-smoke-raw.json");
const FUNC_RAW = join(ROOT, "test-report", "api-functional-raw.json");
const SMOKE_OUT = join(ROOT, "test-report", "api-smoke-report.json");
const FUNC_OUT = join(ROOT, "test-report", "api-functional-report.json");
const FINDINGS_OUT = join(ROOT, "test-report", "api-findings.md");

function loadJson(p, fallback) {
  if (!existsSync(p)) return fallback;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function buildSmoke(inv, raw) {
  const perEndpoint = raw.results ?? [];
  const idx = new Map(perEndpoint.map((r) => [r.endpointId, r]));
  const results = inv.endpoints.map((ep) => {
    const r = idx.get(ep.id);
    if (!r) {
      return {
        endpointId: ep.id,
        path: ep.path,
        method: ep.methods[0] ?? null,
        classification: ep.classification,
        status: "skipped",
        scenarios: [],
        reason: "no smoke test executed",
      };
    }
    return { ...r, path: ep.path, classification: ep.classification };
  });
  const counts = {
    total: inv.endpoints.length,
    tested: results.filter((r) => r.status !== "skipped").length,
    passed: results.filter((r) => r.status === "passed").length,
    failed: results.filter((r) => r.status === "failed").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    notImplemented: results.filter((r) => r.status === "not-implemented").length,
    notConfigured: results.filter((r) => r.status === "not-configured").length,
    unclassified: inv.endpoints.filter((e) => e.classification === "unclassified").length,
    withoutAuthTest: results.filter(
      (r) => !r.scenarios?.some((s) => s.category === "auth"),
    ).length,
    withoutValidationTest: results.filter(
      (r) => !r.scenarios?.some((s) => s.category === "validation"),
    ).length,
    withoutSchemaCheck: results.filter(
      (r) => !r.scenarios?.some((s) => s.category === "schema"),
    ).length,
  };
  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    dashboardVersion: inv.dashboardVersion,
    commit: inv.commit,
    counts,
    results,
  };
}

function buildFunctional(inv, raw) {
  const perEndpoint = raw.results ?? [];
  const idx = new Map(perEndpoint.map((r) => [r.endpointId, r]));
  const results = inv.endpoints.map((ep) => {
    const r = idx.get(ep.id);
    if (!r) {
      return {
        endpointId: ep.id,
        path: ep.path,
        purpose: null,
        coverage: "missing",
        gaps: ["no functional test executed"],
      };
    }
    return { ...r, path: ep.path };
  });
  const counts = {
    total: inv.endpoints.length,
    complete: results.filter((r) => r.coverage === "complete").length,
    partial: results.filter((r) => r.coverage === "partial").length,
    missing: results.filter((r) => r.coverage === "missing").length,
    blocked: results.filter((r) => r.coverage === "blocked").length,
    notApplicable: results.filter((r) => r.coverage === "not-applicable").length,
  };
  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    dashboardVersion: inv.dashboardVersion,
    commit: inv.commit,
    counts,
    results,
  };
}

function buildFindingsMarkdown(inv, smoke, func) {
  const bySeverity = { critical: [], high: [], medium: [], low: [], informational: [] };
  for (const f of inv.findings) {
    (bySeverity[f.severity] ?? bySeverity.informational).push(f);
  }
  const lines = [
    "# API Discovery — Findings",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Dashboard: ${inv.dashboardVersion} · Commit: ${inv.commit}`,
    "",
    "## Zusammenfassung",
    "",
    `- Endpoints: **${inv.counts.endpoints}**`,
    `- Unklassifiziert: **${inv.counts.unclassified}**`,
    `- Smoke passed / failed / skipped: **${smoke.counts.passed}** / **${smoke.counts.failed}** / **${smoke.counts.skipped}**`,
    `- Functional coverage complete / partial / missing: **${func.counts.complete}** / **${func.counts.partial}** / **${func.counts.missing}**`,
    "",
  ];
  for (const sev of ["critical", "high", "medium", "low", "informational"]) {
    const list = bySeverity[sev];
    if (!list.length) continue;
    lines.push(`## ${sev.toUpperCase()} (${list.length})`, "");
    for (const f of list) {
      lines.push(`### ${f.id} — ${f.title}`);
      lines.push(`- Endpoint: \`${f.methods?.join(",") ?? "?"} ${f.endpoint}\``);
      lines.push(`- Datei: \`${f.file}\``);
      lines.push(`- Kategorie: ${f.category}`);
      lines.push(`- Beschreibung: ${f.description}`);
      lines.push(`- Empfehlung: ${f.recommendation}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

function main() {
  if (!existsSync(INVENTORY)) {
    // eslint-disable-next-line no-console
    console.error("[api-report] no inventory found — run `bun run api:discover` first");
    process.exit(1);
  }
  const inv = loadJson(INVENTORY);
  const smokeRaw = loadJson(SMOKE_RAW, { results: [] });
  const funcRaw = loadJson(FUNC_RAW, { results: [] });
  const smoke = buildSmoke(inv, smokeRaw);
  const func = buildFunctional(inv, funcRaw);

  mkdirSync(dirname(SMOKE_OUT), { recursive: true });
  writeFileSync(SMOKE_OUT, JSON.stringify(smoke, null, 2) + "\n");
  writeFileSync(FUNC_OUT, JSON.stringify(func, null, 2) + "\n");
  writeFileSync(FINDINGS_OUT, buildFindingsMarkdown(inv, smoke, func));

  // eslint-disable-next-line no-console
  console.log(
    `[api-report] smoke=${SMOKE_OUT.replace(ROOT + "/", "")} functional=${FUNC_OUT.replace(ROOT + "/", "")}`,
  );

  if (process.argv.includes("--gate")) {
    const critical = inv.findings.filter((f) => f.severity === "critical").length;
    const highSecurity = inv.findings.filter(
      (f) =>
        f.severity === "high" &&
        ["missing-validation", "privileged-without-auth", "secret-in-response"].includes(
          f.category,
        ),
    ).length;
    if (critical > 0 || highSecurity > 0) {
      // eslint-disable-next-line no-console
      console.error(
        `[api-report] gate failed — critical=${critical}, highSecurity=${highSecurity}`,
      );
      process.exit(1);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
