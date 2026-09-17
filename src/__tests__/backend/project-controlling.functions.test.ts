import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/integrations/supabase/types";
import type {
  ProjectControllingFilters,
  ProjectControllingRepository,
  ProjectControllingScopeOption,
} from "@/lib/project-controlling/project-controlling-contract";
import {
  PROJECT_CONTROLLING_DENIED,
  executeProjectControllingRequest,
  parseProjectControllingRequest,
} from "@/lib/project-controlling-runtime/project-controlling.functions";

const SYSTEMHOUSE_ID = "11111111-1111-4111-8111-111111111111";
const CUSTOMER_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";

const BASE_FILTERS: ProjectControllingFilters = {
  from: "2026-09-01",
  to: "2026-09-30",
  billable: "all",
};

const SCOPED_FILTERS: ProjectControllingFilters = {
  ...BASE_FILTERS,
  systemhouseId: SYSTEMHOUSE_ID,
  customerId: CUSTOMER_ID,
  projectSourceId: "P-1",
  workPackageSourceId: "WP-1",
  categoryKey: "cat-known",
};

type RpcName =
  | "has_permission"
  | "is_account_active"
  | "has_active_systemhouse_membership"
  | "has_customer_access";

interface RpcCall {
  fn: RpcName;
  args: Record<string, unknown>;
}

interface FakeAuthOptions {
  permission?: boolean;
  active?: boolean;
  membership?: boolean;
  access?: boolean;
  errorFor?: RpcName;
}

function fakeAuthClient(options: FakeAuthOptions = {}): {
  client: SupabaseClient<Database>;
  calls: RpcCall[];
} {
  const calls: RpcCall[] = [];
  const values: Record<RpcName, boolean> = {
    has_permission: options.permission ?? true,
    is_account_active: options.active ?? true,
    has_active_systemhouse_membership: options.membership ?? true,
    has_customer_access: options.access ?? true,
  };

  const client = {
    async rpc(fn: RpcName, args: Record<string, unknown>) {
      calls.push({ fn, args });
      if (options.errorFor === fn) {
        return { data: null, error: { message: "synthetic rpc error" } };
      }
      return { data: values[fn], error: null };
    },
  } as unknown as SupabaseClient<Database>;

  return { client, calls };
}

function visibleScopeOptions(): ProjectControllingScopeOption[] {
  return [
    {
      kind: "systemhouse",
      systemhouseId: SYSTEMHOUSE_ID,
      label: "Systemhaus Eins",
    },
    {
      kind: "customer",
      systemhouseId: SYSTEMHOUSE_ID,
      customerId: CUSTOMER_ID,
      label: "Kunde Eins",
    },
    {
      kind: "project",
      systemhouseId: SYSTEMHOUSE_ID,
      customerId: CUSTOMER_ID,
      projectSourceId: "P-1",
      label: "Projekt Eins",
    },
    {
      kind: "workPackage",
      systemhouseId: SYSTEMHOUSE_ID,
      customerId: CUSTOMER_ID,
      projectSourceId: "P-1",
      workPackageSourceId: "WP-1",
      label: "Arbeitspaket Eins",
    },
    {
      kind: "category",
      systemhouseId: SYSTEMHOUSE_ID,
      categoryKey: "cat-known",
      label: "Regelbetrieb",
      active: true,
    },
  ];
}

function fakeRepository(
  scopeOptions: readonly ProjectControllingScopeOption[] = visibleScopeOptions(),
): ProjectControllingRepository {
  return {
    async listRows() {
      return [];
    },
    async listScopeOptions() {
      return scopeOptions;
    },
  };
}

async function expectDenied(
  auth: FakeAuthOptions,
  filters: ProjectControllingFilters = SCOPED_FILTERS,
  repository: ProjectControllingRepository = fakeRepository(),
): Promise<void> {
  const { client } = fakeAuthClient(auth);
  await expect(
    executeProjectControllingRequest(client, USER_ID, filters, repository),
  ).rejects.toThrow(PROJECT_CONTROLLING_DENIED);
}

