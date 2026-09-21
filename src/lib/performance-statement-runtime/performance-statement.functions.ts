import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type {
  BillableOverrideInput,
  FinalizeInput,
  PerformanceStatementRepository,
  PerformanceStatementReview,
  PerformanceStatementSnapshot,
  ReplaceInput,
  ReviewInput,
  StatementScope,
} from "@/lib/performance-statement/performance-statement-contract";
import { validatePerformancePeriod } from "@/lib/performance-statement/performance-statement";

type UserSupabaseClient = SupabaseClient<Database>;

export const PERFORMANCE_STATEMENT_PERMISSION = "performance.statement.manage";
export const PERFORMANCE_STATEMENT_DENIED =
  "Leistungsnachweis für diesen Scope nicht zulässig.";
export const PERFORMANCE_STATEMENT_AUTHORIZATION_FAILED =
  "Leistungsnachweis-Autorisierung konnte nicht geprüft werden.";
export const PERFORMANCE_STATEMENT_OPERATION_FAILED =
  "Leistungsnachweis konnte nicht verarbeitet werden.";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const uuid = z.string().uuid();
const sourceId = z.string().trim().min(1).max(255);

function isCanonicalCalendarDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

const isoDate = z.string().refine(isCanonicalCalendarDate, {
  message: "Datum muss ein gültiges ISO-Kalenderdatum im Format YYYY-MM-DD sein.",
});

const reviewSchema = z
  .object({
    systemhouseId: uuid,
    customerId: uuid,
    periodStart: isoDate,
    periodEnd: isoDate,
  })
  .strict();

const overrideSchema = z
  .object({
    systemhouseId: uuid,
    customerId: uuid,
    activitySourceId: sourceId,
    sourceRevision: z.number().int().positive(),
    sourceHash: z.string().trim().min(1).max(512),
    sourceBillable: z.boolean(),
    effectiveBillable: z.boolean(),
    note: z.string().max(2_000).optional(),
  })
  .strict();

const finalizeSchema = reviewSchema
  .extend({
    requestId: uuid,
    expectedReviewFingerprint: z.string().regex(SHA256_PATTERN),
  })
  .strict();

const replaceSchema = finalizeSchema
  .extend({
    replacesStatementId: uuid,
  })
  .strict();

const statementIdSchema = z
  .object({
    statementId: uuid,
  })
  .strict();

const statementScopeSchema = z
  .object({
    systemhouseId: uuid,
    customerId: uuid.optional(),
    periodStart: isoDate.optional(),
    periodEnd: isoDate.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (Boolean(value.periodStart) !== Boolean(value.periodEnd)) {
      context.addIssue({
        code: "custom",
        path: ["periodStart"],
        message: "Historienfilter benötigt periodStart und periodEnd gemeinsam.",
      });
    }
  });

function validatePeriod<T extends ReviewInput>(input: T): T {
  validatePerformancePeriod(input.periodStart, input.periodEnd);
  return input;
}

export function parsePerformanceReviewInput(input: unknown): ReviewInput {
  return validatePeriod(reviewSchema.parse(input));
}

export function parsePerformanceBillableOverrideInput(input: unknown): BillableOverrideInput {
  return overrideSchema.parse(input);
}

export function parsePerformanceFinalizeInput(input: unknown): FinalizeInput {
  return validatePeriod(finalizeSchema.parse(input));
}

export function parsePerformanceReplaceInput(input: unknown): ReplaceInput {
  return validatePeriod(replaceSchema.parse(input));
}

export function parsePerformanceStatementScope(input: unknown): StatementScope {
  const value = statementScopeSchema.parse(input);
  if (value.periodStart && value.periodEnd) {
    validatePerformancePeriod(value.periodStart, value.periodEnd);
  }
  return value;
}

