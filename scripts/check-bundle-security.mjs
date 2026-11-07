#!/usr/bin/env node
/**
 * Bundle-Sicherheitsprüfung nach dem Build bzw. nach dem Publish (A33, G22, G14).
 *
 * Ersetzt die Handprüfung aus `docs/LOVABLE-PUBLISH-PRUEFUNG.md`
 * (Abschnitt „Befund veröffentlichte App“):
 *
 *  (a) Keine Broker-Kennungen im Bundle: `lovable-preview-auth:get`, `:set`,
 *      `:remove`, `:result` (ADR-0036, R-07).
 *  (b) `@tanstack/react-start` im Lockfile (`bun.lock` bzw. `package-lock.json`)
 *      mindestens 1.168.60 (GHSA-qx66-fv34-fjm8).
 *
 * Eingaben:
 *   node scripts/check-bundle-security.mjs                 # prüft dist/, sonst .output/
 *   node scripts/check-bundle-security.mjs --dist <dir>    # anderes Build-Verzeichnis
 *   node scripts/check-bundle-security.mjs a.js b.js       # lokal gespeicherte Skriptdateien
 *   --lockfile <pfad>   Lockfile ausdrücklich angeben (Standard: bun.lock, sonst package-lock.json)
 *   --json <pfad>       JSON-Ergebnis zusätzlich in eine Datei schreiben
 *
 * Ausgabe: Tabelle und JSON auf stdout. Exitcode 0 = ok, 1 = Fund
 * (Kennung im Bundle oder Version zu alt bzw. nicht ermittelbar), 2 = Eingabe fehlt.
 * Rein lesend: kein Netzwerkzugriff, keine Zugangsdaten.
 *
 * Hinweis: `scripts/check-bundle.mjs` (`test:perf`) bleibt die Größenmessung
 * und läuft in der CI; diese Prüfung ist bewusst nur ein eigener npm-Aufruf
 * (`npm run check:bundle`).
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, join, relative, resolve } from "node:path";

// In jsdom (Vitest) ist `import.meta.url` keine file-URL; dann gilt das Arbeitsverzeichnis.
function projectRoot() {
  try {
    return resolve(fileURLToPath(new URL("..", import.meta.url)));
  } catch {
    return process.cwd();
  }
}
const ROOT = projectRoot();

export const BROKER_MARKERS = [
  "lovable-preview-auth:get",
  "lovable-preview-auth:set",
  "lovable-preview-auth:remove",
  "lovable-preview-auth:result",
];
export const PACKAGE_NAME = "@tanstack/react-start";
export const MIN_VERSION = "1.168.60";
export const ADVISORY = "GHSA-qx66-fv34-fjm8";
const DEFAULT_DIRS = ["dist", ".output"];
const SCRIPT_EXT = /\.(js|mjs|cjs|html)$/i;

/** Liefert die im Text enthaltenen Broker-Kennungen (ohne Dubletten). */
export function scanContent(text) {
  return BROKER_MARKERS.filter((m) => text.includes(m));
}

/** Sammelt Skriptdateien rekursiv aus einem Verzeichnis. */
export function collectFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...collectFiles(full));
    else if (SCRIPT_EXT.test(name)) out.push(full);
  }
  return out.sort();
}

/** Prüft Dateien auf Broker-Kennungen; liefert nur Dateien mit Fund. */
export function scanFiles(files) {
  const hits = [];
  for (const file of files) {
    const markers = scanContent(readFileSync(file, "utf8"));
    if (markers.length > 0) hits.push({ file, markers });
  }
  return hits;
}

