import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createSupabaseWorkPackageWorkViewRepository } from "@/integrations/supabase/work-package-work-view-adapter";
import type { Database } from "@/integrations/supabase/types";

const SH_A = "11111111-1111-4111-8111-111111111111";
const SH_B = "22222222-2222-4222-822222222222";
const CUSTOMER_A = "33333333-3333-4333-8333-333333333333";
const CUSTOMER_B = "44444444-4444-4444-8444-444444444444";
const SUBJECT_A = "55555555-5555-4555-8555-555555555555";
const ADA = "66666666-6666-4666-8666-666666666666";

type Row = Record<string, unknown>;
type Data = Record<string, Row[]>;
interface Call {
  table: string;
  method: string;
  args: unknown[];
}

class Query implements PromiseLike<{ data: Row[]; error: null }> {
  private predicates: Array<(row: Row) => boolean> = [];
  constructor(
    private readonly table: string,
    private readonly rows: readonly Row[],
    private readonly calls: Call[],
  ) {}
  private record(method: string, args: unknown[]) {
    this.calls.push({ table: this.table, method, args });
    return this;
  }
  select(...args: unknown[]) {
    return this.record("select", args);
  }
  eq(column: string, value: unknown) {
    this.predicates.push((row) => row[column] === value);
    return this.record("eq", [column, value]);
  }
  in(column: string, values: readonly unknown[]) {
    this.predicates.push((row) => values.includes(row[column]));
    return this.record("in", [column, [...values]]);
  }
  then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: Row[]; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve({
      data: this.rows.filter((row) => this.predicates.every((predicate) => predicate(row))),
      error: null,
    }).then(onfulfilled, onrejected);
  }
}

function client(data: Data, options: { peopleError?: boolean } = {}) {
  const calls: Call[] = [];
  return {
    calls,
    client: {
      from(table: string) {
        return new Query(table, data[table] ?? [], calls);
      },
      async rpc(name: string) {
        if (name !== "avkk_people_directory" || options.peopleError)
          return { data: null, error: { message: "synthetic error" } };
        return { data: [{ id: ADA, display_name: "Ada Beispiel", status: "active" }], error: null };
      },
    } as unknown as SupabaseClient<Database>,
  };
}

function fixture(): Data {
  return {
    shared_work_package_projection: [
      {
        id: "77777777-7777-4777-8777-777777777777",
        systemhouse_id: SH_A,
        customer_id: CUSTOMER_A,
        source_id: "WP-1",
        title: "Authorized",
        status: "open",
        due: "2026-10-15",
        is_active: true,
      },
      {
        id: "88888888-8888-4888-8888-888888888888",
        systemhouse_id: SH_A,
        customer_id: CUSTOMER_A,
        source_id: "WP-2",
        title: "Inactive",
        status: "open",
        due: null,
        is_active: false,
      },
    ],
    customer: [{ id: CUSTOMER_A, systemhouse_id: SH_A, name: "Kunde A" }],
    avkk_subject: [
      {
        id: SUBJECT_A,
        subject_type: "workpackage",
        subject_id: "WP-1",
        systemhouse_id: SH_A,
        customer_id: CUSTOMER_A,
      },
      {
        id: "99999999-9999-4999-8999-999999999999",
        subject_type: "workpackage",
        subject_id: "WP-1",
        systemhouse_id: SH_B,
        customer_id: CUSTOMER_A,
      },
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        subject_type: "project",
        subject_id: "WP-1",
        systemhouse_id: SH_A,
        customer_id: CUSTOMER_A,
      },
    ],
    avkk_responsibility: [
      {
        avkk_subject_id: SUBJECT_A,
        person_id: ADA,
        role_key_snapshot: "owner",
        valid_from: "2026-10-01T00:00:00Z",
        valid_to: null,
      },
      {
        avkk_subject_id: SUBJECT_A,
        person_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        role_key_snapshot: "deputy",
        valid_from: "2026-10-05T00:00:00Z",
        valid_to: null,
      },
    ],
  };
}

