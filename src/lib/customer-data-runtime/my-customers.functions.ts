import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  listMyCustomers,
  type MyCustomerDetail,
  type MyCustomerSummary,
} from "@/lib/customer-data/my-customers";
import { readSharedCustomerProjection } from "@/lib/customer-data/shared-projection-runtime";

const uuid = z.string().uuid();

const detailSchema = z.object({
  systemhouseId: uuid,
  customerId: uuid,
});

type UserSupabaseClient = SupabaseClient<Database>;

/** Einheitliche, datenfreie Ablehnung — verrät nicht, ob der Scope existiert. */
const DENIED = "Kein zulässiger Kunde für diesen Benutzer.";

async function assertDashboardView(supabase: UserSupabaseClient, userId: string): Promise<void> {
  const { data, error } = await supabase.rpc("has_permission", {
    _user_id: userId,
    _perm: "dashboard.view",
  });
  if (error) throw new Error("Berechtigungsprüfung konnte nicht ausgeführt werden.");
  if (data !== true) throw new Error("Erforderliche Fachberechtigung fehlt.");
}

/**
 * BSF-03 „Meine Kunden“ — Liste.
 *
 * Browser -> Serverfunktion -> Supabase im selben User-JWT -> Grants + RLS.
 * Identität stammt ausschließlich aus dem validierten Bearer-Token
 * (`context.userId`); Client-Claims oder UI-Rollen spielen keine Rolle.
 * Kein privilegierter Client, keine Service Role.
 */
export const listMyCustomersFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyCustomerSummary[]> => {
    const supabase = context.supabase as UserSupabaseClient;
    await assertDashboardView(supabase, context.userId);

    const { createSupabaseMyCustomersRepository } =
      await import("@/integrations/supabase/my-customers-adapter");
    return listMyCustomers(createSupabaseMyCustomersRepository(supabase), context.userId);
  });

/**
 * BSF-03 Kundendetail: Kundenkopf + aktive Shared Projections
 * (Projekt -> Arbeitspaket -> Tätigkeit) für genau `(systemhouseId, customerId)`.
 *
 * Fail-closed: Ohne bestätigte DB-Schnittmenge (`is_my_customer`) wird
 * dieselbe generische Ablehnung geliefert wie für unbekannte IDs — keine
 * Existenzaussage über fremde Customer. Der Read der Projections läuft über
 * den bestehenden providerneutralen Shared-Projection-Pfad; RLS bleibt die
 * maßgebliche Zeilengrenze.
 */
export const readMyCustomerDetailFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => detailSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<MyCustomerDetail> => {
    const supabase = context.supabase as UserSupabaseClient;
    await assertDashboardView(supabase, context.userId);

    const [{ createSupabaseMyCustomersRepository }, { createSupabaseSharedProjectionRepository }] =
      await Promise.all([
        import("@/integrations/supabase/my-customers-adapter"),
        import("@/integrations/supabase/shared-projection-adapter"),
      ]);
    const customers = createSupabaseMyCustomersRepository(supabase);

    const allowed = await customers.isMyCustomer({
      userId: context.userId,
      systemhouseId: data.systemhouseId,
      customerId: data.customerId,
    });
    if (!allowed) throw new Error(DENIED);

    const scope = { userId: context.userId, ...data };
    const [customer, responsibility, accessLevel, displayName] = await Promise.all([
      customers.readCustomer(data),
      customers.readOwnResponsibility(scope),
      customers.readOwnAccessLevel(scope),
      customers.readOwnDisplayName(context.userId),
    ]);
    // Fail-closed: jede fehlende Teilbedingung liefert dieselbe generische Ablehnung.
    if (!customer || !responsibility || !accessLevel) throw new Error(DENIED);

    const projection = await readSharedCustomerProjection(
      createSupabaseSharedProjectionRepository(supabase),
      data,
    );

    return {
      customer: {
        systemhouseId: data.systemhouseId,
        customerId: data.customerId,
        name: customer.name,
        status: customer.status,
        responsibilityStatus: responsibility.status,
        responsibleSince: responsibility.validFrom,
        accessLevel,
      },
      responsible: { userId: context.userId, displayName: displayName ?? "Sie" },
      projection,
    };
  });
