import type { RiskThreshold } from "@/lib/avkk/types";
import type {
  ResponsibilityPersonViewRepository,
  ResponsibilityPersonViewRow,
  ResponsibilityPersonViewSourceRow,
  ResponsibilityPersonViewSubjectType,
} from "@/lib/avkk/responsibility-management.types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isManagedSubjectType(value: string): value is ResponsibilityPersonViewSubjectType {
  return value === "project" || value === "workpackage";
}

function displayName(value: string): string {
  const normalized = value.trim();
  return normalized.length > 0 && !UUID_PATTERN.test(normalized) ? normalized : "Unbenannt";
}

function riskFor(
  row: ResponsibilityPersonViewSourceRow,
  threshold: RiskThreshold,
): Pick<ResponsibilityPersonViewRow, "atRisk" | "riskReasons"> {
  const reasons: string[] = [];

  if (row.missingCount >= threshold.missingCount) {
    reasons.push(`${row.missingCount} Kompetenzdimension(en) nicht vorhanden`);
  }
  if (row.partialCount >= threshold.partialCount) {
    reasons.push(`${row.partialCount} Kompetenzdimension(en) nur teilweise vorhanden`);
  }
  if (row.supportNeeded) {
    reasons.push("Unterstützungsbedarf gemeldet");
  }

  return {
    atRisk:
      row.missingCount >= threshold.missingCount || row.partialCount >= threshold.partialCount,
    riskReasons: reasons,
  };
}

export class ResponsibilityPersonViewService {
  constructor(private readonly repository: ResponsibilityPersonViewRepository) {}

  async listByPerson(personId: string): Promise<ResponsibilityPersonViewRow[]> {
    const [sourceRows, threshold] = await Promise.all([
      this.repository.listByPerson(personId),
      this.repository.readRiskThreshold(),
    ]);

    return sourceRows
      .filter(
        (row) =>
          row.validTo === null &&
          (row.role === "owner" || row.role === "deputy") &&
          isManagedSubjectType(row.subjectType),
      )
      .map((row) => ({
        responsibilityId: row.responsibilityId,
        personId: row.personId,
        displayName: displayName(row.displayName),
        role: row.role,
        subjectType: row.subjectType,
        subjectId: row.subjectId,
        title: row.title,
        systemhouseId: row.systemhouseId,
        customerId: row.customerId,
        customerName: row.customerName,
        status: row.status,
        due: row.due,
        ...riskFor(row, threshold),
        validFrom: row.validFrom,
        validTo: row.validTo,
      }));
  }
}
