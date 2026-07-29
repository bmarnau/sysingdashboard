/**
 * Freigabestufen-Vorschlag für den technischen Prüfbericht 2.0.
 *
 * Die Vorschlagsregel ist deterministisch aus dem aggregierten Report
 * ableitbar. Manuelle Abweichungen werden über override.mjs gesetzt und
 * überschreiben `effective`, ohne `proposed` zu verändern.
 */

export const STAGES = ["development", "internal-test", "pilot", "production"];

/**
 * @param {{ findings: Array<{severity:string, accepted?:boolean, gateRelevant?:boolean, area?:string, id?:string, status?:string}>,
 *           sections?: Record<string, {status?:string, evidence?: string|null}>,
 *           sources?: Record<string, {status?:string}>,
 *           blockers?: Array<unknown> }} report
 */
export function proposeReleaseStage(report) {
  const findings = report.findings ?? [];
  const sources = report.sources ?? report.summary?.sources ?? {};
  const sections = report.sections ?? {};
  const blockers = report.blockers ?? [];

  const openCritical = findings.filter((f) => f.severity === "CRITICAL" && !f.accepted).length;
  const openHigh = findings.filter((f) => f.severity === "HIGH" && !f.accepted).length;
  const openGate = findings.filter((f) => f.gateRelevant && !f.accepted).length;

  const authOk =
    (sections.auth?.status ?? "unknown") === "passed" ||
    (sources.security?.status === "passed" || sources.security?.status === "passed-with-findings");
  const rlsOk =
    (sections.rls?.status ?? "unknown") === "passed" ||
    !findings.some(
      (f) => !f.accepted && f.severity === "CRITICAL" && /rls|policy/i.test(f.area ?? ""),
    );
  const restoreOk =
    (sections.operations?.evidence ?? "").includes("restore") ||
    (sources.backup?.status === "passed");
  const docsOk = sources.docs?.status === "passed" || (sections.docs?.status ?? "") === "passed";

  if (openCritical > 0 || blockers.length > 0) {
    return {
      proposed: "development",
      reason: `${openCritical} offene Critical / ${blockers.length} Gate-Blocker.`,
    };
  }
  if (!authOk) {
    return { proposed: "development", reason: "Authentifizierung nicht als bestanden nachgewiesen." };
  }
  if (openGate > 0) {
    return { proposed: "internal-test", reason: `${openGate} offene gate-relevante Findings.` };
  }
  if (openHigh > 0) {
    return { proposed: "internal-test", reason: `${openHigh} offene HIGH-Findings.` };
  }
  if (!rlsOk) {
    return { proposed: "internal-test", reason: "RLS-Nachweis fehlt oder unvollständig." };
  }
  if (!restoreOk || !docsOk) {
    return {
      proposed: "pilot",
      reason: !restoreOk
        ? "Restore-Nachweis fehlt für Produktion."
        : "Pflichtdokumentation unvollständig.",
    };
  }
  return { proposed: "production", reason: "Alle Pflichtnachweise grün, keine Blocker offen." };
}

/**
 * Wendet manuelle Overrides an. `override.stage` muss in STAGES enthalten sein.
 */
export function applyReleaseOverride(proposal, override) {
  if (!override || !override.stage) {
    return { ...proposal, effective: proposal.proposed };
  }
  if (!STAGES.includes(override.stage)) {
    throw new Error(`Ungültige Freigabestufe: ${override.stage}`);
  }
  return {
    ...proposal,
    effective: override.stage,
    overridden: {
      by: override.by ?? "unknown",
      at: override.at ?? new Date().toISOString(),
      reason: override.reason ?? "",
      ticket: override.ticket ?? null,
    },
  };
}
