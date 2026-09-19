import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createSupabaseProjectControllingRepository } from "@/integrations/supabase/project-controlling-adapter";
import type { Database } from "@/integrations/supabase/types";
import type { ProjectControllingFilters } from "@/lib/project-controlling/project-controlling-contract";

type FakeRow = Record<string, unknown>;
type FakeTableData = Record<string, FakeRow[]>;

interface QueryCall {
  table: string;
  method: string;
  args: unknown[];
}

interface ArrayResponse {
  data: FakeRow[] | null;
  error: null;
}

class FakeQuery implements PromiseLike<ArrayResponse> {
  private predicates: Array<(row: FakeRow) => boolean> = [];
  private orders: Array<{ column: string; ascending: boolean }> = [];
  private rangeWindow: { from: number; to: number } | null = null;
  private rowLimit: number | null = null;

  constructor(
    private readonly table: string,
    private readonly sourceRows: readonly FakeRow[],
    private readonly calls: QueryCall[],
  ) {}

  private record(method: string, args: unknown[]): this {
    this.calls.push({ table: this.table, method, args });
    return this;
  }

  select(...args: unknown[]): this {
    return this.record("select", args);
  }

  eq(column: string, value: unknown): this {
    this.predicates.push((row) => row[column] === value);
    return this.record("eq", [column, value]);
  }

  is(column: string, value: unknown): this {
    this.predicates.push((row) => row[column] === value);
    return this.record("is", [column, value]);
  }

  gte(column: string, value: string | number): this {
    this.predicates.push((row) => {
      const actual = row[column];
      return (typeof actual === "string" || typeof actual === "number") && actual >= value;
    });
    return this.record("gte", [column, value]);
  }

  gt(column: string, value: string | number): this {
    this.predicates.push((row) => {
      const actual = row[column];
      return (typeof actual === "string" || typeof actual === "number") && actual > value;
    });
    return this.record("gt", [column, value]);
  }

  lte(column: string, value: string | number): this {
    this.predicates.push((row) => {
      const actual = row[column];
      return (typeof actual === "string" || typeof actual === "number") && actual <= value;
    });
    return this.record("lte", [column, value]);
  }

  in(column: string, values: readonly unknown[]): this {
    this.predicates.push((row) => values.includes(row[column]));
    return this.record("in", [column, [...values]]);
  }

  or(expression: string): this {
    // The production adapter uses PostgREST OR expressions for temporal access
    // validity. Fixtures in these tests use open-ended validity, so recording
    // the expression is sufficient while keeping this fake intentionally small.
    return this.record("or", [expression]);
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this.record("order", [column, options]);
  }

  range(from: number, to: number): this {
    this.rangeWindow = { from, to };
    return this.record("range", [from, to]);
  }

  limit(count: number): this {
    this.rowLimit = count;
    return this.record("limit", [count]);
  }

  async maybeSingle(): Promise<{ data: FakeRow | null; error: null }> {
    this.record("maybeSingle", []);
    return { data: this.materialize()[0] ?? null, error: null };
  }

  private materialize(): FakeRow[] {
    let rows = this.sourceRows.filter((row) =>
      this.predicates.every((predicate) => predicate(row)),
    );

    if (this.orders.length > 0) {
      rows = [...rows].sort((left, right) => {
        for (const order of this.orders) {
          const leftValue = left[order.column];
          const rightValue = right[order.column];
          if (leftValue === rightValue) continue;
          const comparison = String(leftValue ?? "").localeCompare(String(rightValue ?? ""));
          return order.ascending ? comparison : -comparison;
        }
        return 0;
      });
    }

    if (this.rangeWindow) {
      rows = rows.slice(this.rangeWindow.from, this.rangeWindow.to + 1);
    } else if (this.rowLimit !== null) {
      rows = rows.slice(0, this.rowLimit);
    }

    return rows.map((row) => ({ ...row }));
  }

