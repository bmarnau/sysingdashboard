import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  type BillableOverrideInput,
  type FinalizeInput,
  type PerformanceStatementCategoryState,
  type PerformanceStatementRepository,
  type PerformanceStatementReview,
  type PerformanceStatementReviewRow,
  type PerformanceStatementSnapshot,
  type PerformanceStatementSnapshotItem,
  type ReplaceInput,
  type ReviewInput,
  type StatementScope,
} from "@/lib/performance-statement/performance-statement-contract";
import {
  classifyRow,
  summarizePerformanceReviewRows,
  validatePerformancePeriod,
} from "@/lib/performance-statement/performance-statement";
import { createPerformanceReviewFingerprint } from "@/lib/performance-statement/review-fingerprint";

type UserSupabaseClient = SupabaseClient<Database>;
type Tables = Database["public"]["Tables"];
type StatementRow = Tables["customer_performance_statement"]["Row"];
type StatementItemRow = Tables["customer_performance_statement_item"]["Row"];

interface CustomerRow {
  id: string;
  systemhouse_id: string;
  name: string;
  status: string;
}

interface ProjectRow {
  systemhouse_id: string;
  customer_id: string;
  source_id: string;
  name: string;
}

interface WorkPackageRow {
  systemhouse_id: string;
  customer_id: string;
  source_id: string;
  project_source_id: string | null;
  title: string;
  category_key: string | null;
  category_observed: boolean;
}

interface ActivityRow {
  systemhouse_id: string;
  customer_id: string;
  source_id: string;
  source_revision: number;
  source_hash: string;
  published_at: string;
  activity_date: string;
  title: string;
  duration_hours: number;
  billable: boolean;
  billing_status: string;
  work_package_source_id: string | null;
}

interface OverrideRow {
  systemhouse_id: string;
  customer_id: string;
  activity_source_id: string;
  source_revision: number;
  source_hash: string;
  source_billable: boolean;
  effective_billable: boolean;
}

interface ClaimRow {
  systemhouse_id: string;
  customer_id: string;
  activity_source_id: string;
  statement_id: string;
}

interface ReferenceCatalogRow {
  id: string;
}

interface ReferenceValueRow {
  systemhouse_id: string | null;
  key: string;
  label: string;
  is_active: boolean;
  valid_from: string | null;
  valid_to: string | null;
}

interface StatementRequestRow {
  id: string;
  systemhouse_id: string;
  customer_id: string;
  period_start: string;
  period_end: string;
  action: string;
  replaces_statement_id: string | null;
  expected_review_fingerprint: string;
  result_statement_id: string | null;
}

function fail(operation: string): never {
  throw new Error(`Leistungsnachweis: ${operation} fehlgeschlagen.`);
}

function referenceKey(key: string): string {
  return key;
}

function isReferenceActive(row: ReferenceValueRow, nowIso: string): boolean {
  if (!row.is_active) return false;
  if (row.valid_from && row.valid_from > nowIso) return false;
  if (row.valid_to && row.valid_to <= nowIso) return false;
  return true;
}

function categoryState(
  workPackage: WorkPackageRow | undefined,
  reference: ReferenceValueRow | undefined,
  nowIso: string,
): PerformanceStatementCategoryState {
  if (!workPackage || !workPackage.category_observed) return "unobserved";
  if (workPackage.category_key === null) return "none";
  if (!reference) return "unknown";
  return isReferenceActive(reference, nowIso) ? "known" : "inactive";
}

function mapSnapshotItem(row: StatementItemRow): PerformanceStatementSnapshotItem {
  return {
    position: row.position,
    activitySourceId: row.activity_source_id,
    sourceRevision: row.source_revision,
    sourceHash: row.source_hash,
    sourcePublishedAt: row.source_published_at,
    sourceEngineerId: row.source_engineer_id,
    date: row.activity_date,
    title: row.title_snapshot,
    durationHours: row.duration_hours,
    sourceBillable: row.source_billable,
    effectiveBillable: row.effective_billable,
    billingStatus: row.billing_status_snapshot,
    project: {
      sourceId: row.project_source_id,
      name: row.project_name_snapshot,
    },
    workPackage: {
      sourceId: row.work_package_source_id,
      title: row.work_package_title_snapshot,
    },
    category: {
      key: row.category_key_snapshot,
      label: row.category_label_snapshot,
    },
  };
}

