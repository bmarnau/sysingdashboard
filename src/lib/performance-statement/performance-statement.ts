import {
  PERFORMANCE_STATEMENT_MAX_DAYS,
  type PerformanceReviewState,
  type PerformanceStatementReviewRow,
  type PerformanceStatementReviewSummary,
} from "./performance-statement-contract";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MILLISECONDS_PER_DAY = 86_400_000;

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

  return timestamp / MILLISECONDS_PER_DAY;
}

export function validatePerformancePeriod(periodStart: string, periodEnd: string): void {
  const startDay = toUtcDay(periodStart);
  const endDay = toUtcDay(periodEnd);

  if (startDay === null || endDay === null || startDay > endDay) {
    throw new Error("PERFORMANCE_STATEMENT_INVALID_DATE_RANGE");
  }

  if (endDay - startDay + 1 > PERFORMANCE_STATEMENT_MAX_DAYS) {
    throw new Error("PERFORMANCE_STATEMENT_RANGE_TOO_LARGE");
  }
}

export function classifyRow(input: {
  billingStatus: string;
  claimed: boolean;
}): PerformanceReviewState {
  if (input.claimed) return "claimed_by_statement";
  if (input.billingStatus === "abgerechnet") return "legacy_finalized";
  return "reviewable";
}

export function summarizePerformanceReviewRows(
  rows: readonly PerformanceStatementReviewRow[],
): PerformanceStatementReviewSummary {
  let billableHourHundredths = 0;
  let nonBillableHourHundredths = 0;
  let reviewableCount = 0;

  for (const row of rows) {
    if (row.reviewState !== "reviewable") continue;

    reviewableCount += 1;
    const durationHourHundredths = Math.round(row.durationHours * 100);

    if (row.effectiveBillable) {
      billableHourHundredths += durationHourHundredths;
    } else {
      nonBillableHourHundredths += durationHourHundredths;
    }
  }

  return {
    billableHours: billableHourHundredths / 100,
    nonBillableHours: nonBillableHourHundredths / 100,
    reviewableCount,
  };
}
