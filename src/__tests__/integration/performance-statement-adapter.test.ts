import type { SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {\n  createSupabasePerformanceStatementRepository,\n} from "@/integrations/supabase/performance-statement-adapter";
import type { Database } from "@/integrations/supabase/types";
import { createPerformanceReviewFingerprint } from "@/lib/performance-statement/review-fingerprint";

type FakeRow = Record<string, unknown>;
type FakeTableData = Record<string, FakeRow[]>;

interface QueryCall {
  table: string;
  method: string;
  args: unknown[];
}

class FakeQuery {
  private readonly predicates: Array<(row: FakeRow) => boolean> = [];
  private mutationResult: FakeRow[] | null = null;
  private rowLimit: number | null = null;

  constructor(
    private readonly table: string,
    private readonly sourceRows: FakeRow[],
    private readonly calls: QueryCall[],
    private readonly mutationRows: FakeTableData,
  ) {}

  private record(method: string, args: unknown[]): this {
    this.calls.push({ table: this.table, method, args });
    return this;
  }

  select(columns = "*"): this {
    return this.record("select", [columns]);
  }

  eq(column: string, value: unknown): this {
    this.predicates.push((row) => row[column] === value);
    return this.record("eq", [column, value]);
  }

  gte(column: string, value: string): this {
    this.predicates.push((row) => String(row[column] ?? "") >= value);
    return this.record("gte", [column, value]);
  }

  lte(column: string, value: string): this {
    this.predicates.push((row) => String(row[column] ?? "") <= value);
    return this.record("lte", [column, value]);
  }

  in(column: string, values: readonly unknown[]): this {
    this.predicates.push((row) => values.includes(row[column]));
    return this.record("in", [column, values]);
  }

  order(column: string, options?: unknown): this {
    return this.record("order", [column, options]);
  }

  limit(value: number): this {
    this.rowLimit = value;
    return this.record("limit", [value]);
  }

  insert(value: FakeRow): this {
    this.mutationResult = (this.mutationRows[this.table] ?? []).map((row) => ({ ...row }));
    return this.record("insert", [value]);
  }

  upsert(value: FakeRow, options?: unknown): this {
    this.mutationResult = (this.mutationRows[this.table] ?? []).map((row) => ({ ...row }));
    return this.record("upsert", [value, options]);
  }

  async maybeSingle() {
    return { data: this.materialize()[0] ?? null, error: null };
  }

  async single() {
    return { data: this.materialize()[0] ?? null, error: null };
  }

  private materialize(): FakeRow[] {
    let rows = this.mutationResult ?? this.sourceRows;
    rows = rows.filter((row) => this.predicates.every((predicate) => predicate(row)));
    if (this.rowLimit !== null) rows = rows.slice(0, this.rowLimit);
    return rows.map((row) => ({ ...row }));
  }

  then<TResult1 = { data: FakeRow[]; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: FakeRow[]; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({ data: this.materialize(), error: null }).then(onfulfilled, onrejected);
  }
}

function createFakeClient(
  data: FakeTableData,
  mutationRows: FakeTableData = {},
): { client: SupabaseClient<Database>; calls: QueryCall[] } {
  const calls: QueryCall[] = [];
  const client = {
    from(table: string) {
      return new FakeQuery(table, data[table] ?? [], calls, mutationRows);
    },
  } as unknown as SupabaseClient<Database>;

  return { client, calls };
}

function baseData(): FakeTableData {
  return {
    customer: [
      {
        id: "customer-1",
        systemhouse_id: "sh-1",
        name: "Kunde Eins",
        status: "active",
      },
    ],
    shared_project_projection: [
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "project-1",
        name: "Projekt Eins",
        is_active: true,
      },
    ],
    shared_work_package_projection: [
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "wp-1",
        project_source_id: "project-1",
        title: "Arbeitspaket Eins",
        category_key: "regelbetrieb",
        category_observed: true,
        is_active: true,
      },
    ],
    shared_activity_projection: [
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "activity-exact",
        source_revision: 2,
        source_hash: "hash-exact-2",
        published_at: "2026-09-02T09:00:00.000Z",
        activity_date: "2026-09-02",
        title: "Exact Override",
        duration_hours: 2,
        billable: true,
        billing_status: "offen",
        work_package_source_id: "wp-1",
        is_active: true,
      },
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "activity-stale",
        source_revision: 2,
        source_hash: "hash-stale-2",
        published_at: "2026-09-03T09:00:00.000Z",
        activity_date: "2026-09-03",
        title: "Stale Override",
        duration_hours: 1,
        billable: true,
        billing_status: "offen",
        work_package_source_id: "wp-1",
        is_active: true,
      },
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "activity-legacy",
        source_revision: 1,
        source_hash: "hash-legacy-1",
        published_at: "2026-09-04T09:00:00.000Z",
        activity_date: "2026-09-04",
        title: "Legacy",
        duration_hours: 3,
        billable: true,
        billing_status: "abgerechnet",
        work_package_source_id: "wp-1",
        is_active: true,
      },
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "activity-claimed",
        source_revision: 1,
        source_hash: "hash-claimed-1",
        published_at: "2026-09-05T09:00:00.000Z",
        activity_date: "2026-09-05",
        title: "Claimed",
        duration_hours: 4,
        billable: false,
        billing_status: "offen",
        work_package_source_id: "wp-1",
        is_active: true,
      },
    ],
    customer_activity_billable_override: [
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        activity_source_id: "activity-exact",
        source_revision: 2,
        source_hash: "hash-exact-2",
        source_billable: true,
        effective_billable: false,
      },
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        activity_source_id: "activity-stale",
        source_revision: 1,
        source_hash: "hash-stale-1",
        source_billable: true,
        effective_billable: false,
      },
    ],
    customer_performance_activity_claim: [
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        activity_source_id: "activity-claimed",
        statement_id: "statement-1",
      },
    ],
    reference_catalog: [
      {
        id: "catalog-1",
        key: "workpackage.category",
        scope_type: "systemhouse",
      },
    ],
    reference_value: [
      {
        catalog_id: "catalog-1",
        systemhouse_id: "sh-1",
        key: "regelbetrieb",
        label: "Regelbetrieb",
        is_active: true,
        valid_from: null,
        valid_to: null,
      },
    ],
  };
}