function mapSnapshot(
  row: StatementRow,
  items: readonly StatementItemRow[],
): PerformanceStatementSnapshot {
  return {
    id: row.id,
    seriesId: row.series_id,
    version: row.version,
    systemhouseId: row.systemhouse_id,
    customerId: row.customer_id,
    customerName: row.customer_name_snapshot,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status === "superseded" ? "superseded" : "finalized",
    finalizedBy: row.finalized_by,
    finalizedAt: row.finalized_at,
    freshness: {
      oldestPublishedAt: row.source_oldest_published_at,
      latestPublishedAt: row.source_latest_published_at,
    },
    reviewFingerprint: row.review_fingerprint,
    snapshotHash: row.snapshot_hash,
    itemCount: row.item_count,
    billableItemCount: row.billable_item_count,
    billableHours: row.billable_hours,
    nonBillableHours: row.non_billable_hours,
    replacesStatementId: row.replaces_statement_id,
    supersededByStatementId: row.superseded_by_statement_id,
    items: [...items].sort((left, right) => left.position - right.position).map(mapSnapshotItem),
  };
}

async function requestStatement(
  client: UserSupabaseClient,
  input: FinalizeInput | ReplaceInput,
  action: "finalize" | "replace",
): Promise<{ statementId: string }> {
  const replacesStatementId =
    action === "replace" && "replacesStatementId" in input ? input.replacesStatementId : null;
  const payload = {
    id: input.requestId,
    systemhouse_id: input.systemhouseId,
    customer_id: input.customerId,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    action,
    replaces_statement_id: replacesStatementId,
    expected_review_fingerprint: input.expectedReviewFingerprint,
  };

  const inserted = await client
    .from("customer_performance_statement_request")
    .insert(payload)
    .select("result_statement_id")
    .single();

  if (!inserted.error && inserted.data?.result_statement_id) {
    return { statementId: inserted.data.result_statement_id };
  }

  if (inserted.error?.code !== "23505") {
    fail(action === "replace" ? "Ersatz anfordern" : "Finalisierung anfordern");
  }

  const replay = await client
    .from("customer_performance_statement_request")
    .select(
      "id, systemhouse_id, customer_id, period_start, period_end, action, replaces_statement_id, expected_review_fingerprint, result_statement_id",
    )
    .eq("id", input.requestId)
    .maybeSingle();

  if (replay.error || !replay.data) fail("Idempotenz-Request lesen");

  const existing = replay.data as StatementRequestRow;
  if (
    existing.systemhouse_id !== input.systemhouseId ||
    existing.customer_id !== input.customerId ||
    existing.period_start !== input.periodStart ||
    existing.period_end !== input.periodEnd ||
    existing.action !== action ||
    existing.replaces_statement_id !== replacesStatementId ||
    existing.expected_review_fingerprint !== input.expectedReviewFingerprint ||
    !existing.result_statement_id
  ) {
    fail("Idempotenz-Request auflösen");
  }

  return { statementId: existing.result_statement_id };
}