describe("BSF-03E P3b-1 Supabase work-package adapter", () => {
  it("reads only active RLS-visible work packages and resolves subjects by composite scope", async () => {
    const fake = client(fixture());
    const rows = await createSupabaseWorkPackageWorkViewRepository(
      fake.client,
    ).listAuthorizedWorkPackages("2026-10-03T00:00:00Z");
    expect(rows).toEqual([
      expect.objectContaining({
        sourceId: "WP-1",
        customerName: "Kunde A",
        responsibilities: [expect.objectContaining({ personId: ADA, role: "owner" })],
      }),
    ]);
    expect(fake.calls).toContainEqual({
      table: "shared_work_package_projection",
      method: "eq",
      args: ["is_active", true],
    });
    expect(fake.calls.some((call) => call.table === "profiles")).toBe(false);
  });

  it("does not attach subjects that share a source id but belong to another customer or systemhouse", async () => {
    const data = fixture();
    data.avkk_subject.push({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      subject_type: "workpackage",
      subject_id: "WP-1",
      systemhouse_id: SH_A,
      customer_id: CUSTOMER_B,
    });
    data.avkk_responsibility.push({
      avkk_subject_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      person_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      role_key_snapshot: "owner",
      valid_from: "2026-10-01T00:00:00Z",
      valid_to: null,
    });
    const rows = await createSupabaseWorkPackageWorkViewRepository(
      client(data).client,
    ).listAuthorizedWorkPackages("2026-10-03T00:00:00Z");
    expect(rows[0].responsibilities).toEqual([expect.objectContaining({ personId: ADA })]);
  });

  it("includes only responsibilities active at the supplied reference instant", async () => {
    const rows = await createSupabaseWorkPackageWorkViewRepository(
      client(fixture()).client,
    ).listAuthorizedWorkPackages("2026-10-03T00:00:00Z");
    expect(rows[0].responsibilities).toHaveLength(1);
  });

  it("compares offset timestamps as instants instead of timestamp strings", async () => {
    const data = fixture();
    data.avkk_responsibility[0].valid_from = "2026-10-03T00:00:00+02:00";
    data.avkk_responsibility[0].valid_to = null;

    const rows = await createSupabaseWorkPackageWorkViewRepository(
      client(data).client,
    ).listAuthorizedWorkPackages("2026-10-02T22:30:00.000Z");

    expect(rows[0].responsibilities).toEqual([expect.objectContaining({ personId: ADA })]);
  });

  it.each([
    ["2026-10-02T20:00:00-01:00", null, true],
    ["2026-10-03T00:30:00+02:00", null, true],
    ["2026-10-02T20:30:00-02:00", "2026-10-03T00:30:00+02:00", false],
    ["2026-10-02T20:00:00-01:00", "2026-10-03T01:00:00+02:00", true],
    ["2026-10-03T01:00:00+02:00", null, false],
    ["2026-10-02T20:00:00-01:00", "2026-10-03T00:00:00+02:00", false],
    ["2026-10-02T22:00:00Z", "2026-10-02T23:00:00Z", true],
  ])(
    "uses inclusive valid_from and exclusive valid_to instant boundaries",
    async (validFrom, validTo, expectedActive) => {
      const data = fixture();
      data.avkk_responsibility[0].valid_from = validFrom;
      data.avkk_responsibility[0].valid_to = validTo;

      const rows = await createSupabaseWorkPackageWorkViewRepository(
        client(data).client,
      ).listAuthorizedWorkPackages("2026-10-02T22:30:00.000Z");

      expect(rows[0].responsibilities).toHaveLength(expectedActive ? 1 : 0);
    },
  );

  it.each([
    ["not-a-date", "2026-10-02T22:00:00Z", null],
    ["2026-10-02T22:00:00Z", "2026-99-99", null],
    ["2026-10-02T22:00:00Z", "", null],
  ])(
    "fails closed for invalid responsibility timestamps",
    async (referenceInstant, validFrom, validTo) => {
      const data = fixture();
      data.avkk_responsibility[0].valid_from = validFrom;
      data.avkk_responsibility[0].valid_to = validTo;

      await expect(
        createSupabaseWorkPackageWorkViewRepository(client(data).client).listAuthorizedWorkPackages(
          referenceInstant,
        ),
      ).rejects.toThrow(/fehlgeschlagen/i);
    },
  );

  it("fails closed when the minimal people directory cannot be read", async () => {
    await expect(
      createSupabaseWorkPackageWorkViewRepository(
        client(fixture(), { peopleError: true }).client,
      ).listAuthorizedWorkPackages("2026-10-03T00:00:00Z"),
    ).rejects.toThrow(/Personenverzeichnis/i);
  });
});