const reviewInput = {
  systemhouseId: "sh-1",
  customerId: "customer-1",
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
};

function callsFor(calls: QueryCall[], table: string, method?: string): QueryCall[] {
  return calls.filter((call) => call.table === table && (!method || call.method === method));
}

describe("BSF-03B Supabase performance statement adapter", () => {
  it("builds the review from source rows, exact/stale overrides and claims", async () => {
    const { client } = createFakeClient(baseData());
    const repository = createSupabasePerformanceStatementRepository(client);

    const review = await repository.getReview(reviewInput);
    const byId = new Map(review.rows.map((row) => [row.activitySourceId, row]));

    expect(review.customerName).toBe("Kunde Eins");
    expect(review.rows).toHaveLength(4);
    expect(byId.get("activity-exact")).toMatchObject({
      reviewState: "reviewable",
      sourceBillable: true,
      effectiveBillable: false,
      hasStaleOverride: false,
      project: { sourceId: "project-1", name: "Projekt Eins" },
      workPackage: { sourceId: "wp-1", title: "Arbeitspaket Eins" },
      category: { key: "regelbetrieb", label: "Regelbetrieb", state: "known" },
    });
    expect(byId.get("activity-stale")).toMatchObject({
      reviewState: "reviewable",
      sourceBillable: true,
      effectiveBillable: true,
      hasStaleOverride: true,
    });
    expect(byId.get("activity-legacy")?.reviewState).toBe("legacy_finalized");
    expect(byId.get("activity-claimed")?.reviewState).toBe("claimed_by_statement");

    expect(review.summary).toEqual({
      billableHours: 1,
      nonBillableHours: 2,
      reviewableCount: 2,
    });
    expect(review.freshness).toEqual({
      oldestPublishedAt: "2026-09-02T09:00:00.000Z",
      latestPublishedAt: "2026-09-03T09:00:00.000Z",
    });

    const expectedFingerprint = await createPerformanceReviewFingerprint(
      review.rows.filter((row) => row.reviewState === "reviewable"),
    );
    expect(review.reviewFingerprint).toBe(expectedFingerprint);
  });

  it("writes billable decisions only to the revisions-bound override table", async () => {
    const { client, calls } = createFakeClient(baseData());
    const repository = createSupabasePerformanceStatementRepository(client);

    await repository.setBillableOverride({
      systemhouseId: "sh-1",
      customerId: "customer-1",
      activitySourceId: "activity-exact",
      sourceRevision: 2,
      sourceHash: "hash-exact-2",
      sourceBillable: true,
      effectiveBillable: false,
      note: "Teamlead review",
    });

    expect(callsFor(calls, "customer_activity_billable_override", "upsert")).toHaveLength(1);
    expect(callsFor(calls, "shared_activity_projection", "insert")).toHaveLength(0);
    expect(callsFor(calls, "shared_activity_projection", "upsert")).toHaveLength(0);
  });

  it("finalizes only through the request table and returns the trigger result", async () => {
    const { client, calls } = createFakeClient(baseData(), {
      customer_performance_statement_request: [{ result_statement_id: "statement-final" }],
    });
    const repository = createSupabasePerformanceStatementRepository(client);

    const result = await repository.finalize({
      requestId: "request-1",
      ...reviewInput,
      expectedReviewFingerprint: "a".repeat(64),
    });

    expect(result).toEqual({ statementId: "statement-final" });
    const requestInsert = callsFor(calls, "customer_performance_statement_request", "insert")[0];
    expect(requestInsert).toBeTruthy();
    expect(requestInsert?.args[0]).toMatchObject({
      id: "request-1",
      systemhouse_id: "sh-1",
      customer_id: "customer-1",
      action: "finalize",
      replaces_statement_id: null,
      expected_review_fingerprint: "a".repeat(64),
    });

    for (const table of [
      "customer_performance_statement",
      "customer_performance_statement_item",
      "customer_performance_activity_claim",
    ]) {
      expect(callsFor(calls, table, "insert")).toHaveLength(0);
      expect(callsFor(calls, table, "upsert")).toHaveLength(0);
    }
  });

  it("contains no admin or service-role client path", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/integrations/supabase/performance-statement-adapter.ts"),
      "utf8",
    );

    expect(source).not.toContain("client.server");
    expect(source).not.toContain("supabaseAdmin");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE");
    expect(source).not.toContain("service_role");
  });
});
