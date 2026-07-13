/**
 * Detektor: Übergroße Module.
 *
 * Reine LOC-Heuristik über 400 Zeilen (Frontend) bzw. 500 (Libs). Bewusst
 * ohne AST — False-Positive-Rate akzeptabel, weil Manual-Review-Empfehlung
 * gegeben wird.
 */
import { rel, read, walk, stableId } from "../util.mjs";

const FRONTEND_THRESHOLD = 400;
const LIB_THRESHOLD = 600;
const EXCLUDE = /(^src\/routeTree\.gen\.ts$|^src\/lib\/help-documentation\.ts$|^src\/data\/)/;

export function detectOversizeModules(ROOT) {
  const findings = [];
  const now = new Date().toISOString();
  const files = walk(`${ROOT}/src`, /\.(ts|tsx)$/);

  for (const abs of files) {
    const relPath = rel(ROOT, abs);
    if (EXCLUDE.test(relPath)) continue;
    const text = read(abs);
    const lines = text.split(/\r?\n/).length;
    const isComponent = relPath.startsWith("src/components/") || /\.tsx$/.test(relPath);
    const threshold = isComponent ? FRONTEND_THRESHOLD : LIB_THRESHOLD;
    if (lines <= threshold) continue;

    const overshoot = lines - threshold;
    const severity =
      overshoot > threshold ? "High" : overshoot > threshold / 2 ? "Medium" : "Low";

    findings.push({
      id: stableId("oversize", relPath),
      title: `Modul überschreitet Größenschwelle (${lines} Zeilen)`,
      category: isComponent ? "Frontend" : "Architektur",
      location: relPath,
      description: `Die Datei hat ${lines} Zeilen (Schwelle ${threshold}). Wahrscheinlich mehrere Verantwortlichkeiten.`,
      rootCause: "Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.",
      impact:
        "Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.",
      severity,
      likelihood: "Mittel",
      recommendation:
        "Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).",
      recommendedOrder: severity === "High" ? 60 : 80,
      effort: overshoot > threshold ? "gross" : "mittel",
      status: "offen",
      firstDetected: now,
      lastChecked: now,
      version: process.env.TECH_DEBT_VERSION ?? "unknown",
      source: "automated",
      automatedRule: "oversize-module",
      priorityTag: "architecture",
    });
  }

  return findings;
}
