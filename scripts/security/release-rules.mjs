/**
 * Release-Gate-Regeln für die Sicherheits-Suite.
 *
 * Wird von `security-report.mjs` (Bericht + Zusammenfassung) und
 * `security:gate` (CI-Exitcode) gemeinsam gelesen.
 *
 * Prinzip:
 *  - CRITICAL blockt jede Weiterentwicklung ohne Ausnahme.
 *  - HIGH blockiert Auth- und Azure-Produktivierung; im Bericht als
 *    Warnung geführt, in CI ohne Fail — außer via `--strict-high`.
 *  - MEDIUM benötigt dokumentierte Bewertung (`accepted: true` +
 *    Begründung) in `static-findings.json`, sonst zählt es als Warnung.
 *  - LOW ist informativ.
 */

export const SEVERITY_ORDER = ["critical", "high", "medium", "low"];

export const RELEASE_RULES = {
  critical: { blocksRelease: true, blocksPhases: ["all"] },
  high: {
    blocksRelease: false,
    blocksPhases: ["auth-production", "azure-production"],
  },
  medium: { blocksRelease: false, requiresAcceptance: true },
  low: { blocksRelease: false },
};

/** True, wenn das Set der offenen Findings das Release blockiert. */
export function shouldBlockRelease(findings, { strictHigh = false } = {}) {
  for (const f of findings) {
    if (f.accepted) continue;
    if (f.severity === "critical") return true;
    if (strictHigh && f.severity === "high") return true;
  }
  return false;
}

/** Zählt Findings pro Severity, exklusive akzeptierter Einträge. */
export function countBySeverity(findings) {
  const out = { critical: 0, high: 0, medium: 0, low: 0, accepted: 0 };
  for (const f of findings) {
    if (f.accepted) {
      out.accepted += 1;
      continue;
    }
    if (out[f.severity] === undefined) continue;
    out[f.severity] += 1;
  }
  return out;
}