describe("BSF-03A project controlling request validator", () => {
  it("accepts canonical ISO dates, UUID scopes and dependent source filters", () => {
    expect(parseProjectControllingRequest(SCOPED_FILTERS)).toEqual(SCOPED_FILTERS);
  });

  it.each([
    [{ ...BASE_FILTERS, from: "2026-02-30" }, "calendar-invalid date"],
    [{ ...BASE_FILTERS, to: "17.09.2026" }, "non-ISO date"],
    [{ ...BASE_FILTERS, systemhouseId: "not-a-uuid" }, "invalid systemhouse UUID"],
    [{ ...BASE_FILTERS, customerId: CUSTOMER_ID }, "customer without systemhouse"],
    [
      { ...BASE_FILTERS, systemhouseId: SYSTEMHOUSE_ID, projectSourceId: "P-1" },
      "project without customer",
    ],
    [
      {
        ...BASE_FILTERS,
        systemhouseId: SYSTEMHOUSE_ID,
        customerId: CUSTOMER_ID,
        workPackageSourceId: "WP-1",
      },
      "work package without project",
    ],
    [{ ...BASE_FILTERS, categoryKey: "cat-known" }, "category without systemhouse"],
  ])("rejects %s (%s)", (input) => {
    expect(() => parseProjectControllingRequest(input)).toThrow();
  });
});

describe("BSF-03A project controlling server authorization", () => {
  it("checks active account, atomic permission, membership and read access before success", async () => {
    const { client, calls } = fakeAuthClient();

    const outcome = await executeProjectControllingRequest(
      client,
      USER_ID,
      SCOPED_FILTERS,
      fakeRepository(),
    );

    expect(outcome.ok).toBe(true);
    expect(calls).toEqual(
      expect.arrayContaining([
        {
          fn: "has_permission",
          args: { _user_id: USER_ID, _perm: "project.controlling.view" },
        },
        { fn: "is_account_active", args: { _user_id: USER_ID } },
        {
          fn: "has_active_systemhouse_membership",
          args: { _user_id: USER_ID, _systemhouse_id: SYSTEMHOUSE_ID },
        },
        {
          fn: "has_customer_access",
          args: {
            _user_id: USER_ID,
            _systemhouse_id: SYSTEMHOUSE_ID,
            _customer_id: CUSTOMER_ID,
            _required_level: "read",
          },
        },
      ]),
    );
  });

  it.each(["engineer", "viewer", "customer"])(
    "denies %s when project.controlling.view is false",
    async () => {
      await expectDenied({ permission: false });
    },
  );

  it("denies an inactive account with the same generic message", async () => {
    await expectDenied({ active: false });
  });

  it("denies a foreign systemhouse without revealing whether it exists", async () => {
    await expectDenied({ membership: false });
  });

  it("denies a foreign customer without revealing whether it exists", async () => {
    await expectDenied({ access: false });
  });

  it("denies a manipulated project source id using the generic message", async () => {
    const filters = { ...SCOPED_FILTERS, projectSourceId: "P-foreign", workPackageSourceId: undefined };
    await expectDenied({}, filters, fakeRepository());
  });

  it("denies a manipulated work package source id using the generic message", async () => {
    const filters = { ...SCOPED_FILTERS, workPackageSourceId: "WP-foreign" };
    await expectDenied({}, filters, fakeRepository());
  });

  it("does not turn an authorization RPC failure into an existence hint", async () => {
    const { client } = fakeAuthClient({ errorFor: "has_customer_access" });
    await expect(
      executeProjectControllingRequest(client, USER_ID, SCOPED_FILTERS, fakeRepository()),
    ).rejects.toThrow("Projektcontrolling-Autorisierung konnte nicht geprüft werden.");
  });
});

describe("BSF-03A project controlling server-function security wiring", () => {
  it("requires authenticated User-JWT middleware and contains no privileged client path", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/lib/project-controlling-runtime/project-controlling.functions.ts",
      ),
      "utf8",
    );

    expect(source).toContain("middleware([requireSupabaseAuth])");
    expect(source).toContain('"project.controlling.view"');
    expect(source).not.toContain("client.server");
    expect(source).not.toContain("supabaseAdmin");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE");
    expect(source).not.toContain("Project.lead");
  });
});
