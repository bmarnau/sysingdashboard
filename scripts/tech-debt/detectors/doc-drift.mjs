/**
 * Detektor: Dokumentations-Drift.
 *
 * Prüft Handbuch-Topics auf veraltete `lastUpdated`-Marken (> 180 Tage
 * bezogen auf `TECH_DEBT_REFERENCE_DATE` bzw. `now`).
 */
import { rel, read, stableId } from "../util.mjs";

const LAST_RE = /lastUpdated:\s*"(\d{4}-\d{2}-\d{2})"/g;
const ID_RE = /id:\s*"([^"]+)"/g;
const STALE_DAYS = 180;

export function detectDocDrift(ROOT) {
  const findings = [];
  const now = new Date().toISOString();
  const refDate = process.env.TECH_DEBT_REFERENCE_DATE
    ? new Date(process.env.TECH_DEBT_REFERENCE_DATE)
    : new Date();
  const file = `${ROOT}/src/lib/help-documentation.ts`;
  const text = read(file);
  if (!text) return findings;

  // Naive Zuordnung: die vorangehende id: gehört zum nächsten lastUpdated.
  const ids = [];
  let m;
  while ((m = ID_RE.exec(text)) !== null) ids.push({ id: m[1], offset: m.index });

  while ((m = LAST_RE.exec(text)) !== null) {
    const iso = m[1];
    const age = (refDate.getTime() - new Date(iso).getTime()) / 86_400_000;
    if (age < STALE_DAYS) continue;
    const before = ids.filter((x) => x.offset < m.index).pop();
    const topicId = before?.id ?? "unknown";
    findings.push({
      id: stableId("docdrift", topicId),
      title: `Handbuch-Kapitel „${topicId}" seit ${Math.round(age)} Tagen unverändert`,
      category: "Dokumentation",
      location: `${rel(ROOT, file)} (Topic: ${topicId})`,
      description: `\`lastUpdated: ${iso}\` liegt über ${STALE_DAYS} Tagen zurück.`,
      rootCause: "Kapitel wurde bei Feature-Änderungen nicht mitgepflegt.",
      impact:
        "Nutzerhandbuch beschreibt möglicherweise veralteten Zustand; Onboarding und Support leiden.",
      severity: "Low",
      likelihood: "Mittel",
      recommendation:
        "Inhalt gegen aktuellen Stand prüfen, ggf. aktualisieren und `lastUpdated` neu setzen.",
      recommendedOrder: 95,
      effort: "klein",
      status: "offen",
      firstDetected: now,
      lastChecked: now,
      version: process.env.TECH_DEBT_VERSION ?? "unknown",
      source: "automated",
      automatedRule: "doc-stale",
      priorityTag: "documentation",
    });
  }
  return findings;
}
