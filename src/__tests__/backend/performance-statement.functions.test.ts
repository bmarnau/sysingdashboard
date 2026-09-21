import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/integrations/supabase/types";
import type {
  BillableOverrideInput,
  PerformanceStatementRepository,
  PerformanceStatementReview,
  PerformanceStatementSnapshot,
  ReviewInput,
} from "@/lib/performance-statement/performance-statement-contract";
import {
  PERFORMANCE_STATEMENT_DENIED,
  PERFORMANCE_STATEMENT_PERMISSION,
  executeFinalizePerformanceStatement,
  executeGetPerformanceStatement,
  executeGetPerformanceStatementReview,
  executeReplacePerformanceStatement,
  executeSetPerformanceBillableOverride,
  parsePerformanceFinalizeInput,
  parsePerformanceReplaceInput,
  parsePerformanceReviewInput,
  requirePerformanceStatementAccess,
} from "@/lib/performance-statement-runtime/performance-statement.functions";

const SYSTEMHOUSE_ID = "11111111-1111-4111-8111-111111111111";
const CUSTOMER_ID = "22222222-2222-4222-8222-222222222222";
const FOREIGN_CUSTOMER_ID = "22222222-2222-4222-8222-999999999999";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const REQUEST_ID = "44444444-4444-4444-8444-444444444444";
const STATEMENT_ID = "55555555-5555-4555-8555-555555555555";

const REVIEW_INPUT: ReviewInput = {
  systemhouseId: SYSTEMHOUSE_ID,
  customerId: CUSTOMER_ID,
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
};

const REVIEW: PerformanceStatementReview = {
  ...REVIEW_INPUT,
  customerName: "Kunde Eins",
  rows: [],
  reviewFingerprint: "a".repeat(64),
  freshness: {
    oldestPublishedAt: null,
    latestPublishedAt: null,
  },
  summary: {
    billableHours: 0,
    nonBillableHours: 0,
    reviewableCount: 0,
  },
};

