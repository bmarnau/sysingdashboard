/**
 * Detektor: direkte console.*-Nutzung im Produktivcode.
 *
 * Nutzt seit Sprint 05B dieselbe Richtlinie wie der harte CI-Gate
 * (`scripts/console-policy.mjs`), damit Gate und Bericht nie auseinanderlaufen.
 * Dokumentierte Ausnahmen erzeugen ein Info-Finding mit Status `akzeptiert`,
 * unbegründete Aufrufe ein offenes Medium-Finding.
 */
import { rel, read, walk, stableId } from "../util.mjs";
import { classify, CONSOLE_LINE_RE } from "../../console-policy.mjs";


export function detectConsoleUsage(ROOT) {
  const findings = [];
  const now = new Date().toISOString();
  const files = [
    ...walk(`${ROOT}/src`, /\.(ts|tsx)$/),
    ...walk(`${ROOT}/backend/services`, /\.mjs$/),
  ];

  for (const abs of files) {
    const relPath = rel(ROOT, abs);
    const verdict = classify(relPath);
    if (verdict.kind === "logger-internal" || verdict.kind === "non-production") continue;

    const text = read(abs);
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(CONSOLE_LINE_RE);
      if (!match) continue;
      const line = i + 1;
      const m = [null, match[1]];
      const isException = verdict.kind === "exception";
      findings.push({
        id: stableId("console", relPath, line, m[1]),
        title: isException
          ? `Dokumentierte Konsolen-Ausnahme (${verdict.exception.id})`
          : `Direktes console.${m[1]} außerhalb der Logger-Fassade`,
        category: "Frontend",
        location: `${relPath}:${line}`,
        description: isException
          ? `Aufruf: console.${m[1]}(…) — begründete Ausnahme: ${verdict.exception.reason}`
          : `Aufruf: console.${m[1]}(…)`,
        rootCause: isException
          ? "Zentraler Logger an dieser Stelle technisch nicht nutzbar (siehe Begründung)."
          : "Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).",
        impact: isException
          ? "Begrenzt: Ausgaben sind gekürzt und secret-frei; kein zentraler Sink."
          : "Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.",
        severity: isException ? "Informational" : "Medium",
        likelihood: isException ? "Niedrig" : "Mittel",
        recommendation: isException
          ? `Ausnahme bleibt gültig bis ${verdict.exception.review} (${verdict.exception.adr}).`
          : "Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).",
        recommendedOrder: isException ? 90 : 45,
        effort: "klein",
        status: isException ? "akzeptiert" : "offen",
        accepted: isException || undefined,
        acceptanceReason: isException ? verdict.exception.reason : undefined,
        acceptanceExpires: isException ? verdict.exception.review : undefined,
        firstDetected: now,
        lastChecked: now,
        version: process.env.TECH_DEBT_VERSION ?? "unknown",
        source: "automated",
        automatedRule: isException ? "console-documented-exception" : "console-direct",
        priorityTag: "stability",
      });
    }
  }
  return findings;
}
