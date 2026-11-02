/**
 * L2 / P2 — Server-Lesepfad des Management-Cockpits.
 *
 * Browser -> Serverfunktion -> Supabase im selben User-JWT -> Grants + RLS.
 * Identität, Rollen/Capabilities, Kundenkreis und Stichtag stammen ausschließlich vom Server;
 * die Anfrage ist leer (`strict`). Kein privilegierter Client, keine Service Role, keine Schreibzugriffe.
 * Der Pfad liest nur über die vorhandenen Read-Modelle und übergibt sie an den reinen Composer (P1).
 * Teilausfälle werden je Quelle als Datenzustand gemeldet, nie als Rohfehler oder als 0 (L2-R5, L2-03).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { berlinDate, WorkPackageWorkViewService } from "@/lib/avkk/work-package-work-view";
import type { WorkPackageWorkViewRepository } from "@/lib/avkk/work-package-work-view.types";
import { listMyCustomers, type MyCustomersRepository } from "@/lib/customer-data/my-customers";
import { cockpitScopeKey, composeManagementCockpit } from "@/lib/management-cockpit/compose";
import type {
  AvkkCustomerSignal,
  CockpitResult,
  SourceResult,
} from "@/lib/management-cockpit/types";
import { ProjectControllingService } from "@/lib/project-controlling/project-controlling";
import type { ProjectControllingRepository } from "@/lib/project-controlling/project-controlling-contract";

type UserSupabaseClient = SupabaseClient<Database>;

export const MANAGEMENT_COCKPIT_AUTHORIZATION_FAILED =
  "Management-Cockpit-Autorisierung konnte nicht geprüft werden.";

/** Capability-Vertrag unverändert (BSF-07 §4): keine pauschale `managementcockpit.view`. */
const PERM_ACTIVE_PORTFOLIO = "dashboard.view";
const PERM_CONTROLLING = "project.controlling.view";
const PERM_MANAGEMENT = "avkk.management.view";

/** Fester Betrachtungszeitraum des Projektcontrollings (inklusive Stichtag). */
export const COCKPIT_CONTROLLING_WINDOW_DAYS = 90;
const DAY_MS = 86_400_000;

const requestSchema = z.object({}).strict();

export function parseManagementCockpitRequest(input: unknown): Record<never, never> {
  return requestSchema.parse(input);
}

/**
 * Server-Lesepfad für AVKK-Befunde je Kunde. Es gibt ihn noch nicht (AVKK-Führungsdaten werden bisher
 * nur im Browser geladen); fehlt der Provider, meldet das Cockpit AVKK als UNAVAILABLE.
 */
export interface AvkkSignalRepository {
  listCustomerSignals(): Promise<readonly AvkkCustomerSignal[]>;
}

export interface ManagementCockpitDeps {
  customers: MyCustomersRepository;
  controlling: ProjectControllingRepository;
  workPackages: WorkPackageWorkViewRepository;
  avkk?: AvkkSignalRepository;
}

function windowStart(asOfDate: string): string {
  const [year, month, day] = asOfDate.split("-").map(Number);
  const start = Date.UTC(year, month - 1, day) - (COCKPIT_CONTROLLING_WINDOW_DAYS - 1) * DAY_MS;
  return new Date(start).toISOString().slice(0, 10);
}

async function readSource<T>(
  read: () => Promise<readonly T[]>,
): Promise<SourceResult<readonly T[]>> {
  try {
    const value = await read();
    return { state: value.length === 0 ? "EMPTY" : "AVAILABLE", value };
  } catch {
    // Kein Rohtext an den Client: der Zustand genügt (L2-03, L2-R5).
    return { state: "UNAVAILABLE" };
  }
}

