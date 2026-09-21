import type { PerformanceStatementReviewRow } from "./performance-statement-contract";

function compareSourceIds(
  left: PerformanceStatementReviewRow,
  right: PerformanceStatementReviewRow,
): number {
  if (left.activitySourceId < right.activitySourceId) return -1;
  if (left.activitySourceId > right.activitySourceId) return 1;
  return 0;
}

function canonicalizeRow(row: PerformanceStatementReviewRow): string {
  return [
    row.activitySourceId,
    String(row.sourceRevision),
    row.sourceHash,
    row.date,
    row.durationHours.toFixed(2),
    row.billingStatus,
    String(row.effectiveBillable),
  ].join("|");
}

export function canonicalizePerformanceReviewRows(
  rows: readonly PerformanceStatementReviewRow[],
): string {
  return [...rows].sort(compareSourceIds).map(canonicalizeRow).join("\n");
}

export async function createPerformanceReviewFingerprint(
  rows: readonly PerformanceStatementReviewRow[],
): Promise<string> {
  const canonicalRows = canonicalizePerformanceReviewRows(rows);
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalRows),
  );

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