async function requireBaseAccess(
  supabase: UserSupabaseClient,
  userId: string,
): Promise<void> {
  const [active, permission] = await Promise.all([
    supabase.rpc("is_account_active", { _user_id: userId }),
    supabase.rpc("has_permission", {
      _user_id: userId,
      _perm: PERFORMANCE_STATEMENT_PERMISSION,
    }),
  ]);

  if (active.error || permission.error) {
    throw new Error(PERFORMANCE_STATEMENT_AUTHORIZATION_FAILED);
  }

  if (active.data !== true || permission.data !== true) {
    throw new Error(PERFORMANCE_STATEMENT_DENIED);
  }
}

async function requireScopeAccess(
  supabase: UserSupabaseClient,
  userId: string,
  scope: { systemhouseId: string; customerId?: string },
): Promise<void> {
  const membership = await supabase.rpc("has_active_systemhouse_membership", {
    _user_id: userId,
    _systemhouse_id: scope.systemhouseId,
  });

  if (membership.error) {
    throw new Error(PERFORMANCE_STATEMENT_AUTHORIZATION_FAILED);
  }
  if (membership.data !== true) {
    throw new Error(PERFORMANCE_STATEMENT_DENIED);
  }

  if (!scope.customerId) return;

  const access = await supabase.rpc("has_customer_access", {
    _user_id: userId,
    _systemhouse_id: scope.systemhouseId,
    _customer_id: scope.customerId,
    _required_level: "read",
  });

  if (access.error) {
    throw new Error(PERFORMANCE_STATEMENT_AUTHORIZATION_FAILED);
  }
  if (access.data !== true) {
    throw new Error(PERFORMANCE_STATEMENT_DENIED);
  }
}

export async function requirePerformanceStatementAccess(
  supabase: UserSupabaseClient,
  userId: string,
  scope?: { systemhouseId: string; customerId?: string },
): Promise<void> {
  await requireBaseAccess(supabase, userId);
  if (scope) await requireScopeAccess(supabase, userId, scope);
}

export async function executeGetPerformanceStatementReview(
  supabase: UserSupabaseClient,
  userId: string,
  input: ReviewInput,
  repository: PerformanceStatementRepository,
): Promise<PerformanceStatementReview> {
  await requirePerformanceStatementAccess(supabase, userId, input);

  try {
    return await repository.getReview(input);
  } catch {
    throw new Error(PERFORMANCE_STATEMENT_OPERATION_FAILED);
  }
}

export async function executeSetPerformanceBillableOverride(
  supabase: UserSupabaseClient,
  userId: string,
  input: BillableOverrideInput,
  repository: PerformanceStatementRepository,
): Promise<void> {
  await requirePerformanceStatementAccess(supabase, userId, input);

  try {
    await repository.setBillableOverride(input);
  } catch {
    throw new Error(PERFORMANCE_STATEMENT_DENIED);
  }
}

export async function executeFinalizePerformanceStatement(
  supabase: UserSupabaseClient,
  userId: string,
  input: FinalizeInput,
  repository: PerformanceStatementRepository,
): Promise<{ statementId: string }> {
  await requirePerformanceStatementAccess(supabase, userId, input);

  try {
    return await repository.finalize(input);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "PERFORMANCE_STATEMENT_STALE_REVIEW" ||
        error.message === "PERFORMANCE_STATEMENT_CLAIM_CONFLICT")
    ) {
      throw error;
    }
    throw new Error(PERFORMANCE_STATEMENT_OPERATION_FAILED);
  }
}

