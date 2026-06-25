#!/usr/bin/env node
/**
 * Security-Check (Custom-Heuristik)
 *
 * Findet Secrets, gefährliche HTTP-Header und unerlaubte Azure-/Connection-
 * Strings im Source-Tree. Schreibt strukturierte Reports (JSON + Markdown)
 * und beendet sich mit Exit 1, sobald mindestens ein HIGH/CRITICAL-Fund
 * existiert.
 *
 * Aufruf (siehe package.json → security:check):
 *   node scripts/security-check.mjs \
 *     --json security-report/findings.json \
 *     --markdown security-report/findings.md
 *
 * Allowlist pro Treffer: ein Code-Kommentar mit
 *   // security-scan-allow: <regel-id>
 * in der **gleichen Zeile** oder in der Zeile direkt davor unterdrückt den Treffer.
 */

import { readFileSync, writeFileSync, mkdirSync, statSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/* --------------------------------- CLI --------------------------------- */

function parseArgs(argv) {
  const out = { json: "", markdown: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = argv[++i] ?? "";
    else if (a === "--markdown") out.markdown = argv[++i] ?? "";
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

/* --------------------------- Scan-Konfiguration ------------------------- */

const SCAN_DIRS = ["src", "backend", "config", "scripts", "app"];

// Pfade (relativ zu ROOT) komplett überspringen.
const IGNORE_DIRS = new Set([
  "node_modules",
  ".lovable",
  ".git",
  ".tanstack",
  ".nitro",
  ".output",
  ".wrangler",
  "dist",
  "dist-ssr",
  "build",
  "security-report",
  "coverage",
]);

const IGNORE_FILE_SUFFIXES = [
  ".lock",
  ".lockb",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".svg",
  ".pdf",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
];

// Einzelne Dateien immer überspringen (Self-Reference, generierte Dateien,
// Dokumentation, in der Schlüsselnamen ohne Werte erlaubt sind).
const IGNORE_FILES = new Set([
  "scripts/security-check.mjs",
  "src/routeTree.gen.ts",
  "CHANGELOG.md",
  "src/lib/help-documentation.ts",
  "src/types/backend.d.ts",
  "config/secretManager.mjs",
]);

const SCAN_FILE_REGEX = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|json|yml|yaml|md|toml|env\.example)$/u;

/* -------------------------------- Regeln -------------------------------- */

/**
 * Jede Regel:
 *  - id        eindeutig, wird auch in `security-scan-allow` referenziert
 *  - severity  CRITICAL | HIGH | MEDIUM
 *  - title     einzeilige Beschreibung
 *  - pattern   RegExp (global, multiline)
 *  - appliesTo (optional) Funktion(relPath) -> boolean
 *  - excludeFile (optional) RegExp gegen relPath, um False-Positives zu unterdrücken
 */

const FRONTEND_ONLY = (rel) =>
  rel.startsWith("src/") &&
  !rel.startsWith("src/routes/api/") &&
  !rel.startsWith("src/server.") &&
  !rel.startsWith("src/start.");

const SERVER_SCOPE = (rel) =>
  rel.startsWith("backend/") ||
  rel.startsWith("src/routes/api/") ||
  rel.startsWith("src/server.") ||
  rel.startsWith("src/start.") ||
  rel.startsWith("config/");

const rules = [
  // ----------------------------- CRITICAL -----------------------------
  {
    id: "azure-account-key",
    severity: "CRITICAL",
    title: "Azure Storage AccountKey-Literal im Code",
    pattern: /AccountKey=[A-Za-z0-9+/=]{40,}/g,
  },
  {
    id: "azure-sas-token",
    severity: "CRITICAL",
    title: "Azure SAS-Token-Literal (sv=…&sig=…)",
    pattern: /\?sv=20\d\d-\d\d-\d\d[^"'\s]*sig=[A-Za-z0-9%+/=]{20,}/g,
  },
  {
    id: "azure-shared-access-sig",
    severity: "CRITICAL",
    title: "SharedAccessSignature mit Wert",
    pattern: /SharedAccessSignature=[^\s"'`]{20,}/g,
  },
  {
    id: "azure-storage-conn",
    severity: "CRITICAL",
    title: "Azure Storage Connection-String",
    pattern: /DefaultEndpointsProtocol=https;\s*AccountName=[^;]+;\s*AccountKey=/g,
  },
  {
    id: "azure-sql-conn",
    severity: "CRITICAL",
    title: "Azure SQL Connection-String (Server=…;Password=…)",
    pattern: /Server=tcp:[^;"'\s]+[^"'\s]*Password=[^;"'\s]+/g,
  },
  {
    id: "aws-access-key",
    severity: "CRITICAL",
    title: "AWS Access Key ID",
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    id: "stripe-live-key",
    severity: "CRITICAL",
    title: "Stripe Live Secret Key",
    pattern: /\bsk_live_[A-Za-z0-9]{20,}\b/g,
  },
  {
    id: "openai-key",
    severity: "CRITICAL",
    title: "OpenAI-Key (sk-…)",
    pattern: /\bsk-[A-Za-z0-9]{32,}\b/g,
  },
  {
    id: "github-pat",
    severity: "CRITICAL",
    title: "GitHub Personal Access Token",
    pattern: /\bghp_[A-Za-z0-9]{36}\b/g,
  },
  {
    id: "slack-token",
    severity: "CRITICAL",
    title: "Slack Token",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    id: "private-key-block",
    severity: "CRITICAL",
    title: "Eingebetteter Private-Key-Block",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g,
  },
  {
    id: "jwt-literal",
    severity: "CRITICAL",
    title: "JWT-Literal (eyJ…\\.…\\.…)",
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },

  // ------------------------------- HIGH -------------------------------
  {
    id: "azure-sdk-in-frontend",
    severity: "HIGH",
    title: "Azure-SDK-Import im Frontend",
    pattern: /from\s+['"](?:@azure\/[^'"]+|mssql|tedious)['"]/g,
    appliesTo: FRONTEND_ONLY,
  },
  {
    id: "azure-env-outside-server",
    severity: "HIGH",
    title: "process.env.AZURE_* / *CONNECTION* außerhalb Server-Scope",
    pattern: /process\.env\.(AZURE_[A-Z0-9_]+|[A-Z0-9_]*CONNECTION[A-Z0-9_]*)/g,
    appliesTo: (rel) => !SERVER_SCOPE(rel),
  },
  {
    id: "cors-wildcard-with-credentials",
    severity: "HIGH",
    title: "CORS-Wildcard mit Credentials (Origin:* + Credentials:true)",
    // Sucht nach beiden Headern innerhalb ~400 Zeichen.
    pattern:
      /Access-Control-Allow-Origin['"\s:,]+\*[\s\S]{0,400}Access-Control-Allow-Credentials['"\s:,]+true|Access-Control-Allow-Credentials['"\s:,]+true[\s\S]{0,400}Access-Control-Allow-Origin['"\s:,]+\*/g,
  },
  {
    id: "x-frame-allowall",
    severity: "HIGH",
    title: "X-Frame-Options: ALLOWALL",
    pattern: /X-Frame-Options['"\s:,]+ALLOWALL/gi,
  },
  {
    id: "csp-unsafe-eval",
    severity: "HIGH",
    title: "Content-Security-Policy enthält unsafe-eval",
    pattern: /Content-Security-Policy[\s\S]{0,400}unsafe-eval/gi,
  },
  {
    id: "dangerously-set-inner-html-dynamic",
    severity: "HIGH",
    title: "dangerouslySetInnerHTML mit (potenziell) dynamischem Input",
    // Heuristik: __html: gefolgt von etwas, das nicht mit " ' oder ` beginnt.
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*(?!["'`])/g,
    excludeFile: /^src\/components\/ui\/chart\.tsx$/,
  },

  // ------------------------------ MEDIUM ------------------------------
  {
    id: "console-error-full-object",
    severity: "MEDIUM",
    title: "console.error mit komplettem Error-Objekt",
    pattern: /console\.error\(\s*(?:err|error|e)\s*\)/g,
  },
  {
    id: "eval-call",
    severity: "MEDIUM",
    title: "eval(…) oder new Function(…)",
    pattern: /\b(?:eval\s*\(|new\s+Function\s*\()/g,
  },
  {
    id: "cors-wildcard-only",
    severity: "MEDIUM",
    title: "CORS-Wildcard (Access-Control-Allow-Origin: *)",
    pattern: /Access-Control-Allow-Origin['"\s:,]+\*/g,
  },
  {
    id: "frontend-direct-third-party-fetch",
    severity: "MEDIUM",
    title: "Direkter Fetch zu externer URL aus Frontend",
    pattern: /\bfetch\(\s*['"`]https?:\/\/(?!localhost|127\.0\.0\.1)/g,
    appliesTo: FRONTEND_ONLY,
  },
];

/* ----------------------------- Datei-Walker ----------------------------- */

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".github") continue;
    if (IGNORE_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile()) out.push(full);
  }
  return out;
}

function shouldScan(rel) {
  if (IGNORE_FILES.has(rel)) return false;
  if (IGNORE_FILE_SUFFIXES.some((s) => rel.endsWith(s))) return false;
  if (!SCAN_FILE_REGEX.test(rel)) return false;
  try {
    if (statSync(join(ROOT, rel)).size > 1_500_000) return false; // >1.5 MB überspringen
  } catch {
    return false;
  }
  return true;
}

/* ------------------------------ Allowlist ------------------------------ */

function isAllowed(rule, lines, lineIdx) {
  const tag = `security-scan-allow:`;
  const idTag = `${tag} ${rule.id}`;
  const here = lines[lineIdx] ?? "";
  const prev = lineIdx > 0 ? lines[lineIdx - 1] : "";
  return (
    here.includes(idTag) ||
    here.includes(`${tag} *`) ||
    prev.includes(idTag) ||
    prev.includes(`${tag} *`)
  );
}

/* -------------------------------- Scan --------------------------------- */

const findings = [];
const filesScanned = [];

const candidateFiles = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));

for (const abs of candidateFiles) {
  const rel = relative(ROOT, abs).split(sep).join("/");
  if (!shouldScan(rel)) continue;
  filesScanned.push(rel);

  let text;
  try {
    text = readFileSync(abs, "utf8");
  } catch {
    continue;
  }
  const lines = text.split(/\r?\n/);

  for (const rule of rules) {
    if (rule.appliesTo && !rule.appliesTo(rel)) continue;
    if (rule.excludeFile && rule.excludeFile.test(rel)) continue;

    // Multiline pattern → auf ganzem Text suchen, dann Zeile berechnen.
    const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`);
    let m;
    while ((m = re.exec(text)) !== null) {
      const offset = m.index;
      const before = text.slice(0, offset);
      const lineIdx = before.split(/\r?\n/).length - 1;
      if (isAllowed(rule, lines, lineIdx)) continue;

      const snippet = (lines[lineIdx] ?? "").trim().slice(0, 200);
      findings.push({
        severity: rule.severity,
        rule: rule.id,
        title: rule.title,
        file: rel,
        line: lineIdx + 1,
        snippet,
      });
      // Doppelfunde derselben Zeile + Regel vermeiden
      if (m[0].length === 0) re.lastIndex++;
    }
  }
}

/* -------------------------------- Report ------------------------------- */

const counts = findings.reduce(
  (acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  },
  { CRITICAL: 0, HIGH: 0, MEDIUM: 0 },
);

const summary = {
  generatedAt: new Date().toISOString(),
  filesScanned: filesScanned.length,
  rulesEvaluated: rules.length,
  counts,
  failed: counts.CRITICAL > 0 || counts.HIGH > 0,
};

function ensureDirFor(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

if (args.json) {
  ensureDirFor(args.json);
  writeFileSync(args.json, JSON.stringify({ summary, findings }, null, 2));
}

if (args.markdown) {
  ensureDirFor(args.markdown);
  const md = renderMarkdown(summary, findings);
  writeFileSync(args.markdown, md);
}

function renderMarkdown(s, list) {
  const bySev = { CRITICAL: [], HIGH: [], MEDIUM: [] };
  for (const f of list) bySev[f.severity].push(f);

  const head = [
    `# Security-Scan-Report`,
    ``,
    `- **Generiert:** ${s.generatedAt}`,
    `- **Dateien geprüft:** ${s.filesScanned}`,
    `- **Regeln:** ${s.rulesEvaluated}`,
    `- **CRITICAL:** ${s.counts.CRITICAL} · **HIGH:** ${s.counts.HIGH} · **MEDIUM:** ${s.counts.MEDIUM}`,
    `- **Build-Status:** ${s.failed ? "❌ FAIL (CRITICAL/HIGH)" : "✅ PASS"}`,
    ``,
  ];

  function table(title, items) {
    if (items.length === 0) return [`## ${title}`, ``, `_Keine Funde._`, ``];
    const rows = items.map(
      (f) =>
        `| \`${f.rule}\` | ${f.file}:${f.line} | ${escapeMd(f.title)} | \`${escapeMd(f.snippet)}\` |`,
    );
    return [
      `## ${title} (${items.length})`,
      ``,
      `| Regel | Fundstelle | Beschreibung | Snippet |`,
      `| --- | --- | --- | --- |`,
      ...rows,
      ``,
    ];
  }

  return [
    ...head,
    ...table("CRITICAL", bySev.CRITICAL),
    ...table("HIGH", bySev.HIGH),
    ...table("MEDIUM", bySev.MEDIUM),
    `---`,
    ``,
    `Allowlist pro Treffer: \`// security-scan-allow: <regel-id>\` in derselben oder der Vorzeile.`,
    ``,
  ].join("\n");
}

function escapeMd(s) {
  return String(s).replace(/\|/g, "\\|").replace(/`/g, "\\`");
}

/* ------------------------------- Stdout -------------------------------- */

const line = (s) => process.stdout.write(`${s}\n`);
line(`Security-Check`);
line(`  Dateien geprüft: ${summary.filesScanned}`);
line(`  CRITICAL: ${counts.CRITICAL}  HIGH: ${counts.HIGH}  MEDIUM: ${counts.MEDIUM}`);
if (args.json) line(`  JSON-Report:     ${args.json}`);
if (args.markdown) line(`  Markdown-Report: ${args.markdown}`);

if (findings.length > 0) {
  line("");
  for (const f of findings.slice(0, 50)) {
    line(`  [${f.severity}] ${f.rule}  ${f.file}:${f.line}  — ${f.title}`);
  }
  if (findings.length > 50) line(`  … (+${findings.length - 50} weitere)`);
}

if (summary.failed) {
  line("");
  line("✗ Security-Check fehlgeschlagen (CRITICAL oder HIGH).");
  process.exit(1);
}

line("");
line("✓ Keine blockierenden Funde.");
