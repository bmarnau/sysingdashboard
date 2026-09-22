import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  PERFORMANCE_STATEMENT_BACKUP_VERSION,
  type PerformanceStatementBackupPayload,
} from "@/lib/backup/performance-statement-payload";

type UserSupabaseClient = SupabaseClient<Database>;
type Tables = Database["public"]["Tables"];
type OverrideRow = Tables["customer_activity_billable_override"]["Row"];
type RequestRow = Tables["customer_performance_statement_request"]["Row"];
type StatementRow = Tables["customer_performance_statement"]["Row"];
type ItemRow = Tables["customer_performance_statement_item"]["Row"];
type ClaimRow = Tables["customer_performance_activity_claim"]["Row"];

function backupReadFailed(section: string): never {
  throw new Error(`Leistungsnachweis-Backup: ${section} konnte nicht gelesen werden.`);
}

/**
 * Liest ausschließlich die durch Grants + RLS sichtbaren BSF-03B-Daten des
 * angemeldeten Benutzers. Kein Service-Role-/Admin-Client.
 */
export async function readSupabasePerformanceStatementBackup(
  client: UserSupabaseClient,
): Promise<PerformanceStatementBackupPayload> {
  const [overrideResult, requestResult, statementResult, itemResult, claimResult] =
    await Promise.all([
      client
        .from("customer_activity_billable_override")
        .select("*")
        .order("systemhouse_id", { ascending: true })
        .order("customer_id", { ascending: true })
        .order("activity_source_id", { ascending: true })
        .order("source_revision", { ascending: true }),
      client
        .from("customer_performance_statement_request")
        .select("*")
        .order("requested_at", { ascending: true })
        .order("id", { ascending: true }),
      client
        .from("customer_performance_statement")
        .select("*")
        .order("series_id", { ascending: true })
        .order("version", { ascending: true }),
      client
        .from("customer_performance_statement_item")
        .select("*")
        .order("statement_id", { ascending: true })
        .order("position", { ascending: true }),
      client
        .from("customer_performance_activity_claim")
        .select("*")
        .order("statement_id", { ascending: true })
        .order("activity_source_id", { ascending: true }),
    ]);

  if (overrideResult.error) backupReadFailed("Overrides");
  if (requestResult.error) backupReadFailed("Requests");
  if (statementResult.error) backupReadFailed("Statements");
  if (itemResult.error) backupReadFailed("Items");
  if (claimResult.error) backupReadFailed("Claims");

  const overrides = (overrideResult.data ?? []) as OverrideRow[];
  const requests = (requestResult.data ?? []) as RequestRow[];
  const statements = (statementResult.data ?? []) as StatementRow[];
  const items = (itemResult.data ?? []) as ItemRow[];
  const claims = (claimResult.data ?? []) as ClaimRow[];

  return {
    payloadVersion: PERFORMANCE_STATEMENT_BACKUP_VERSION,
    capturedAt: new Date().toISOString(),
    overrides: overrides.map((row) => ({
      id: row.id,
      systemhouseId: row.systemhouse_id,
      customerId: row.customer_id,
      activitySourceId: row.activity_source_id,
      sourceRevision: row.source_revision,
      sourceHash: row.source_hash,
      sourceBillable: row.source_billable,
      effectiveBillable: row.effective_billable,
      note: row.note,
      changedBy: row.changed_by,
      changedAt: row.changed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    requests: requests.map((row) => ({
      id: row.id,
      systemhouseId: row.systemhouse_id,
      customerId: row.customer_id,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      action: row.action === "replace" ? "replace" : "finalize",
      replacesStatementId: row.replaces_statement_id,
      expectedReviewFingerprint: row.expected_review_fingerprint,
      requestedBy: row.requested_by,
      requestedAt: row.requested_at,
      resultStatementId: row.result_statement_id,
    })),
    statements: statements.map((row) => ({
      id: row.id,
      seriesId: row.series_id,
      version: row.version,
      systemhouseId: row.systemhouse_id,
      customerId: row.customer_id,
      customerNameSnapshot: row.customer_name_snapshot,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      status: row.status === "superseded" ? "superseded" : "finalized",
      finalizedBy: row.finalized_by,
      finalizedAt: row.finalized_at,
      sourceOldestPublishedAt: row.source_oldest_published_at,
      sourceLatestPublishedAt: row.source_latest_published_at,
      reviewFingerprint: row.review_fingerprint,
      snapshotHash: row.snapshot_hash,
      itemCount: row.item_count,
      billableItemCount: row.billable_item_count,
      billableHours: row.billable_hours,
      nonBillableHours: row.non_billable_hours,
      replacesStatementId: row.replaces_statement_id,
      supersededByStatementId: row.superseded_by_statement_id,
      createdAt: row.created_at,
    })),
    items: items.map((row) => ({
      id: row.id,
      statementId: row.statement_id,
      position: row.position,
      activitySourceId: row.activity_source_id,
      sourceRevision: row.source_revision,
      sourceHash: row.source_hash,
      sourcePublishedAt: row.source_published_at,
      sourceEngineerId: row.source_engineer_id,
      activityDate: row.activity_date,
      titleSnapshot: row.title_snapshot,
      durationHours: row.duration_hours,
      sourceBillable: row.source_billable,
      effectiveBillable: row.effective_billable,
      billingStatusSnapshot: row.billing_status_snapshot,
      projectSourceId: row.project_source_id,
      projectNameSnapshot: row.project_name_snapshot,
      workPackageSourceId: row.work_package_source_id,
      workPackageTitleSnapshot: row.work_package_title_snapshot,
      categoryKeySnapshot: row.category_key_snapshot,
      categoryLabelSnapshot: row.category_label_snapshot,
      createdAt: row.created_at,
    })),
    claims: claims.map((row) => ({
      id: row.id,
      systemhouseId: row.systemhouse_id,
      customerId: row.customer_id,
      activitySourceId: row.activity_source_id,
      statementId: row.statement_id,
      claimedAt: row.claimed_at,
    })),
  };
}