  then<TResult1 = ArrayResponse, TResult2 = never>(
    onfulfilled?: ((value: ArrayResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({ data: this.materialize(), error: null }).then(onfulfilled, onrejected);
  }
}

function createFakeClient(data: FakeTableData): {
  client: SupabaseClient<Database>;
  calls: QueryCall[];
} {
  const calls: QueryCall[] = [];
  const client = {
    from(table: string) {
      return new FakeQuery(table, data[table] ?? [], calls);
    },
  } as unknown as SupabaseClient<Database>;

  return { client, calls };
}

const BASE_FILTERS: ProjectControllingFilters = {
  from: "2026-09-01",
  to: "2026-09-30",
  billable: "all",
};

function baseData(): FakeTableData {
  return {
    customer_access: [
      {
        user_id: "user-1",
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        access_level: "read",
        status: "active",
        valid_from: null,
        valid_to: null,
      },
    ],
    systemhouse: [
      { id: "sh-1", name: "Systemhaus Eins", status: "active" },
      { id: "sh-rogue", name: "Fremdes Systemhaus", status: "active" },
    ],
    customer: [
      { id: "customer-1", systemhouse_id: "sh-1", name: "Kunde Eins", status: "active" },
      {
        id: "customer-rogue",
        systemhouse_id: "sh-rogue",
        name: "Fremder Kunde",
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
      {
        systemhouse_id: "sh-rogue",
        customer_id: "customer-rogue",
        source_id: "project-rogue",
        name: "Fremdes Projekt",
        is_active: true,
      },
    ],
    shared_work_package_projection: [
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "wp-known",
        project_source_id: "project-1",
        title: "Bekannt",
        category_key: "cat-known",
        category_observed: true,
        is_active: true,
      },
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "wp-inactive",
        project_source_id: "project-1",
        title: "Inaktiv",
        category_key: "cat-old",
        category_observed: true,
        is_active: true,
      },
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "wp-unknown",
        project_source_id: "project-1",
        title: "Unbekannt",
        category_key: "cat-missing",
        category_observed: true,
        is_active: true,
      },
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "wp-none",
        project_source_id: "project-1",
        title: "Ohne Kategorie",
        category_key: null,
        category_observed: true,
        is_active: true,
      },
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "wp-unobserved",
        project_source_id: "project-1",
        title: "Legacy",
        category_key: null,
        category_observed: false,
        is_active: true,
      },
      {
        systemhouse_id: "sh-rogue",
        customer_id: "customer-rogue",
        source_id: "wp-rogue",
        project_source_id: "project-rogue",
        title: "Fremdes Arbeitspaket",
        category_key: "cat-known",
        category_observed: true,
        is_active: true,
      },
    ],
    shared_activity_projection: [
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "activity-known",
        title: "Bekannte Kategorie",
        activity_date: "2026-09-01",
        duration_hours: 1.25,
        billable: true,
        billing_status: "offen",
        work_package_source_id: "wp-known",
        is_active: true,
      },
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "activity-inactive",
        title: "Inaktive Kategorie",
        activity_date: "2026-09-02",
        duration_hours: 2,
        billable: true,
        billing_status: "offen",
        work_package_source_id: "wp-inactive",
        is_active: true,
      },
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "activity-unknown",
        title: "Unbekannte Kategorie",
        activity_date: "2026-09-03",
        duration_hours: 3,
        billable: false,
        billing_status: "offen",
        work_package_source_id: "wp-unknown",
        is_active: true,
      },
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "activity-none",
        title: "Keine Kategorie",
        activity_date: "2026-09-04",
        duration_hours: 4,
        billable: false,
        billing_status: "offen",
        work_package_source_id: "wp-none",
        is_active: true,
      },
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "activity-unobserved",
        title: "Kategorie nicht publiziert",
        activity_date: "2026-09-05",
        duration_hours: 5,
        billable: true,
        billing_status: "offen",
        work_package_source_id: "wp-unobserved",
        is_active: true,
      },
      {
        systemhouse_id: "sh-rogue",
        customer_id: "customer-rogue",
        source_id: "activity-rogue",
        title: "Fremde Tätigkeit",
        activity_date: "2026-09-05",
        duration_hours: 99,
        billable: true,
        billing_status: "offen",
        work_package_source_id: "wp-rogue",
        is_active: true,
      },
    ],
    reference_catalog: [
      {
        id: "catalog-category",
        key: "workpackage.category",
        scope_type: "systemhouse",
      },
    ],
    reference_value: [
      {
        catalog_id: "catalog-category",
        systemhouse_id: "sh-1",
        key: "cat-known",
        label: "Regelbetrieb",
        is_active: true,
      },
      {
        catalog_id: "catalog-category",
        systemhouse_id: "sh-1",
        key: "cat-old",
        label: "Altbestand",
        is_active: false,
      },
      {
        catalog_id: "catalog-category",
        systemhouse_id: "sh-rogue",
        key: "cat-known",
        label: "Fremdes Label",
        is_active: true,
      },
    ],
  };
}

