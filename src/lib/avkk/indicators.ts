/**
 * Frühindikator „zugeordnet, aber gefährdet".
 *
 * Bewusst **abgeleitet** statt persistiert — es gibt keine zweite Statusquelle.
 * Regel: Es existiert mindestens eine gültige Verantwortungszuordnung UND die
 * aktuellen Kompetenzbewertungen überschreiten die Schwelle
 * (`missing` >= missingCount ODER `partial` >= partialCount).
 */

import type {
  AvkkCompetence,
  AvkkResponsibility,
  RiskThreshold,
} from "./types";
import { DEFAULT_RISK_THRESHOLD } from "./types";

export interface RiskEvaluation {
  atRisk: boolean;
  reasons: string[];
  missing: number;
  partial: number;
}

export function evaluateRisk(
  responsibilities: readonly AvkkResponsibility[],
  competences: readonly AvkkCompetence[],
  threshold: RiskThreshold = DEFAULT_RISK_THRESHOLD,
): RiskEvaluation {
  const current = competences.filter((c) => c.supersededAt === null);
  const missing = current.filter((c) => c.ratingKey === "missing").length;
  const partial = current.filter((c) => c.ratingKey === "partial").length;
  const assigned = responsibilities.some((r) => r.validTo === null);

  const reasons: string[] = [];
  if (!assigned) {
    return { atRisk: false, reasons: ["Keine gültige Verantwortungszuordnung"], missing, partial };
  }
  if (missing >= threshold.missingCount) {
    reasons.push(`${missing} Kompetenzdimension(en) nicht vorhanden`);
  }
  if (partial >= threshold.partialCount) {
    reasons.push(`${partial} Kompetenzdimension(en) nur teilweise vorhanden`);
  }
  if (current.some((c) => c.supportNeeded)) {
    reasons.push("Unterstützungsbedarf gemeldet");
  }

  const atRisk = missing >= threshold.missingCount || partial >= threshold.partialCount;
  return { atRisk, reasons, missing, partial };
}