export async function executeReplacePerformanceStatement(
  supabase: UserSupabaseClient,
  userId: string,
  input: ReplaceInput,
  repository: PerformanceStatementRepository,
): Promise<{ statementId: string }> {
  await requirePerformanceStatementAccess(supabase, userId, input);

  let current: PerformanceStatementSnapshot | null;
  try {
    current = await repository.getStatement(input.replacesStatementId);
  } catch {
    throw new Error(PERFORMANCE_STATEMENT_DENIED);
  }

  if (
    !current ||
    current.systemhouseId !== input.systemhouseId ||
    current.customerId !== input.customerId ||
    current.periodStart !== input.periodStart ||
    current.periodEnd !== input.periodEnd ||
    current.status !== "finalized" ||
    current.supersededByStatementId !== null
  ) {
    throw new Error(PERFORMANCE_STATEMENT_DENIED);
  }

  try {
    return await repository.replace(input);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "PERFORMANCE_STATEMENT_STALE_REVIEW" ||
        error.message === "PERFORMANCE_STATEMENT_CLAIM_CONFLICT")
    ) {
      throw error;
    }
    throw new Error(PERFORMANCE_STATEMENT_OPERATION_FAILED);
  }
}

export async function executeGetPerformanceStatement(
  supabase: UserSupabaseClient,
  userId: string,
  statementId: string,
  repository: PerformanceStatementRepository,
): Promise<PerformanceStatementSnapshot | null> {
  await requirePerformanceStatementAccess(supabase, userId);

  let statement: PerformanceStatementSnapshot | null;
  try {
    statement = await repository.getStatement(statementId);
  } catch {
    throw new Error(PERFORMANCE_STATEMENT_OPERATION_FAILED);
  }

  if (!statement) return null;

  await requireScopeAccess(supabase, userId, {
    systemhouseId: statement.systemhouseId,
    customerId: statement.customerId,
  });

  return statement;
}

export async function executeListPerformanceStatements(
  supabase: UserSupabaseClient,
  userId: string,
  scope: StatementScope,
  repository: PerformanceStatementRepository,
): Promise<PerformanceStatementSnapshot[]> {
  await requirePerformanceStatementAccess(supabase, userId, scope);

  try {
    return await repository.listStatements(scope);
  } catch {
    throw new Error(PERFORMANCE_STATEMENT_OPERATION_FAILED);
  }
}

async function createRepository(
  supabase: UserSupabaseClient,
): Promise<PerformanceStatementRepository> {
  const { createSupabasePerformanceStatementRepository } =
    await import("@/integrations/supabase/performance-statement-adapter");
  return createSupabasePerformanceStatementRepository(supabase);
}

export const getPerformanceStatementReviewFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => parsePerformanceReviewInput(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<PerformanceStatementReview> => {
    const supabase = context.supabase as UserSupabaseClient;
    const repository = await createRepository(supabase);
    return executeGetPerformanceStatementReview(supabase, context.userId, data, repository);
  });

export const setPerformanceBillableOverrideFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => parsePerformanceBillableOverrideInput(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const supabase = context.supabase as UserSupabaseClient;
    const repository = await createRepository(supabase);
    await executeSetPerformanceBillableOverride(supabase, context.userId, data, repository);
    return { ok: true };
  });

export const finalizePerformanceStatementFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => parsePerformanceFinalizeInput(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ statementId: string }> => {
    const supabase = context.supabase as UserSupabaseClient;
    const repository = await createRepository(supabase);
    return executeFinalizePerformanceStatement(supabase, context.userId, data, repository);
  });

export const replacePerformanceStatementFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => parsePerformanceReplaceInput(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ statementId: string }> => {
    const supabase = context.supabase as UserSupabaseClient;
    const repository = await createRepository(supabase);
    return executeReplacePerformanceStatement(supabase, context.userId, data, repository);
  });

export const getPerformanceStatementFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => statementIdSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<PerformanceStatementSnapshot | null> => {
    const supabase = context.supabase as UserSupabaseClient;
    const repository = await createRepository(supabase);
    return executeGetPerformanceStatement(
      supabase,
      context.userId,
      data.statementId,
      repository,
    );
  });

export const listPerformanceStatementsFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => parsePerformanceStatementScope(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<PerformanceStatementSnapshot[]> => {
    const supabase = context.supabase as UserSupabaseClient;
    const repository = await createRepository(supabase);
    return executeListPerformanceStatements(supabase, context.userId, data, repository);
  });