function callsFor(calls: QueryCall[], table: string, method?: string): QueryCall[] {
  return calls.filter((call) => call.table === table && (!method || call.method === method));
}

describe("BSF-03A Supabase project controlling adapter", () => {
  it("maps only own Customer-Access scope and preserves category states", async () => {
    const { client, calls } = createFakeClient(baseData());
    const repository = createSupabaseProjectControllingRepository(client, "user-1");

    const rows = await repository.listRows(BASE_FILTERS);
    const byId = new Map(rows.map((row) => [row.activityId, row]));

    expect(rows).toHaveLength(5);
    expect(byId.has("activity-rogue")).toBe(false);
    expect(byId.get("activity-known")).toMatchObject({
      systemhouseName: "Systemhaus Eins",
      customerName: "Kunde Eins",
      projectSourceId: "project-1",
      projectName: "Projekt Eins",
      workPackageSourceId: "wp-known",
      workPackageTitle: "Bekannt",
      categoryObserved: true,
      categoryKey: "cat-known",
      categoryLabel: "Regelbetrieb",
      categoryState: "known",
    });
    expect(byId.get("activity-inactive")).toMatchObject({
      categoryKey: "cat-old",
      categoryLabel: "Altbestand",
      categoryState: "inactive",
    });
    expect(byId.get("activity-unknown")).toMatchObject({
      categoryKey: "cat-missing",
      categoryLabel: null,
      categoryState: "unknown",
    });
    expect(byId.get("activity-none")).toMatchObject({
      categoryObserved: true,
      categoryKey: null,
      categoryState: "none",
    });
    expect(byId.get("activity-unobserved")).toMatchObject({
      categoryObserved: false,
      categoryKey: null,
      categoryState: "unobserved",
    });

    expect(callsFor(calls, "customer_access", "eq")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: ["user_id", "user-1"] }),
        expect.objectContaining({ args: ["status", "active"] }),
      ]),
    );

    const activitySelect = callsFor(calls, "shared_activity_projection", "select")[0];
    expect(activitySelect?.args[0]).not.toContain("engineer_id");
    expect(callsFor(calls, "shared_activity_projection", "gte")).toContainEqual(
      expect.objectContaining({ args: ["activity_date", "2026-09-01"] }),
    );
    expect(callsFor(calls, "shared_activity_projection", "lte")).toContainEqual(
      expect.objectContaining({ args: ["activity_date", "2026-09-30"] }),
    );
  });

  it("builds scope options only from readable access, parents and category keys", async () => {
    const { client } = createFakeClient(baseData());
    const repository = createSupabaseProjectControllingRepository(client, "user-1");

    const options = await repository.listScopeOptions(BASE_FILTERS);

    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "systemhouse",
          systemhouseId: "sh-1",
          label: "Systemhaus Eins",
        }),
        expect.objectContaining({
          kind: "customer",
          systemhouseId: "sh-1",
          customerId: "customer-1",
          label: "Kunde Eins",
        }),
        expect.objectContaining({
          kind: "project",
          systemhouseId: "sh-1",
          customerId: "customer-1",
          projectSourceId: "project-1",
          label: "Projekt Eins",
        }),
        expect.objectContaining({
          kind: "workPackage",
          systemhouseId: "sh-1",
          customerId: "customer-1",
          projectSourceId: "project-1",
          workPackageSourceId: "wp-known",
          label: "Bekannt",
        }),
        expect.objectContaining({
          kind: "category",
          systemhouseId: "sh-1",
          categoryKey: "cat-known",
          label: "Regelbetrieb",
          active: true,
        }),
        expect.objectContaining({
          kind: "category",
          systemhouseId: "sh-1",
          categoryKey: "cat-old",
          label: "Altbestand",
          active: false,
        }),
        expect.objectContaining({
          kind: "category",
          systemhouseId: "sh-1",
          categoryKey: "cat-missing",
          active: false,
        }),
      ]),
    );
    expect(options.some((option) => option.systemhouseId === "sh-rogue")).toBe(false);
  });

  it("pushes selected scope, category and billable filters into provider queries", async () => {
    const { client, calls } = createFakeClient(baseData());
    const repository = createSupabaseProjectControllingRepository(client, "user-1");
    const filters: ProjectControllingFilters = {
      ...BASE_FILTERS,
      billable: "billable",
      systemhouseId: "sh-1",
      customerId: "customer-1",
      projectSourceId: "project-1",
      categoryKey: "cat-known",
    };

    const rows = await repository.listRows(filters);

    expect(rows.map((row) => row.activityId)).toEqual(["activity-known"]);
    expect(callsFor(calls, "shared_work_package_projection", "eq")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: ["project_source_id", "project-1"] }),
        expect.objectContaining({ args: ["category_observed", true] }),
        expect.objectContaining({ args: ["category_key", "cat-known"] }),
      ]),
    );
    expect(callsFor(calls, "shared_activity_projection", "eq")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: ["systemhouse_id", "sh-1"] }),
        expect.objectContaining({ args: ["customer_id", "customer-1"] }),
        expect.objectContaining({ args: ["billable", true] }),
      ]),
    );
    const parentFilter = callsFor(calls, "shared_activity_projection").find(
      (call) =>
        (call.method === "eq" || call.method === "in") && call.args[0] === "work_package_source_id",
    );
    expect(parentFilter).toBeTruthy();
  });

  it("loads at most 5001 matching activities with stable paged ranges", async () => {
    const data = baseData();
    data.shared_work_package_projection = [
      {
        systemhouse_id: "sh-1",
        customer_id: "customer-1",
        source_id: "wp-known",
        project_source_id: "project-1",
        title: "Bekannt",
        category_key: "cat-known",
        category_observed: true,
        is_active: true,
      },
    ];
    data.shared_activity_projection = Array.from({ length: 6_000 }, (_, index) => ({
      systemhouse_id: "sh-1",
      customer_id: "customer-1",
      source_id: `activity-${String(index).padStart(4, "0")}`,
      title: `Tätigkeit ${index}`,
      activity_date: "2026-09-10",
      duration_hours: 1,
      billable: true,
      billing_status: "offen",
      work_package_source_id: "wp-known",
      is_active: true,
    }));

    const { client, calls } = createFakeClient(data);
    const repository = createSupabaseProjectControllingRepository(client, "user-1");

    const rows = await repository.listRows(BASE_FILTERS);

    expect(rows).toHaveLength(5_001);
    const ranges = callsFor(calls, "shared_activity_projection", "range").map((call) => call.args);
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
      [3000, 3999],
      [4000, 4999],
      [5000, 5000],
    ]);
  });

  it("contains no service-role/admin import path", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/integrations/supabase/project-controlling-adapter.ts"),
      "utf8",
    );

    expect(source).not.toContain("client.server");
    expect(source).not.toContain("supabaseAdmin");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE");
    expect(source).not.toContain("service_role");
  });
});
