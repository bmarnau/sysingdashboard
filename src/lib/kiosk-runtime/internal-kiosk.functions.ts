import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { mapInternalKioskSnapshot } from "@/lib/kiosk/internal-kiosk-snapshot";
import type { InternalKioskSnapshotProjection } from "@/lib/kiosk/internal-kiosk-snapshot";
import type {
  ProjectControllingFilters,
  ProjectControllingRepository,
} from "@/lib/project-controlling/project-controlling-contract";
import {
  PROJECT_CONTROLLING_DENIED,
  executeProjectControllingRequest,
  requireProjectControllingAccess,
} from "@/lib/project-controlling-runtime/project-controlling.functions";

type UserSupabaseClient = SupabaseClient<Database>;

export const INTERNAL_KIOSK_SCOPE_REQUIRED =
  "Für den internen Kiosk muss ein Systemhaus ausgewählt werden.";
export const INTERNAL_KIOSK_READ_FAILED = "Interne Kiosk-Daten konnten nicht gelesen werden.";

const requestSchema = z
  .object({
    systemhouseId: z.string().uuid().optional(),
  })
  .strict();

export type InternalKioskSnapshotOutcome =
  | { ok: true; value: InternalKioskSnapshotProjection }
  | { ok: false; error: "INTERNAL_KIOSK_SCOPE_REQUIRED" | "INTERNAL_KIOSK_DATA_UNAVAILABLE" };

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentMonthInternalKioskFilters(
  now: Date,
  systemhouseId?: string,
): ProjectControllingFilters {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    from: localIsoDate(monthStart),
    to: localIsoDate(now),
    billable: "all",
    systemhouseId,
  };
}

async function resolveSystemhouseId(
  repository: ProjectControllingRepository,
  filters: ProjectControllingFilters,
  requestedSystemhouseId?: string,
): Promise<string | null> {
  const options = await repository.listScopeOptions(filters);
  const allowed = [
    ...new Set(
      options
        .filter((option) => option.kind === "systemhouse")
        .map((option) => option.systemhouseId),
    ),
  ];

  if (requestedSystemhouseId) {
    if (!allowed.includes(requestedSystemhouseId)) {
      throw new Error(PROJECT_CONTROLLING_DENIED);
    }
    return requestedSystemhouseId;
  }

  if (allowed.length === 1) return allowed[0];
  if (allowed.length > 1) return null;
  throw new Error(PROJECT_CONTROLLING_DENIED);
}

export async function executeInternalKioskSnapshotRequest(
  supabase: UserSupabaseClient,
  userId: string,
  requestedSystemhouseId: string | undefined,
  repository: ProjectControllingRepository,
  now = new Date(),
): Promise<InternalKioskSnapshotOutcome> {
  await requireProjectControllingAccess(supabase, userId);

  const baseFilters = currentMonthInternalKioskFilters(now);
  let systemhouseId: string | null;
  try {
    systemhouseId = await resolveSystemhouseId(repository, baseFilters, requestedSystemhouseId);
  } catch (error) {
    if (error instanceof Error && error.message === PROJECT_CONTROLLING_DENIED) throw error;
    throw new Error(INTERNAL_KIOSK_READ_FAILED);
  }

  if (!systemhouseId) {
    return { ok: false, error: "INTERNAL_KIOSK_SCOPE_REQUIRED" };
  }

  try {
    const outcome = await executeProjectControllingRequest(
      supabase,
      userId,
      currentMonthInternalKioskFilters(now, systemhouseId),
      repository,
    );

    if (!outcome.ok) {
      return { ok: false, error: "INTERNAL_KIOSK_DATA_UNAVAILABLE" };
    }

    return { ok: true, value: mapInternalKioskSnapshot(outcome.value) };
  } catch (error) {
    if (error instanceof Error && error.message === PROJECT_CONTROLLING_DENIED) {
      throw error;
    }
    return { ok: false, error: "INTERNAL_KIOSK_DATA_UNAVAILABLE" };
  }
}

export const readInternalKioskSnapshotFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => requestSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<InternalKioskSnapshotOutcome> => {
    const supabase = context.supabase as UserSupabaseClient;
    const { createSupabaseProjectControllingRepository } =
      await import("@/integrations/supabase/project-controlling-adapter");
    const repository = createSupabaseProjectControllingRepository(supabase, context.userId);

    return executeInternalKioskSnapshotRequest(
      supabase,
      context.userId,
      data.systemhouseId,
      repository,
    );
  });
