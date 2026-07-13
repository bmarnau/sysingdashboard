/**
 * Detektor: direkte console.*-Nutzung außerhalb der Allowlist.
 *
 * Ergänzt den bestehenden `scripts/check-no-console.mjs` (harter Guard) mit
 * einer Trend-Metrik: jede Fundstelle als Finding, damit der Bericht die
 * technische Schuld sichtbar macht. Der harte CI-Gate bleibt bestehen.
 */
import { rel, read, walk, stableId, lineOf } from "../util.mjs";

const RE = /console\.(log|debug|info|warn|error)\s*\(/g;
const ALLOW = [
  /^src\/lib\/logger(\.|-)/,
  /^src\/lib\/error-capture\.ts$/,
  /^src\/lib\/error-page\.ts$/,
  /^backend\//,
  /^scripts\//,
  /^src\/__tests__\//,
];

export function detectConsoleUsage(ROOT) {
  const findings = [];
  const now = new Date().toISOString();
  const files = [
    ...walk(`${ROOT}/src`, /\.(ts|tsx)$/),
    ...walk(`${ROOT}/backend/services`, /\.mjs$/),
  ];

  for (const abs of files) {
    const relPath = rel(ROOT, abs);
    if (ALLOW.some((re) => re.test(relPath))) continue;
    const text = read(abs);
    let m;
    while ((m = RE.exec(text)) !== null) {
      const line = lineOf(text, m.index);
      findings.push({
        id: stableId("console", relPath, line, m[1]),
        title: `Direktes console.${m[1]} außerhalb der Logger-Fassade`,
        category: "Frontend",
        location: `${relPath}:${line}`,
        description: `Aufruf: console.${m[1]}(…)`,
        rootCause: "Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).",
        impact:
          "Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.",
        severity: "Medium",
        likelihood: "Mittel",
        recommendation: "Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).",
        recommendedOrder: 45,
        effort: "klein",
        status: "offen",
        firstDetected: now,
        lastChecked: now,
        version: process.env.TECH_DEBT_VERSION ?? "unknown",
        source: "automated",
        automatedRule: "console-direct",
        priorityTag: "stability",
      });
    }
  }
  return findings;
}
