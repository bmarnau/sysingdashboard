/**
 * Detektor: Verwaiste Module.
 *
 * Baut einen einfachen "wird-referenziert"-Index über alle Imports/Requires
 * in `src/**` und meldet Dateien, die von keiner anderen Datei referenziert
 * werden. Route-, Setup- und Entry-Dateien sind Whitelist.
 */
import { basename } from "node:path";
import { rel, read, walk, stableId } from "../util.mjs";

const IMPORT_RE = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;
const WHITELIST = [
  /^src\/routes\//, // TanStack lädt Route-Dateien dynamisch.
  /^src\/router\.tsx$/,
  /^src\/server\.ts$/,
  /^src\/start\.ts$/,
  /^src\/styles\.css$/,
  /^src\/routeTree\.gen\.ts$/,
  /^src\/__tests__\//,
  /^src\/types\//,
  /\.d\.ts$/,
];

export function detectOrphanModules(ROOT) {
  const files = walk(`${ROOT}/src`, /\.(ts|tsx)$/);
  const references = new Set();

  for (const f of files) {
    const text = read(f);
    let m;
    while ((m = IMPORT_RE.exec(text)) !== null) {
      const spec = m[1];
      // Nur die letzte Pfadkomponente ohne Extension als Kandidat sammeln.
      const base = basename(spec).replace(/\.(ts|tsx|mjs|js)$/, "");
      if (base) references.add(base);
    }
  }

  const findings = [];
  const now = new Date().toISOString();

  for (const abs of files) {
    const relPath = rel(ROOT, abs);
    if (WHITELIST.some((re) => re.test(relPath))) continue;
    const base = basename(relPath).replace(/\.(ts|tsx|mjs|js)$/, "");
    if (references.has(base)) continue;

    findings.push({
      id: stableId("orphan", relPath),
      title: "Möglicherweise verwaistes Modul",
      category: "Architektur",
      location: relPath,
      description:
        "Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).",
      rootCause: "Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.",
      impact: "Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.",
      severity: "Low",
      likelihood: "Niedrig",
      recommendation:
        "Datei löschen oder ins `archive/` verschieben, falls historisch relevant.",
      recommendedOrder: 85,
      effort: "klein",
      status: "offen",
      firstDetected: now,
      lastChecked: now,
      version: process.env.TECH_DEBT_VERSION ?? "unknown",
      source: "automated",
      automatedRule: "orphan-module",
      priorityTag: "architecture",
    });
  }

  return findings;
}