export function createSupabasePerformanceStatementRepository(
  client: UserSupabaseClient,
): PerformanceStatementRepository {
  return {
    async getReview(input: ReviewInput): Promise<PerformanceStatementReview> {
      validatePerformancePeriod(input.periodStart, input.periodEnd);

      const [
        customerResult,
        activityResult,
        projectResult,
        workPackageResult,
        overrideResult,
        claimResult,
        catalogResult,
      ] = await Promise.all([
        client
          .from("customer")
          .select("id, systemhouse_id, name, status")
          .eq("id", input.customerId)
          .eq("systemhouse_id", input.systemhouseId)
          .eq("status", "active")
          .maybeSingle(),
        client
          .from("shared_activity_projection")
          .select(
            "systemhouse_id, customer_id, source_id, source_revision, source_hash, published_at, activity_date, title, duration_hours, billable, billing_status, work_package_source_id",
          )
          .eq("systemhouse_id", input.systemhouseId)
          .eq("customer_id", input.customerId)
          .eq("is_active", true)
          .gte("activity_date", input.periodStart)
          .lte("activity_date", input.periodEnd)
          .order("activity_date", { ascending: true })
          .order("source_id", { ascending: true }),
        client
          .from("shared_project_projection")
          .select("systemhouse_id, customer_id, source_id, name")
          .eq("systemhouse_id", input.systemhouseId)
          .eq("customer_id", input.customerId)
          .eq("is_active", true),
        client
          .from("shared_work_package_projection")
          .select(
            "systemhouse_id, customer_id, source_id, project_source_id, title, category_key, category_observed",
          )
          .eq("systemhouse_id", input.systemhouseId)
          .eq("customer_id", input.customerId)
          .eq("is_active", true),
        client
          .from("customer_activity_billable_override")
          .select(
            "systemhouse_id, customer_id, activity_source_id, source_revision, source_hash, source_billable, effective_billable",
          )
          .eq("systemhouse_id", input.systemhouseId)
          .eq("customer_id", input.customerId),
        client
          .from("customer_performance_activity_claim")
          .select("systemhouse_id, customer_id, activity_source_id, statement_id")
          .eq("systemhouse_id", input.systemhouseId)
          .eq("customer_id", input.customerId),
        client
          .from("reference_catalog")
          .select("id")
          .eq("key", "workpackage.category")
          .eq("scope_type", "systemhouse")
          .limit(1)
          .maybeSingle(),
      ]);

      if (customerResult.error || !customerResult.data) fail("Kunde lesen");
      if (activityResult.error) fail("Tätigkeiten lesen");
      if (projectResult.error) fail("Projekte lesen");
      if (workPackageResult.error) fail("Arbeitspakete lesen");
      if (overrideResult.error) fail("Billing-Overrides lesen");
      if (claimResult.error) fail("Claims lesen");
      if (catalogResult.error) fail("AP-Kategoriekatalog lesen");

      const customer = customerResult.data as CustomerRow;
      const activities = (activityResult.data ?? []) as ActivityRow[];
      const projects = (projectResult.data ?? []) as ProjectRow[];
      const workPackages = (workPackageResult.data ?? []) as WorkPackageRow[];
      const overrides = (overrideResult.data ?? []) as OverrideRow[];
      const claims = (claimResult.data ?? []) as ClaimRow[];
      const catalog = catalogResult.data as ReferenceCatalogRow | null;

      let references: ReferenceValueRow[] = [];
      if (catalog) {
        const referenceResult = await client
          .from("reference_value")
          .select("systemhouse_id, key, label, is_active, valid_from, valid_to")
          .eq("catalog_id", catalog.id)
          .eq("systemhouse_id", input.systemhouseId);
        if (referenceResult.error) fail("AP-Kategorien lesen");
        references = (referenceResult.data ?? []) as ReferenceValueRow[];
      }

      const projectBySource = new Map(projects.map((row) => [row.source_id, row]));
      const workPackageBySource = new Map(workPackages.map((row) => [row.source_id, row]));
      const referenceByKey = new Map(references.map((row) => [referenceKey(row.key), row]));
      const claimByActivity = new Map(claims.map((row) => [row.activity_source_id, row]));
      const overridesByActivity = new Map<string, OverrideRow[]>();
      for (const override of overrides) {
        const existing = overridesByActivity.get(override.activity_source_id) ?? [];
        existing.push(override);
        overridesByActivity.set(override.activity_source_id, existing);
      }

      const nowIso = new Date().toISOString();
      const rows: PerformanceStatementReviewRow[] = activities.map((activity) => {
        const activityOverrides = overridesByActivity.get(activity.source_id) ?? [];
        const exactOverride = activityOverrides.find(
          (override) =>
            override.source_revision === activity.source_revision &&
            override.source_hash === activity.source_hash &&
            override.source_billable === activity.billable,
        );
        const claimed = claimByActivity.has(activity.source_id);
        const workPackage = activity.work_package_source_id
          ? workPackageBySource.get(activity.work_package_source_id)
          : undefined;
        const project = workPackage?.project_source_id
          ? projectBySource.get(workPackage.project_source_id)
          : undefined;
        const reference =
          workPackage?.category_observed && workPackage.category_key
            ? referenceByKey.get(referenceKey(workPackage.category_key))
            : undefined;

        return {
          activitySourceId: activity.source_id,
          sourceRevision: activity.source_revision,
          sourceHash: activity.source_hash,
          sourcePublishedAt: activity.published_at,
          date: activity.activity_date,
          title: activity.title,
          durationHours: activity.duration_hours,
          sourceBillable: activity.billable,
          effectiveBillable: exactOverride?.effective_billable ?? activity.billable,
          billingStatus: activity.billing_status,
          reviewState: classifyRow({
            billingStatus: activity.billing_status,
            claimed,
          }),
          hasStaleOverride: !exactOverride && activityOverrides.length > 0,
          project: {
            sourceId: project?.source_id ?? null,
            name: project?.name ?? null,
          },
          workPackage: {
            sourceId: workPackage?.source_id ?? null,
            title: workPackage?.title ?? null,
          },
          category: {
            key: workPackage?.category_observed ? (workPackage.category_key ?? null) : null,
            label: reference?.label ?? null,
            state: categoryState(workPackage, reference, nowIso),
          },
        };
      });

      const reviewableRows = rows.filter((row) => row.reviewState === "reviewable");
      const publishedAt = reviewableRows
        .map((row) => row.sourcePublishedAt)
        .filter((value): value is string => Boolean(value))
        .sort();

      return {
        systemhouseId: input.systemhouseId,
        customerId: input.customerId,
        customerName: customer.name,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        rows,
        reviewFingerprint: await createPerformanceReviewFingerprint(reviewableRows),
        freshness: {
          oldestPublishedAt: publishedAt[0] ?? null,
          latestPublishedAt: publishedAt[publishedAt.length - 1] ?? null,
        },
        summary: summarizePerformanceReviewRows(rows),
      };
    },

    async setBillableOverride(input: BillableOverrideInput): Promise<void> {
      const { error } = await client.from("customer_activity_billable_override").upsert(
        {
          systemhouse_id: input.systemhouseId,
          customer_id: input.customerId,
          activity_source_id: input.activitySourceId,
          source_revision: input.sourceRevision,
          source_hash: input.sourceHash,
          source_billable: input.sourceBillable,
          effective_billable: input.effectiveBillable,
          note: input.note ?? "",
        },
        {
          onConflict: "systemhouse_id,customer_id,activity_source_id,source_revision",
        },
      );

      if (error) fail("Billing-Override speichern");
    },

    async finalize(input: FinalizeInput): Promise<{ statementId: string }> {
      validatePerformancePeriod(input.periodStart, input.periodEnd);
      return requestStatement(client, input, "finalize");
    },

    async replace(input: ReplaceInput): Promise<{ statementId: string }> {
      validatePerformancePeriod(input.periodStart, input.periodEnd);
      return requestStatement(client, input, "replace");
    },

    async getStatement(statementId: string): Promise<PerformanceStatementSnapshot | null> {
      const statementResult = await client
        .from("customer_performance_statement")
        .select("*")
        .eq("id", statementId)
        .maybeSingle();

      if (statementResult.error) fail("Leistungsnachweis lesen");
      if (!statementResult.data) return null;

      const itemResult = await client
        .from("customer_performance_statement_item")
        .select("*")
        .eq("statement_id", statementId)
        .order("position", { ascending: true });

      if (itemResult.error) fail("Leistungsnachweispositionen lesen");

      return mapSnapshot(
        statementResult.data as StatementRow,
        (itemResult.data ?? []) as StatementItemRow[],
      );
    },

    async listStatements(scope: StatementScope): Promise<PerformanceStatementSnapshot[]> {
      let statementQuery = client
        .from("customer_performance_statement")
        .select("*")
        .eq("systemhouse_id", scope.systemhouseId);

      if (scope.customerId) statementQuery = statementQuery.eq("customer_id", scope.customerId);
      if (scope.periodStart) statementQuery = statementQuery.gte("period_start", scope.periodStart);
      if (scope.periodEnd) statementQuery = statementQuery.lte("period_end", scope.periodEnd);

      const statementResult = await statementQuery
        .order("period_start", { ascending: false })
        .order("version", { ascending: false });
      if (statementResult.error) fail("Leistungsnachweishistorie lesen");

      const statements = (statementResult.data ?? []) as StatementRow[];
      if (statements.length === 0) return [];

      const statementIds = statements.map((row) => row.id);
      const itemResult = await client
        .from("customer_performance_statement_item")
        .select("*")
        .in("statement_id", statementIds)
        .order("position", { ascending: true });
      if (itemResult.error) fail("Leistungsnachweispositionen lesen");

      const itemsByStatement = new Map<string, StatementItemRow[]>();
      for (const item of (itemResult.data ?? []) as StatementItemRow[]) {
        const items = itemsByStatement.get(item.statement_id) ?? [];
        items.push(item);
        itemsByStatement.set(item.statement_id, items);
      }

      return statements.map((statement) =>
        mapSnapshot(statement, itemsByStatement.get(statement.id) ?? []),
      );
    },
  };
}
