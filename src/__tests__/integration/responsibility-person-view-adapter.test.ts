import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createSupabaseResponsibilityPersonViewRepository } from "@/integrations/supabase/responsibility-person-view-adapter";
import type { Database } from "@/integrations/supabase/types";

const PERSON = "11111111-1111-4111-8111-111111111111";
const SUBJECT_PROJECT = "22222222-2222-4222-8222-222222222222";
const SUBJECT_WP = "33333333-3333-4333-8333-333333333333";
const SH = "44444444-4444-4444-8444-444444444444";
const CUSTOMER = "55555555-5555-4555-8555-555555555555";

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

  constructor(
    private readonly table: string,
    private readonly rows: readonly FakeRow[],
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

  in(column: string, values: readonly unknown[]): this {
    this.predicates.push((row) => values.includes(row[column]));
    return this.record("in", [column, [...values]]);
  }

  async maybeSingle(): Promise<{ data: FakeRow | null; error: null }> {
    this.record("maybeSingle", []);
    return { data: this.materialize()[0] ?? null, error: null };
  }

  private materialize(): FakeRow[] {
    return this.rows
      .filter((row) => this.predicates.every((predicate) => predicate(row)))
      .map((row) => ({ ...row }));
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
    async rpc(fn: string) {
      if (fn !== "avkk_people_directory") {
        return { data: null, error: { message: "unexpected rpc" } };
      }
      return {
        data: [
          { id: PERSON, display_name: "Ada Beispiel", role: "projectmanager", status: "active" },
          {
            id: "99999999-9999-4999-8999-999999999999",
            display_name: "Nicht relevant",
            role: "engineer",
            status: "active",
          },
        ],
        error: null,
      };
    },
  } as unknown as SupabaseClient<Database>;

  return { client, calls };
}

function fixtureData(): FakeTableData {
  return {
    avkk_responsibility: [
      {
        id: "66666666-6666-4666-8666-666666666661",
        avkk_subject_id: SUBJECT_PROJECT,
        person_id: PERSON,
        role_key_snapshot: "owner",
        valid_from: "2026-09-01T00:00:00Z",
        valid_to: null,
      },
      {
        id: "66666666-6666-4666-8666-666666666662",
        avkk_subject_id: SUBJECT_WP,
        person_id: PERSON,
        role_key_snapshot: "deputy",
        valid_from: "2026-09-02T00:00:00Z",
        valid_to: null,
      },
      {
        id: "66666666-6666-4666-8666-666666666663",
        avkk_subject_id: SUBJECT_PROJECT,
        person_id: PERSON,
        role_key_snapshot: "owner",
        valid_from: "2026-08-01T00:00:00Z",
        valid_to: "2026-08-31T23:59:59Z",
      },
    ],
    avkk_subject: [
      {
        id: SUBJECT_PROJECT,
        subject_type: "project",
        subject_id: "P-1",
        subject_title_snapshot: "Alter Projekttitel",
        status: "active",
        systemhouse_id: SH,
        customer_id: CUSTOMER,
      },
      {
        id: SUBJECT_WP,
        subject_type: "workpackage",
        subject_id: "WP-1",
        subject_title_snapshot: "Alter AP-Titel",
        status: "active",
        systemhouse_id: SH,
        customer_id: CUSTOMER,
      },
    ],
    customer: [{ id: CUSTOMER, systemhouse_id: SH, name: "Kunde Eins" }],
    shared_project_projection: [
      {
        systemhouse_id: SH,
        customer_id: CUSTOMER,
        source_id: "P-1",
        name: "Projekt Eins",
        status: "active",
        is_active: true,
      },
    ],
    shared_work_package_projection: [
      {
        systemhouse_id: SH,
        customer_id: CUSTOMER,
        source_id: "WP-1",
        title: "Arbeitspaket Eins",
        status: "open",
        is_active: true,
      },
    ],
    avkk_competence: [
      {
        avkk_subject_id: SUBJECT_PROJECT,
        rating_key_snapshot: "missing",
        support_needed: true,
        superseded_at: null,
      },
      {
        avkk_subject_id: SUBJECT_WP,
        rating_key_snapshot: "partial",
        support_needed: false,
        superseded_at: null,
      },
      {
        avkk_subject_id: SUBJECT_WP,
        rating_key_snapshot: "partial",
        support_needed: false,
        superseded_at: null,
      },
    ],
    app_settings: [
      {
        key: "avkk.risk_threshold",
        value: { missingCount: 1, partialCount: 2 },
      },
    ],
  };
}

describe("BSF-03E P1 Supabase person-view adapter", () => {
  it("builds minimal source rows only from active responsibilities and active projections", async () => {
    const { client, calls } = createFakeClient(fixtureData());
    const repository = createSupabaseResponsibilityPersonViewRepository(client);

    const rows = await repository.listByPerson(PERSON);

    expect(rows).toEqual([
      expect.objectContaining({
        personId: PERSON,
        displayName: "Ada Beispiel",
        role: "owner",
        subjectType: "project",
        subjectId: "P-1",
        title: "Projekt Eins",
        customerName: "Kunde Eins",
        status: "active",
        due: null,
        missingCount: 1,
        partialCount: 0,
        supportNeeded: true,
        validTo: null,
      }),
      expect.objectContaining({
        personId: PERSON,
        displayName: "Ada Beispiel",
        role: "deputy",
        subjectType: "workpackage",
        subjectId: "WP-1",
        title: "Arbeitspaket Eins",
        customerName: "Kunde Eins",
        status: "open",
        due: null,
        missingCount: 0,
        partialCount: 2,
        supportNeeded: false,
        validTo: null,
      }),
    ]);
    expect(calls).toContainEqual({
      table: "avkk_responsibility",
      method: "eq",
      args: ["person_id", PERSON],
    });
    expect(calls).toContainEqual({
      table: "avkk_responsibility",
      method: "is",
      args: ["valid_to", null],
    });
    expect(calls.some((call) => call.table === "profiles")).toBe(false);
  });

  it("reads the existing AVKK risk threshold without inventing a second default", async () => {
    const { client } = createFakeClient(fixtureData());
    const repository = createSupabaseResponsibilityPersonViewRepository(client);

    await expect(repository.readRiskThreshold()).resolves.toEqual({
      missingCount: 1,
      partialCount: 2,
    });
  });

  it("fails closed when the scoped shared projection is not visible", async () => {
    const data = fixtureData();
    data.shared_project_projection = [];
    const { client } = createFakeClient(data);
    const repository = createSupabaseResponsibilityPersonViewRepository(client);

    const rows = await repository.listByPerson(PERSON);

    expect(rows.map((row) => row.subjectId)).toEqual(["WP-1"]);
  });
});
