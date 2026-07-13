#!/usr/bin/env node
/**
 * API Discovery.
 *
 * Liest `src/routes/api/**` deterministisch ein, führt die Analyzer
 * aus, reichert das Ergebnis mit der bestehenden Contract-Registry an
 * und schreibt `test-report/api-inventory.json`.
 *
 * Keine Netzaufrufe. Keine Ausführung von Anwendungscode. Kein Crawling.
 */

import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { isExcluded, EXCLUSION_REASONS } from "./exclude.mjs";
import {
  analyzePath,
  analyzeMethods,
  analyzeValidation,
  analyzeCorrelation,
  analyzeAuthGuard,
  analyzePermission,
  analyzeLogging,
  analyzeArchivedImports,
  analyzeDestructiveImpact,
  classify,
} from "./analyzers.mjs";

function safeHere() {
  try {
    return fileURLToPath(new URL(".", import.meta.url));
  } catch {
    // Vitest transforms .mjs — import.meta.url isn't file: there.
    return resolve(process.cwd(), "scripts/api-discovery");
  }
}
const HERE = safeHere();
const ROOT = resolve(HERE, "..", "..");
const DEFAULT_SCAN_DIR = join(ROOT, "src", "routes", "api");
const REGISTRY_PATH = join(ROOT, "src", "__tests__", "api", "registry", "endpoints.ts");

export function walk(dir, root = dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir).sort()) {
    const abs = join(dir, entry);
    const rel = relative(root, abs).replaceAll("\\", "/");
    if (isExcluded(rel)) continue;
    const st = statSync(abs);
    if (st.isDirectory()) out.push(...walk(abs, root));
    else if (/\.tsx?$/.test(entry)) out.push(abs);
  }
  return out;
}

/**
 * Liest die Registry-Datei als Text — nur die weichen Felder wie
 * `id`, `permission`, `authRequired`, `status`. Kein Ausführen.
 */
