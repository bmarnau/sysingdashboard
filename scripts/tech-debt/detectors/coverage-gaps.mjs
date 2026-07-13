/**
 * Detektor: Coverage-Lücken in kritischen Services.
 *
 * Liest `coverage/coverage-summary.json` (falls vorhanden) und meldet
 * Dateien unter definiertem kritischem Scope mit Line-Coverage < 50 %.
 * Fehlt der Report, wird ein einzelner „Informational"-Hinweis erzeugt —
 * kein hartes Failing.
 */
import { existsSync, readFileSync } from "node:fs";
import { rel, stableId } from "../util.mjs";

const CRITICAL = [
  /src\/lib\/azure\//,
  /src\/lib\/rbac\//,
  /src\/lib\/backup-service\.ts$/,
  /src\/lib\/json-(import|export)-service\.ts$/,
  /src\/lib\/user-management\.ts$/,
  /src\/lib\/logger(\.|-)/,
];
const THRESHOLD = 50;

export function detectCoverageGaps(ROOT) {
  const findings = [];
  const now = new Date().toISOString();
  const file = `${ROOT}/coverage/coverage-summary.json`;
  if (!existsSync(file)) {
    findings.push({
      id: stableId("coverage", "no-report"),
      title: "Kein Coverage-Report vorhanden",
      category: "Tests",
      location: "coverage/coverage-summary.json",
      description:
        "Für den aktuellen Buildstand liegt keine Coverage-Zusammenfassung vor. Coverage-Lücken können nicht bewertet werden.",
      rootCause: "`bun run test:coverage` wurde vor `test:debt` nicht ausgeführt.",
      impact: "Trend-Analyse der Testabdeckung blind.",
      severity: "Informational",
      likelihood: "Niedrig",
      recommendation: "In CI vor `test:debt` `bun run test:coverage` ausführen (bereits konfiguriert).",
      recommendedOrder: 99,
      effort: "klein",
      status: "offen",
      firstDetected: now,
      lastChecked: now,
      version: process.env.TECH_DEBT_VERSION ?? "unknown",
      source: "automated",
      automatedRule: "coverage-missing-report",
      priorityTag: "documentation",
    });
    return findings;
  }

  let summary;
  try {
    summary = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return findings;
  }

  for (const [absPath, stats] of Object.entries(summary)) {
    if (absPath === "total") continue;
    const relPath = rel(ROOT, absPath);
    if (!CRITICAL.some((re) => re.test(relPath))) continue;
    const pct = stats?.lines?.pct ?? 100;
    if (pct >= THRESHOLD) continue;

    findings.push({
      id: stableId("coverage", relPath),
      title: `Kritischer Service unter Coverage-Schwelle (${pct.toFixed(0)} %)`,
      category: "Tests",
      location: relPath,
      description: `Line-Coverage ${pct.toFixed(0)} % liegt unter ${THRESHOLD} %.`,
      rootCause: "Modul wurde ohne begleitende Tests erweitert.",
      impact:
        "Regressionen in sicherheits-/geschäftskritischer Logik werden nicht durch die Test-Suite erkannt.",
      severity: pct < 20 ? "High" : "Medium",
      likelihood: "Hoch",
      recommendation:
        "Unit-Tests für Fehlerpfade und Zustandsübergänge ergänzen; positive und negative Fälle abdecken.",
      recommendedOrder: 25,
      effort: "mittel",
      status: "offen",
      firstDetected: now,
      lastChecked: now,
      version: process.env.TECH_DEBT_VERSION ?? "unknown",
      source: "automated",
      automatedRule: "coverage-gap-critical",
      priorityTag: "functional-bug",
    });
  }
  return findings;
}
