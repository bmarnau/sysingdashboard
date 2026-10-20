import {
  PROJECT_CONTROLLING_MAX_DAYS,
  type ProjectControllingFilters,
} from "@/lib/project-controlling/project-controlling-contract";

/**
 * Clientseitige Vorprüfung des Zeitraums. Sie spiegelt die Serverregeln
 * (gültiges Datum, Von <= Bis, höchstens PROJECT_CONTROLLING_MAX_DAYS Tage
 * inklusive) und verhindert, dass unvollständige Eingaben, etwa beim Tippen in
 * ein Datumsfeld, überhaupt einen Serveraufruf auslösen. Der Server prüft
 * weiterhin selbst und bleibt maßgeblich.
 */
export interface ProjectControllingFilterErrors {
  from?: string;
  to?: string;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

function toUtcDay(value: string): number | null {
  if (!ISO_DATE_PATTERN.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return Math.floor(timestamp / MS_PER_DAY);
}

export function validateProjectControllingFilters(
  filters: Pick<ProjectControllingFilters, "from" | "to">,
): ProjectControllingFilterErrors {
  const errors: ProjectControllingFilterErrors = {};
  const fromDay = toUtcDay(filters.from);
  const toDay = toUtcDay(filters.to);

  if (fromDay === null) errors.from = "Bitte ein gültiges Von-Datum angeben.";
  if (toDay === null) errors.to = "Bitte ein gültiges Bis-Datum angeben.";

  if (fromDay !== null && toDay !== null) {
    if (fromDay > toDay) {
      errors.to = "Das Bis-Datum darf nicht vor dem Von-Datum liegen.";
    } else if (toDay - fromDay + 1 > PROJECT_CONTROLLING_MAX_DAYS) {
      errors.to = `Der Zeitraum darf höchstens ${PROJECT_CONTROLLING_MAX_DAYS} Tage umfassen.`;
    }
  }

  return errors;
}

export function hasProjectControllingFilterErrors(
  errors: ProjectControllingFilterErrors | undefined,
): boolean {
  return !!errors && (errors.from !== undefined || errors.to !== undefined);
}
