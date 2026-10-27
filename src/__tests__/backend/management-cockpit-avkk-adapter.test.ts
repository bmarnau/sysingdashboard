import type { SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createSupabaseManagementCockpitAvkkRepository } from "@/integrations/supabase/management-cockpit-avkk-adapter";
import type { Database } from "@/integrations/supabase/types";

const SH = "11111111-1111-4111-8111-111111111111";
const SH_FOREIGN = "99999999-9999-4999-8999-999999999999";
const KA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const KB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SUBJECT_HIGH = "10000000-0000-4000-8000-000000000001";
const SUBJECT_CRITICAL = "10000000-0000-4000-8000-000000000002";
const SUBJECT_MEDIUM = "10000000-0000-4000-8000-000000000003";
const SUBJECT_FOREIGN = "10000000-0000-4000-8000-000000000004";

type Row = Record<string, unknown>;
type Data = Record<string, Row[]>;

class Query implements PromiseLike<{ data: Row[] | null; error: { message: string } | null }> {
  private readonly predicates: Array<(row: Row) => boolean> = [];
  private pageFrom = 0;
  private pageTo = 1;

  constructor(
    private readonly table: string,
    private readonly rows: readonly Row[],
    private readonly errorTable?: string,
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.predicates.push((row) => row[column] === value);
    return this;
  }

  in(column: string, values: readonly unknown[]) {
    this.predicates.push((row) => values.includes(row[column]));
    return this;
  }

  is(column: string, value: unknown) {
    this.predicates.push((row) => row[column] === value);
    return this;
  }

  range(from: number, to: number) {
    this.pageFrom = from;
    this.pageTo = to;
    return this;
  }

  async maybeSingle() {
    const result = await this.materialize();
    return { data: result.data?.[0] ?? null, error: result.error };
  }

  private async materialize() {
    if (this.table === this.errorTable) {
      return { data: null, error: { message: "synthetic sensitive database detail" } };
    }
    return {
      data: this.rows
        .filter((row) => this.predicates.every((predicate) => predicate(row)))
        .slice(this.pageFrom, this.pageTo + 1),
      error: null,
    };
  }

  then<TResult1 = { data: Row[] | null; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: {
          data: Row[] | null;
          error: { message: string } | null;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.materialize().then(onfulfilled, onrejected);
  }
}

function fakeClient(data: Data, errorTable?: string): SupabaseClient<Database> {
  return {
    from(table: string) {
      return new Query(table, data[table] ?? [], errorTable);
    },
  } as unknown as SupabaseClient<Database>;
}

function subject(id: string, systemhouseId: string, customerId: string, sourceId: string): Row {
  return {
    id,
    subject_type: "workpackage",
    subject_id: sourceId,
    subject_title_snapshot: sourceId,
    status: "active",
    version: 1,
    systemhouse_id: systemhouseId,
    customer_id: customerId,
    created_by: null,
    created_at: "2026-10-25T00:00:00Z",
    updated_at: "2026-10-25T00:00:00Z",
  };
}

function consequence(subjectId: string, severity: string): Row {
  return {
    id: `${subjectId}-consequence`,
    avkk_subject_id: subjectId,
    area_key_snapshot: "customer",
    area_label_snapshot: "Kunde",
    severity_key_snapshot: severity,
    severity_label_snapshot: severity,
    schedule_impact_key_snapshot: "none",
    schedule_impact_label_snapshot: "Keine",
    description: "",
    superseded_at: null,
  };
}

function fixture(): Data {
  return {
    avkk_subject: [
      subject(SUBJECT_HIGH, SH, KA, "wp-high"),
      subject(SUBJECT_CRITICAL, SH, KA, "wp-critical"),
      subject(SUBJECT_MEDIUM, SH, KB, "wp-medium"),
      subject(SUBJECT_FOREIGN, SH_FOREIGN, KA, "wp-foreign"),
    ],
    avkk_responsibility: [],
    avkk_responsibility_type: [],
    avkk_competence: [],
    avkk_consequence: [
      consequence(SUBJECT_HIGH, "high"),
      consequence(SUBJECT_CRITICAL, "critical"),
      consequence(SUBJECT_MEDIUM, "medium"),
      consequence(SUBJECT_FOREIGN, "critical"),
    ],
    app_settings: [{ key: "avkk.risk_threshold", value: { missingCount: 1, partialCount: 2 } }],
    reference_catalog: [
      { id: "catalog-dimension", key: "avkk.competence_dimension" },
      { id: "catalog-severity", key: "avkk.consequence_severity" },
    ],
    reference_value: [
      {
        catalog_id: "catalog-dimension",
        key: "knowledge",
        attributes: {},
        is_active: true,
      },
      { catalog_id: "catalog-severity", key: "medium", attributes: { rank: 2 }, is_active: true },
      { catalog_id: "catalog-severity", key: "high", attributes: { rank: 3 }, is_active: true },
      {
        catalog_id: "catalog-severity",
        key: "critical",
        attributes: { rank: 4 },
        is_active: false,
      },
    ],
  };
}

describe("L2 P2b — AVKK Supabase server adapter", () => {
  it("leitet hohe und kritische AVKK-Signale mit der bestehenden Fachlogik je Mandant/Kunde ab", async () => {
    const repository = createSupabaseManagementCockpitAvkkRepository(
      fakeClient(fixture()),
      "2026-10-27T08:00:00.000Z",
    );

    await expect(repository.listCustomerSignals()).resolves.toEqual([
      { systemhouseId: SH, customerId: KA, highOrCritical: 2 },
      { systemhouseId: SH, customerId: KB, highOrCritical: 0 },
      { systemhouseId: SH_FOREIGN, customerId: KA, highOrCritical: 1 },
    ]);
  });

  it("bricht bei einem Providerfehler generisch ab und gibt keine Datenbankdetails weiter", async () => {
    const repository = createSupabaseManagementCockpitAvkkRepository(
      fakeClient(fixture(), "avkk_consequence"),
      "2026-10-27T08:00:00.000Z",
    );

    await expect(repository.listCustomerSignals()).rejects.toThrow(
      "Management-Cockpit AVKK: Konsequenzen lesen fehlgeschlagen.",
    );
    await expect(repository.listCustomerSignals()).rejects.not.toThrow("synthetic sensitive");
  });

  it("meldet auch einen Fehler beim Lesen der Risikoschwelle als Providerfehler", async () => {
    const repository = createSupabaseManagementCockpitAvkkRepository(
      fakeClient(fixture(), "app_settings"),
      "2026-10-27T08:00:00.000Z",
    );

    await expect(repository.listCustomerSignals()).rejects.toThrow(
      "Management-Cockpit AVKK: Risikoschwelle lesen fehlgeschlagen.",
    );
  });

  it("bleibt beim User-JWT-Lesepfad ohne Datenbank-Schreiboperation", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/integrations/supabase/management-cockpit-avkk-adapter.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/service[_-]?role|supabaseAdmin|client\.server/i);
    expect(source).not.toMatch(/\.(insert|update|upsert|delete)\(/);
  });
});
