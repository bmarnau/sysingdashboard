/**
 * Detektor: Zyklische Modul-Abhängigkeiten.
 *
 * Bau des Import-Graphen per Regex über `src/**` (kein TS-Parser, damit
 * die Analyse ohne Zusatz-Deps läuft). Auflösung von Pfad-Aliassen `@/`
 * gegen `src/`. DFS mit Farb-Markern liefert echte Zyklen; wir melden
 * pro Zyklus einen Fund.
 */
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { rel, read, walk, stableId } from "../util.mjs";

const IMPORT_RE = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;

function resolveImport(fromFile, spec, ROOT) {
  if (!spec.startsWith("@/") && !spec.startsWith(".")) return null;
  const base = spec.startsWith("@/")
    ? join(ROOT, "src", spec.slice(2))
    : join(dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mjs`,
    `${base}.js`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  for (const c of candidates) {
    try {
      if (existsSync(c) && statSync(c).isFile()) return c;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function detectCyclicDeps(ROOT) {
  const files = walk(`${ROOT}/src`, /\.(ts|tsx)$/);
  const graph = new Map();
  for (const f of files) {
    const text = read(f);
    const deps = new Set();
    let m;
    while ((m = IMPORT_RE.exec(text)) !== null) {
      const resolved = resolveImport(f, m[1], ROOT);
      if (resolved) deps.add(resolved);
    }
    graph.set(f, deps);
  }

  const cycles = [];
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map();
  const stack = [];

  function dfs(node) {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      const c = color.get(next) ?? WHITE;
      if (c === GRAY) {
        const idx = stack.indexOf(next);
        cycles.push(stack.slice(idx).concat(next));
      } else if (c === WHITE) {
        dfs(next);
      }
    }
    color.set(node, BLACK);
    stack.pop();
  }
  for (const f of files) if ((color.get(f) ?? WHITE) === WHITE) dfs(f);

  const seen = new Set();
  const findings = [];
  const now = new Date().toISOString();
  for (const cyc of cycles) {
    const norm = cyc.map((f) => rel(ROOT, f));
    // Zyklen-Fingerprint: sortierte Node-Menge (identifiziert dieselbe SCC).
    const key = [...new Set(norm)].sort().join(">");
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push({
      id: stableId("cycle", key),
      title: `Zyklische Abhängigkeit (${norm.length - 1} Kanten)`,
      category: "Architektur",
      location: norm[0],
      description: `Zyklus: ${norm.join(" → ")}`,
      rootCause: "Wechselseitiger Import zwischen Modulen; Fehlende gemeinsame Basis-Abstraktion.",
      impact:
        "Erschwert Tree-Shaking, kann zu undefined-Imports zur Laufzeit führen, blockiert saubere Test-Isolation.",
      severity: "High",
      likelihood: "Hoch",
      recommendation:
        "Gemeinsame Types/Utilities in ein drittes Modul extrahieren; Abhängigkeitsrichtung erzwingen.",
      recommendedOrder: 30,
      effort: "mittel",
      status: "offen",
      firstDetected: now,
      lastChecked: now,
      version: process.env.TECH_DEBT_VERSION ?? "unknown",
      source: "automated",
      automatedRule: "cyclic-dep",
      priorityTag: "architecture",
    });
  }
  return findings;
}
