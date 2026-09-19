import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type {
  ProjectControllingFilters,
  ProjectControllingOutcome,
  ProjectControllingRepository,
  ProjectControllingScopeOption,
} from "@/lib/project-controlling/project-controlling-contract";
import { ProjectControllingService } from "@/lib/project-controlling/project-controlling";

export const PROJECT_CONTROLLING_DENIED = "Projektcontrolling für diesen Scope nicht zulässig.";

export const PROJECT_CONTROLLING_PERMISSION = "project.controlling.view";
const PROJECT_CONTROLLING_AUTHORIZATION_FAILED =
  "Projektcontrolling-Autorisierung konnte nicht geprüft werden.";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const uuid = z.string().uuid();
const sourceId = z.string().trim().min(1).max(255);

type UserSupabaseClient = SupabaseClient<Database>;

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

const requestSchema = z
  .object({
    from: isoDate,
    to: isoDate,
    billable: z.enum(["all", "billable", "nonBillable"]),
    systemhouseId: uuid.optional(),
    customerId: uuid.optional(),
    projectSourceId: sourceId.optional(),
    workPackageSourceId: sourceId.optional(),
    categoryKey: sourceId.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.customerId && !value.systemhouseId) {
      context.addIssue({
        code: "custom",
        path: ["customerId"],
        message: "Customer-Filter benötigt einen Systemhaus-Filter.",
      });
    }

    if (value.projectSourceId && (!value.systemhouseId || !value.customerId)) {
      context.addIssue({
        code: "custom",
        path: ["projectSourceId"],
        message: "Projekt-Filter benötigt Systemhaus und Customer.",
      });
    }

    if (
      value.workPackageSourceId &&
      (!value.systemhouseId || !value.customerId || !value.projectSourceId)
    ) {
      context.addIssue({
        code: "custom",
        path: ["workPackageSourceId"],
        message: "Arbeitspaket-Filter benötigt Systemhaus, Customer und Projekt.",
      });
    }

    if (value.categoryKey && !value.systemhouseId) {
      context.addIssue({
        code: "custom",
        path: ["categoryKey"],
        message: "Kategorie-Filter benötigt einen Systemhaus-Filter.",
      });
    }
  });

function hasRequestedProject(
  options: readonly ProjectControllingScopeOption[],
  filters: ProjectControllingFilters,
): boolean {
  if (!filters.projectSourceId) return true;

  return options.some(
    (option) =>
      option.kind === "project" &&
      option.systemhouseId === filters.systemhouseId &&
      option.customerId === filters.customerId &&
      option.projectSourceId === filters.projectSourceId,
  );
}

function hasRequestedWorkPackage(
  options: readonly ProjectControllingScopeOption[],
  filters: ProjectControllingFilters,
): boolean {
  if (!filters.workPackageSourceId) return true;

  return options.some(
    (option) =>
      option.kind === "workPackage" &&
      option.systemhouseId === filters.systemhouseId &&
      option.customerId === filters.customerId &&
      option.projectSourceId === filters.projectSourceId &&
      option.workPackageSourceId === filters.workPackageSourceId,
  );
}

function hasRequestedCategory(
  options: readonly ProjectControllingScopeOption[],
  filters: ProjectControllingFilters,
): boolean {
  if (!filters.categoryKey) return true;

  return options.some(
    (option) =>
      option.kind === "category" &&
      option.systemhouseId === filters.systemhouseId &&
      option.categoryKey === filters.categoryKey,
  );
}

export function parseProjectControllingRequest(input: unknown): ProjectControllingFilters {
  return requestSchema.parse(input);
}

export async function requireProjectControllingAccess(
  supabase: UserSupabaseClient,
  userId: string,
): Promise<void> {
  const [active, permission] = await Promise.all([
    supabase.rpc("is_account_active", { _user_id: userId }),
    supabase.rpc("has_permission", {
      _user_id: userId,
      _perm: PROJECT_CONTROLLING_PERMISSION,
    }),
  ]);

  if (active.error || permission.error) {
    throw new Error(PROJECT_CONTROLLING_AUTHORIZATION_FAILED);
  }
  if (active.data !== true || permission.data !== true) {
    throw new Error(PROJECT_CONTROLLING_DENIED);
  }
}

export async function executeProjectControllingRequest(
  supabase: UserSupabaseClient,
  userId: string,
  filters: ProjectControllingFilters,
  repository: ProjectControllingRepository,
): Promise<ProjectControllingOutcome> {
  await requireProjectControllingAccess(supabase, userId);

  if (filters.systemhouseId) {
    const membership = await supabase.rpc("has_active_systemhouse_membership", {
      _user_id: userId,
      _systemhouse_id: filters.systemhouseId,
    });

    if (membership.error) {
      throw new Error(PROJECT_CONTROLLING_AUTHORIZATION_FAILED);
    }
    if (membership.data !== true) {
      throw new Error(PROJECT_CONTROLLING_DENIED);
    }
  }

  if (filters.customerId && filters.systemhouseId) {
    const access = await supabase.rpc("has_customer_access", {
      _user_id: userId,
      _systemhouse_id: filters.systemhouseId,
      _customer_id: filters.customerId,
      _required_level: "read",
    });

    if (access.error) {
      throw new Error(PROJECT_CONTROLLING_AUTHORIZATION_FAILED);
    }
    if (access.data !== true) {
      throw new Error(PROJECT_CONTROLLING_DENIED);
    }
  }

  if (filters.projectSourceId || filters.workPackageSourceId || filters.categoryKey) {
    let scopeOptions: readonly ProjectControllingScopeOption[];
    try {
      scopeOptions = await repository.listScopeOptions(filters);
    } catch {
      throw new Error(PROJECT_CONTROLLING_AUTHORIZATION_FAILED);
    }

    if (
      !hasRequestedProject(scopeOptions, filters) ||
      !hasRequestedWorkPackage(scopeOptions, filters) ||
      !hasRequestedCategory(scopeOptions, filters)
    ) {
      throw new Error(PROJECT_CONTROLLING_DENIED);
    }
  }

  return new ProjectControllingService(repository).get(filters);
}

export const readProjectControllingFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseProjectControllingRequest(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<ProjectControllingOutcome> => {
    const supabase = context.supabase as UserSupabaseClient;
    const { createSupabaseProjectControllingRepository } =
      await import("@/integrations/supabase/project-controlling-adapter");
    const repository = createSupabaseProjectControllingRepository(supabase, context.userId);

    return executeProjectControllingRequest(supabase, context.userId, data, repository);
  });