const SNAPSHOT: PerformanceStatementSnapshot = {
  id: STATEMENT_ID,
  seriesId: "66666666-6666-4666-8666-666666666666",
  version: 1,
  systemhouseId: SYSTEMHOUSE_ID,
  customerId: CUSTOMER_ID,
  customerName: "Kunde Eins",
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  status: "finalized",
  finalizedBy: USER_ID,
  finalizedAt: "2026-09-30T12:00:00.000Z",
  freshness: {
    oldestPublishedAt: "2026-09-01T08:00:00.000Z",
    latestPublishedAt: "2026-09-30T09:00:00.000Z",
  },
  reviewFingerprint: "a".repeat(64),
  snapshotHash: "b".repeat(64),
  itemCount: 0,
  billableItemCount: 0,
  billableHours: 0,
  nonBillableHours: 0,
  replacesStatementId: null,
  supersededByStatementId: null,
  items: [],
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

function fakeRepository(overrides: Partial<PerformanceStatementRepository> = {}): {
  repository: PerformanceStatementRepository;
  spies: {
    listScopes: ReturnType<typeof vi.fn>;
    getReview: ReturnType<typeof vi.fn>;
    setBillableOverride: ReturnType<typeof vi.fn>;
    finalize: ReturnType<typeof vi.fn>;
    replace: ReturnType<typeof vi.fn>;
    getStatement: ReturnType<typeof vi.fn>;
    listStatements: ReturnType<typeof vi.fn>;
  };
} {
  const spies = {
    listScopes: vi.fn(async () => [
      {
        systemhouseId: SYSTEMHOUSE_ID,
        systemhouseName: "Systemhaus Eins",
        customerId: CUSTOMER_ID,
        customerName: "Kunde Eins",
      },
    ]),
    getReview: vi.fn(async () => REVIEW),
    setBillableOverride: vi.fn(async () => undefined),
    finalize: vi.fn(async () => ({ statementId: STATEMENT_ID })),
    replace: vi.fn(async () => ({ statementId: STATEMENT_ID })),
    getStatement: vi.fn(async () => SNAPSHOT),
    listStatements: vi.fn(async () => [SNAPSHOT]),
  };

  return {
    repository: {
      listScopes: overrides.listScopes ?? spies.listScopes,
      getReview: overrides.getReview ?? spies.getReview,
      setBillableOverride: overrides.setBillableOverride ?? spies.setBillableOverride,
      finalize: overrides.finalize ?? spies.finalize,
      replace: overrides.replace ?? spies.replace,
      getStatement: overrides.getStatement ?? spies.getStatement,
      listStatements: overrides.listStatements ?? spies.listStatements,
    },
    spies,
  };
}

describe("BSF-03B performance statement validators", () => {
  it("accepts canonical review and finalize inputs", () => {
    expect(parsePerformanceReviewInput(REVIEW_INPUT)).toEqual(REVIEW_INPUT);
    expect(
      parsePerformanceFinalizeInput({
        ...REVIEW_INPUT,
        requestId: REQUEST_ID,
        expectedReviewFingerprint: "a".repeat(64),
      }),
    ).toMatchObject(REVIEW_INPUT);
  });

  it.each([
    [{ ...REVIEW_INPUT, periodStart: "2026-02-30" }, "invalid calendar date"],
    [{ ...REVIEW_INPUT, periodStart: "2025-01-01", periodEnd: "2026-09-30" }, "over 366 days"],
    [{ ...REVIEW_INPUT, systemhouseId: "not-a-uuid" }, "invalid systemhouse"],
  ])("rejects invalid review input (%s)", (input) => {
    expect(() => parsePerformanceReviewInput(input)).toThrow();
  });

  it("requires lowercase SHA-256 and a replacement statement id", () => {
    expect(() =>
      parsePerformanceFinalizeInput({
        ...REVIEW_INPUT,
        requestId: REQUEST_ID,
        expectedReviewFingerprint: "A".repeat(64),
      }),
    ).toThrow();

    expect(() =>
      parsePerformanceReplaceInput({
        ...REVIEW_INPUT,
        requestId: REQUEST_ID,
        expectedReviewFingerprint: "a".repeat(64),
      }),
    ).toThrow();
  });
});

describe("BSF-03B server authorization", () => {
  it("checks active account, permission, membership and customer access", async () => {
    const { client, calls } = fakeAuthClient();

    await requirePerformanceStatementAccess(client, USER_ID, {
      systemhouseId: SYSTEMHOUSE_ID,
      customerId: CUSTOMER_ID,
    });

    expect(calls).toEqual(
      expect.arrayContaining([
        {
          fn: "has_permission",
          args: { _user_id: USER_ID, _perm: PERFORMANCE_STATEMENT_PERMISSION },
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

  it.each([
    [
      { permission: false },
      "administrator/projectmanager/engineer/viewer/customer permission deny",
    ],
    [{ active: false }, "inactive account"],
    [{ membership: false }, "foreign systemhouse"],
    [{ access: false }, "foreign customer"],
  ] as const)("denies %s without revealing entity existence", async (options) => {
    const { client } = fakeAuthClient(options);
    await expect(
      requirePerformanceStatementAccess(client, USER_ID, {
        systemhouseId: SYSTEMHOUSE_ID,
        customerId: CUSTOMER_ID,
      }),
    ).rejects.toThrow(PERFORMANCE_STATEMENT_DENIED);
  });
});

describe("BSF-03B server request execution", () => {
  it("reads a review only after authorization", async () => {
    const { client } = fakeAuthClient();
    const { repository, spies } = fakeRepository();

    const result = await executeGetPerformanceStatementReview(
      client,
      USER_ID,
      REVIEW_INPUT,
      repository,
    );

    expect(result).toEqual(REVIEW);
    expect(spies.getReview).toHaveBeenCalledWith(REVIEW_INPUT);
  });

  it("stores an override only through the repository after scope authorization", async () => {
    const { client } = fakeAuthClient();
    const { repository, spies } = fakeRepository();
    const input: BillableOverrideInput = {
      systemhouseId: SYSTEMHOUSE_ID,
      customerId: CUSTOMER_ID,
      activitySourceId: "ACT-1",
      sourceRevision: 2,
      sourceHash: "hash-2",
      sourceBillable: true,
      effectiveBillable: false,
      note: "geprüft",
    };

    await executeSetPerformanceBillableOverride(client, USER_ID, input, repository);

    expect(spies.setBillableOverride).toHaveBeenCalledWith(input);
  });

  it("finalizes only through the repository request path", async () => {
    const { client } = fakeAuthClient();
    const { repository, spies } = fakeRepository();
    const input = {
      ...REVIEW_INPUT,
      requestId: REQUEST_ID,
      expectedReviewFingerprint: "a".repeat(64),
    };

    await expect(
      executeFinalizePerformanceStatement(client, USER_ID, input, repository),
    ).resolves.toEqual({ statementId: STATEMENT_ID });
    expect(spies.finalize).toHaveBeenCalledWith(input);
  });

  it("rejects replacement when the referenced statement is foreign", async () => {
    const { client } = fakeAuthClient();
    const foreign = { ...SNAPSHOT, customerId: FOREIGN_CUSTOMER_ID };
    const { repository, spies } = fakeRepository({
      getStatement: vi.fn(async () => foreign),
    });
    const input = {
      ...REVIEW_INPUT,
      requestId: REQUEST_ID,
      replacesStatementId: STATEMENT_ID,
      expectedReviewFingerprint: "a".repeat(64),
    };

    await expect(
      executeReplacePerformanceStatement(client, USER_ID, input, repository),
    ).rejects.toThrow(PERFORMANCE_STATEMENT_DENIED);
    expect(spies.replace).not.toHaveBeenCalled();
  });

  it("returns null for an unreadable statement without an existence leak", async () => {
    const { client } = fakeAuthClient();
    const { repository } = fakeRepository({
      getStatement: vi.fn(async () => null),
    });

    await expect(
      executeGetPerformanceStatement(client, USER_ID, STATEMENT_ID, repository),
    ).resolves.toBeNull();
  });
});

describe("BSF-03B server-function security wiring", () => {
  it("uses authenticated User-JWT middleware and no privileged client path", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/lib/performance-statement-runtime/performance-statement.functions.ts",
      ),
      "utf8",
    );

    expect(source).toContain("middleware([requireSupabaseAuth])");
    expect(source).toContain('"performance.statement.manage"');
    expect(source).not.toContain("client.server");
    expect(source).not.toContain("supabaseAdmin");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE");
    expect(source).not.toContain("service_role");
  });
});