async function checkCapabilities(supabase: UserSupabaseClient, userId: string) {
  const permission = (perm: string) =>
    supabase.rpc("has_permission", { _user_id: userId, _perm: perm });
  const [active, portfolio, controlling, management] = await Promise.all([
    supabase.rpc("is_account_active", { _user_id: userId }),
    permission(PERM_ACTIVE_PORTFOLIO),
    permission(PERM_CONTROLLING),
    permission(PERM_MANAGEMENT),
  ]);
  if (active.error || portfolio.error || controlling.error || management.error) {
    throw new Error(MANAGEMENT_COCKPIT_AUTHORIZATION_FAILED);
  }
  const usable = active.data === true && portfolio.data === true;
  return {
    controlling: usable && controlling.data === true,
    management: usable && management.data === true,
  };
}

export async function executeManagementCockpitRequest(
  supabase: UserSupabaseClient,
  userId: string,
  deps: ManagementCockpitDeps,
  referenceInstant: string,
): Promise<CockpitResult> {
  const asOfDate = berlinDate(referenceInstant);
  const granted = await checkCapabilities(supabase, userId);
  const capabilities = {
    controlling: granted.controlling,
    avkkManagement: granted.management,
    // Die Arbeitssicht verlangt serverseitig `avkk.management.view` (WORK_PACKAGE_WORK_VIEW_PERMISSION).
    workView: granted.management,
  };

  const unavailable: { state: "UNAVAILABLE" } = { state: "UNAVAILABLE" };
  if (!capabilities.controlling && !capabilities.avkkManagement) {
    return composeManagementCockpit({
      asOfDate,
      capabilities,
      authorizedCustomers: new Set(),
      controlling: unavailable,
      workPackages: unavailable,
      avkk: unavailable,
    });
  }

  // Kundenkreis: RLS-gefiltert und einzeln über `is_my_customer` bestätigt (fail-closed).
  let authorizedCustomers: Set<string>;
  try {
    const mine = await listMyCustomers(deps.customers, userId);
    authorizedCustomers = new Set(mine.map((c) => cockpitScopeKey(c.systemhouseId, c.customerId)));
  } catch {
    return composeManagementCockpit({
      asOfDate,
      capabilities,
      authorizedCustomers: new Set(),
      controlling: unavailable,
      workPackages: unavailable,
      avkk: unavailable,
    });
  }

  const [controllingResult, workPackagesResult, avkkResult] = await Promise.all([
    capabilities.controlling
      ? readSource(async () => {
          const outcome = await new ProjectControllingService(deps.controlling).get({
            from: windowStart(asOfDate),
            to: asOfDate,
            billable: "all",
          });
          if (!outcome.ok) throw new Error(outcome.error);
          return outcome.value.rows;
        })
      : Promise.resolve(unavailable),
    capabilities.workView
      ? readSource(() => new WorkPackageWorkViewService(deps.workPackages).list(referenceInstant))
      : Promise.resolve(unavailable),
    capabilities.avkkManagement && deps.avkk
      ? readSource(() => deps.avkk!.listCustomerSignals())
      : Promise.resolve(unavailable),
  ]);

  return composeManagementCockpit({
    asOfDate,
    capabilities,
    authorizedCustomers,
    controlling: controllingResult,
    workPackages: workPackagesResult,
    avkk: avkkResult,
  });
}

export const readManagementCockpitFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseManagementCockpitRequest(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CockpitResult> => {
    const supabase = context.supabase as UserSupabaseClient;
    const [
      { createSupabaseMyCustomersRepository },
      { createSupabaseProjectControllingRepository },
      { createSupabaseWorkPackageWorkViewRepository },
    ] = await Promise.all([
      import("@/integrations/supabase/my-customers-adapter"),
      import("@/integrations/supabase/project-controlling-adapter"),
      import("@/integrations/supabase/work-package-work-view-adapter"),
    ]);

    return executeManagementCockpitRequest(
      supabase,
      context.userId,
      {
        customers: createSupabaseMyCustomersRepository(supabase),
        controlling: createSupabaseProjectControllingRepository(supabase, context.userId),
        workPackages: createSupabaseWorkPackageWorkViewRepository(supabase),
        // AVKK: noch kein Server-Lesepfad (siehe AvkkSignalRepository) -> Zustand UNAVAILABLE.
      },
      new Date().toISOString(),
    );
  });
