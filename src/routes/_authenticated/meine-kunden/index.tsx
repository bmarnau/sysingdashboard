import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listMyCustomersFn } from "@/lib/customer-data-runtime/my-customers.functions";
import { MyCustomersView, type MyCustomersState } from "@/components/customers/MyCustomersView";
import { CustomerPageShell } from "@/components/customers/CustomerPageShell";
import { logger } from "@/lib/logger";

/**
 * BSF-03 „Meine Kunden“ (Issue #105).
 * Liegt unter `_authenticated/` (Client-Gate). Daten kommen ausschließlich aus
 * `listMyCustomersFn` (User-JWT, RLS + `is_my_customer`); kein lokaler Store.
 */
export const Route = createFileRoute("/_authenticated/meine-kunden/")({
  head: () => ({
    meta: [
      { title: "Meine Kunden – Engineer Console" },
      {
        name: "description",
        content: "Kunden mit aktiver fachlicher Verantwortung und Lesezugriff.",
      },
    ],
  }),
  component: MyCustomersPage,
});

function MyCustomersPage() {
  const [state, setState] = useState<MyCustomersState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    listMyCustomersFn()
      .then((customers) => {
        if (!cancelled) setState({ kind: "ready", customers });
      })
      .catch((error: unknown) => {
        logger.warn("my-customers.list.failed", {
          message: String((error as Error)?.message ?? error).slice(0, 200),
        });
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CustomerPageShell>
      <MyCustomersView state={state} />
    </CustomerPageShell>
  );
}
