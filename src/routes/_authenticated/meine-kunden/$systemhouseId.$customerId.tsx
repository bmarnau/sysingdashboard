import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { readMyCustomerDetailFn } from "@/lib/customer-data-runtime/my-customers.functions";
import {
  CustomerDetailView,
  type CustomerDetailState,
} from "@/components/customers/CustomerDetailView";
import { CustomerPageShell } from "@/components/customers/CustomerPageShell";
import { logger } from "@/lib/logger";

const uuid = z.string().uuid();

/**
 * BSF-03 Kundendetail. Die Route trägt beide Scope-IDs
 * `(systemhouseId, customerId)`; eine Detailroute nur über `customerId` gibt
 * es bewusst nicht. Autorisierung und Datenzugriff laufen ausschließlich
 * serverseitig in `readMyCustomerDetailFn` (User-JWT, RLS, `is_my_customer`).
 * Ungültige oder fremde IDs führen fail-closed zu „Kunde nicht verfügbar“.
 */
export const Route = createFileRoute("/_authenticated/meine-kunden/$systemhouseId/$customerId")({
  head: () => ({
    meta: [
      { title: "Kunde – Meine Kunden – Engineer Console" },
      {
        name: "description",
        content: "Freigegebene Projekte, Arbeitspakete und Tätigkeiten eines Kunden (nur lesen).",
      },
    ],
  }),
  component: CustomerDetailPage,
});

const paramsSchema = z.object({ systemhouseId: uuid, customerId: uuid });

function CustomerDetailPage() {
  const { systemhouseId, customerId } = Route.useParams();
  const scope = useMemo(
    () => paramsSchema.safeParse({ systemhouseId, customerId }),
    [systemhouseId, customerId],
  );
  const [loaded, setLoaded] = useState<CustomerDetailState | null>(null);

  useEffect(() => {
    if (!scope.success) return;
    let cancelled = false;
    setLoaded(null);

    readMyCustomerDetailFn({ data: scope.data })
      .then((detail) => {
        if (!cancelled) setLoaded({ kind: "ready", detail });
      })
      .catch((error: unknown) => {
        const message = String((error as Error)?.message ?? error);
        logger.warn("my-customers.detail.failed", { message: message.slice(0, 200) });
        // Fehlende Zuordnung, unbekannte IDs und Berechtigungsfehler werden
        // einheitlich als „nicht verfügbar“ dargestellt (kein Datenleck).
        if (!cancelled) setLoaded({ kind: isDenial(message) ? "denied" : "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  // Ungültige IDs: kein Serveraufruf, sofort fail-closed.
  const state: CustomerDetailState = !scope.success
    ? { kind: "denied" }
    : (loaded ?? { kind: "loading" });

  return (
    <CustomerPageShell>
      <CustomerDetailView state={state} />
    </CustomerPageShell>
  );
}

function isDenial(message: string): boolean {
  return /Kein zulässiger Kunde|Berechtigung|Unauthorized|401|403/i.test(message);
}