function readRegistryHints() {
  if (!existsSync(REGISTRY_PATH)) return [];
  const src = readFileSync(REGISTRY_PATH, "utf8");
  // Sehr grobe Extraktion — reicht für die aktuelle Registry-Form.
  const entries = [];
  const blocks = src.split(/\n\s{2}\{\s*\n/).slice(1);
  for (const block of blocks) {
    const idM = block.match(/id\s*:\s*["'`]([^"'`]+)["'`]/);
    const pathM = block.match(/path\s*:\s*["'`]([^"'`]+)["'`]/);
    const methodsM = block.match(/methods\s*:\s*\[([^\]]*)\]/);
    const authM = block.match(/authRequired\s*:\s*(true|false)/);
    const permM = block.match(/permission\s*:\s*["'`]([^"'`]+)["'`]/);
    const statusM = block.match(/status\s*:\s*["'`]([^"'`]+)["'`]/);
    if (!pathM) continue;
    entries.push({
      id: idM?.[1] ?? "",
      path: pathM[1],
      methods: methodsM
        ? [...methodsM[1].matchAll(/["'`]([A-Z]+)["'`]/g)].map((m) => m[1])
        : [],
      authRequired: authM ? authM[1] === "true" : null,
      permission: permM?.[1] ?? null,
      status: statusM?.[1] ?? "active",
    });
  }
  return entries;
}

function gitInfo() {
  const safe = (cmd) => {
    try {
      return execSync(cmd, { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
    } catch {
      return "unknown";
    }
  };
  return {
    commit: safe("git rev-parse --short HEAD"),
    branch: safe("git rev-parse --abbrev-ref HEAD"),
  };
}

function readDashboardVersion() {
  const changelog = join(ROOT, "CHANGELOG.md");
  if (!existsSync(changelog)) return "unknown";
  const m = readFileSync(changelog, "utf8").match(/##\s+(\d+\.\d+\.\d+)/);
  return m ? m[1] : "unknown";
}

export function discover(scanDir = DEFAULT_SCAN_DIR) {
  const files = walk(scanDir);
  const registryHints = readRegistryHints();
  const endpoints = [];
  const findings = [];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const path = analyzePath(source);
    if (!path) continue; // keine createFileRoute → keine Server-Route

    const methods = analyzeMethods(source);
    const permission = analyzePermission(source);
    const relFile = relative(ROOT, file).replaceAll("\\", "/");

    // Registry-Merge (überschreibt fehlende Felder additiv).
    const hint = registryHints.find((h) => h.path === path) ?? {};
    const authRequired =
      hint.authRequired !== null && hint.authRequired !== undefined
        ? hint.authRequired
        : analyzeAuthGuard(source);
    const hasValidation = analyzeValidation(source);
    const hasCorrelation = analyzeCorrelation(source);
    const hasLogging = analyzeLogging(source);
    const archivedImports = analyzeArchivedImports(source);

    const classification = classify({
      path,
      methods,
      authRequired,
      permission: permission ?? hint.permission,
    });
    const impact = analyzeDestructiveImpact(path, methods);

    const id = hint.id || path.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
    endpoints.push({
      id,
      path,
      methods: methods.length ? methods : hint.methods,
      routeFile: relFile,
      handler: "server.handlers",
      runtime: "tanstack-start-server-route",
      status: hint.status || "active",
      classification,
      authRequired,
      permission: permission ?? hint.permission ?? null,
      scope: null,
      scopeResolver: null,
      requestValidation: hasValidation,
      requestSchema: hasValidation ? "zod (source-detected)" : null,
      responseSchema: null,
      contentTypes: ["application/json"],
      possibleStatusCodes: [200, 400, 401, 405, 500],
      correlationId: hasCorrelation,
      logging: hasLogging,
      rateLimit: false,
      destructiveImpact: impact,
      smokeTest: true, // wird vom Smoke-Runner erzeugt
      functionalTest: null, // vom Functional-Runner gesetzt
      securityTest: null,
      lastChecked: new Date().toISOString(),
      archivedImports,
    });

    // Findings während der Discovery
    if (archivedImports.length > 0) {
      findings.push({
        id: `DISC-CRIT-${id}-archive-import`,
        severity: "critical",
        category: "active-to-archived-import",
        endpoint: path,
        methods,
        file: relFile,
        title: "Aktive Route importiert aus archiviertem Verzeichnis",
        description: `Datei referenziert: ${archivedImports.join(", ")}`,
        recommendation: "Import entfernen oder Ziel reaktivieren.",
        status: "open",
      });
    }
    if (classification === "unclassified") {
      findings.push({
        id: `DISC-MED-${id}-unclassified`,
        severity: "medium",
        category: "unclassified-endpoint",
        endpoint: path,
        methods,
        file: relFile,
        title: "Endpoint ist nicht klassifiziert",
        description:
          "Keine Auth, keine Permission, kein /api/public/ Prefix — Klassifizierung explizit setzen.",
        recommendation:
          "In Registry `permission`/`authRequired` setzen oder unter `/api/public/*` mit Signaturprüfung ablegen.",
        status: "open",
      });
    }
    if (!hasValidation && methods.some((m) => ["POST", "PUT", "PATCH"].includes(m))) {
      findings.push({
        id: `DISC-HIGH-${id}-no-validation`,
        severity: "high",
        category: "missing-validation",
        endpoint: path,
        methods,
        file: relFile,
        title: "Schreibender Endpoint ohne erkennbare Request-Validierung",
        description: "Keine `z.object(...)` o. ä. im Handler gefunden.",
        recommendation: "Zod-Schema für Request-Body ergänzen.",
        status: "open",
      });
    }
    if (impact !== "read" && impact !== "none" && !authRequired) {
      findings.push({
        id: `DISC-CRIT-${id}-no-auth`,
        severity: "critical",
        category: "privileged-without-auth",
        endpoint: path,
        methods,
        file: relFile,
        title: `Endpoint mit Wirkung ${impact} ohne Authentifizierung`,
        description:
          "Anonymer Aufruf verändert Daten oder löst schreibende Operationen aus.",
        recommendation:
          "Auth-Middleware ergänzen und Permission-Guard serverseitig prüfen.",
        status: "open",
      });
    }
    if (!hasCorrelation) {
      findings.push({
        id: `DISC-MED-${id}-no-correlation`,
        severity: "medium",
        category: "missing-correlation-id",
        endpoint: path,
        methods,
        file: relFile,
        title: "Route ohne Correlation-ID-Wrapper",
        description: "`withCorrelation(...)` nicht erkannt.",
        recommendation:
          "Handler mit `withCorrelation` umschließen (siehe src/lib/correlation-context.server.ts).",
        status: "open",
      });
    }
  }

  // Registry ↔ Discovery diff
  const discoveredPaths = new Set(endpoints.map((e) => e.path));
  for (const hint of registryHints) {
    if (!discoveredPaths.has(hint.path)) {
      findings.push({
        id: `DISC-MED-${hint.id || hint.path}-orphan-registry`,
        severity: "medium",
        category: "orphan-registry-entry",
        endpoint: hint.path,
        methods: hint.methods,
        file: "src/__tests__/api/registry/endpoints.ts",
        title: "Registry-Eintrag ohne existierende Route",
        description: "Endpoint ist in der Registry gelistet, aber im Build nicht vorhanden.",
        recommendation: "Registry-Eintrag entfernen oder Route wiederherstellen.",
        status: "open",
      });
    }
  }

  // Determinismus
  endpoints.sort((a, b) =>
    a.path === b.path ? a.methods.join(",").localeCompare(b.methods.join(",")) : a.path.localeCompare(b.path),
  );
  findings.sort((a, b) => a.id.localeCompare(b.id));

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    dashboardVersion: readDashboardVersion(),
    ...gitInfo(),
    scannedDir: relative(ROOT, scanDir).replaceAll("\\", "/"),
    excluded: EXCLUSION_REASONS,
    counts: {
      endpoints: endpoints.length,
      findings: findings.length,
      unclassified: endpoints.filter((e) => e.classification === "unclassified").length,
    },
    endpoints,
    findings,
  };
}

export function writeInventory(inventory, outFile) {
  const outPath = outFile ?? join(ROOT, "test-report", "api-inventory.json");
  mkdirSync(resolve(outPath, ".."), { recursive: true });
  writeFileSync(outPath, JSON.stringify(inventory, null, 2) + "\n");
  return outPath;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const inv = discover();
  const out = writeInventory(inv);
  // eslint-disable-next-line no-console
  console.log(
    `[api-discovery] ${inv.counts.endpoints} endpoints, ${inv.counts.findings} findings → ${relative(ROOT, out)}`,
  );
  const criticals = inv.findings.filter((f) => f.severity === "critical");
  if (process.argv.includes("--gate") && criticals.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`[api-discovery] gate failed: ${criticals.length} critical finding(s)`);
    process.exit(1);
  }
}