/** Vergleicht x.y.z-Versionen; Vorabversionen gelten als kleiner. */
export function compareVersions(a, b) {
  const parse = (v) => {
    const [core, pre] = String(v).split("-", 2);
    return { nums: core.split(".").map((n) => Number.parseInt(n, 10) || 0), pre };
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const d = (pa.nums[i] ?? 0) - (pb.nums[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  if (pa.pre && !pb.pre) return -1;
  if (!pa.pre && pb.pre) return 1;
  return 0;
}

/**
 * Liest alle aufgelösten Versionen von `@tanstack/react-start` aus einem
 * Lockfile-Text. `kind` ist `bun` (bun.lock, JSONC) oder `npm` (package-lock.json).
 */
export function readLockfileVersions(text, kind) {
  const versions = new Set();
  if (kind === "npm") {
    const lock = JSON.parse(text);
    for (const [key, entry] of Object.entries(lock.packages ?? {})) {
      if (key === `node_modules/${PACKAGE_NAME}` || key.endsWith(`/node_modules/${PACKAGE_NAME}`)) {
        if (entry?.version) versions.add(entry.version);
      }
    }
    // lockfileVersion 1
    const legacy = lock.dependencies?.[PACKAGE_NAME]?.version;
    if (legacy) versions.add(legacy);
  } else {
    // bun.lock: "<schlüssel>": ["@tanstack/react-start@1.168.60", ...]
    const re = /\[\s*"@tanstack\/react-start@([0-9][^"]*)"/g;
    let m;
    while ((m = re.exec(text)) !== null) versions.add(m[1]);
  }
  return [...versions].sort(compareVersions);
}

/** Ermittelt das Lockfile: ausdrücklich angegeben, sonst bun.lock, sonst package-lock.json. */
export function resolveLockfile(root, explicit) {
  if (explicit) return resolve(explicit);
  for (const name of ["bun.lock", "package-lock.json"]) {
    const p = resolve(root, name);
    if (existsSync(p)) return p;
  }
  return null;
}

/** Prüft das Lockfile gegen die Mindestversion. */
export function checkLockfile(lockfilePath) {
  const base = { package: PACKAGE_NAME, min: MIN_VERSION, advisory: ADVISORY };
  if (!lockfilePath || !existsSync(lockfilePath)) {
    return { ...base, ok: false, lockfile: lockfilePath, versions: [], reason: "Lockfile fehlt" };
  }
  const kind = basename(lockfilePath).startsWith("package-lock") ? "npm" : "bun";
  let versions;
  try {
    versions = readLockfileVersions(readFileSync(lockfilePath, "utf8"), kind);
  } catch (e) {
    return {
      ...base,
      ok: false,
      lockfile: lockfilePath,
      versions: [],
      reason: `Lockfile nicht lesbar: ${e.message}`,
    };
  }
  if (versions.length === 0) {
    return {
      ...base,
      ok: false,
      lockfile: lockfilePath,
      versions,
      reason: "Paket nicht im Lockfile",
    };
  }
  const tooOld = versions.filter((v) => compareVersions(v, MIN_VERSION) < 0);
  return {
    ...base,
    ok: tooOld.length === 0,
    lockfile: lockfilePath,
    versions,
    reason: tooOld.length ? `zu alt: ${tooOld.join(", ")} < ${MIN_VERSION}` : null,
  };
}

/**
 * Führt beide Prüfungen aus.
 * @param {{ root?: string, dist?: string, files?: string[], lockfile?: string }} opts
 */
export function runCheck(opts = {}) {
  const root = opts.root ?? ROOT;
  let files;
  let source;
  if (opts.files && opts.files.length > 0) {
    files = opts.files.map((f) => resolve(f));
    source = "dateien";
  } else {
    // Ohne Angabe: `dist/` (Vite/Cloudflare), sonst `.output/` (Nitro-Build lokal).
    const candidates = opts.dist ? [opts.dist] : DEFAULT_DIRS;
    const dist = candidates.map((d) => resolve(root, d)).find((d) => existsSync(d));
    if (!dist) {
      return {
        ok: false,
        error: `Eingabe fehlt: ${candidates.join(" bzw. ")} existiert nicht (zuerst bauen)`,
      };
    }
    files = collectFiles(dist);
    source = dist;
  }
  const missing = files.filter((f) => !existsSync(f));
  if (missing.length > 0) {
    return { ok: false, error: `Dateien fehlen: ${missing.join(", ")}` };
  }
  const hits = scanFiles(files);
  const lock = checkLockfile(resolveLockfile(root, opts.lockfile));
  return {
    ok: hits.length === 0 && lock.ok,
    source,
    scannedFiles: files.length,
    broker: { ok: hits.length === 0, markers: BROKER_MARKERS, hits },
    lockfile: lock,
  };
}

/** Tabellarische Ausgabe für die Konsole. */
export function formatTable(result, root = ROOT) {
  const rel = (p) => (p ? relative(root, p) || p : "-");
  const rows = [
    ["Prüfpunkt", "Ergebnis", "Detail"],
    [
      "Broker-Kennungen",
      result.broker.ok ? "ok" : "FUND",
      result.broker.ok
        ? `${result.scannedFiles} Dateien ohne Kennung`
        : result.broker.hits.map((h) => `${rel(h.file)}: ${h.markers.join(", ")}`).join("; "),
    ],
    [
      `${PACKAGE_NAME} >= ${MIN_VERSION}`,
      result.lockfile.ok ? "ok" : "FUND",
      `${rel(result.lockfile.lockfile)}: ${result.lockfile.versions.join(", ") || "-"}${
        result.lockfile.reason ? ` (${result.lockfile.reason})` : ""
      }`,
    ],
  ];
  const widths = [0, 1, 2].map((i) => Math.max(...rows.map((r) => r[i].length)));
  const line = (r) => `| ${r.map((c, i) => c.padEnd(widths[i])).join(" | ")} |`;
  return [
    line(rows[0]),
    `|${widths.map((w) => "-".repeat(w + 2)).join("|")}|`,
    ...rows.slice(1).map(line),
  ].join("\n");
}

function parseArgs(argv) {
  const opts = { files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dist") opts.dist = argv[++i];
    else if (a === "--lockfile") opts.lockfile = argv[++i];
    else if (a === "--json") opts.json = argv[++i];
    else opts.files.push(a);
  }
  return opts;
}

const isCli = process.argv[1] && process.argv[1].endsWith("check-bundle-security.mjs");
if (isCli) {
  const opts = parseArgs(process.argv.slice(2));
  const result = runCheck(opts);
  if (result.error) {
    console.error(`[check:bundle] ${result.error}`);
    process.exit(2);
  }
  console.log(formatTable(result));
  const json = JSON.stringify(result, null, 2);
  console.log(json);
  if (opts.json) writeFileSync(resolve(opts.json), `${json}\n`);
  console.log(`[check:bundle] ${result.ok ? "ok" : "FUND, Exit 1"}`);
  process.exit(result.ok ? 0 : 1);
}
