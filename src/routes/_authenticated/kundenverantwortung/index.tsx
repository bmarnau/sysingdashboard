import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  endCustomerResponsibilityFn,
  listResponsibilityCandidatesFn,
  listResponsibilityManagementFn,
  setCustomerResponsibilityFn,
} from "@/lib/customer-data-runtime/customer-responsibility-management.functions";
import {
  CustomerResponsibilityManagementView,
  type ResponsibilityManagementViewState,
} from "@/components/customers/CustomerResponsibilityManagementView";
import { CustomerPageShell } from "@/components/customers/CustomerPageShell";
import { logger } from "@/lib/logger";

export const Route = createFileRoute("/_authenticated/kundenverantwortung/")({
  head: () => ({
    meta: [
      { title: "Kundenverantwortung – Engineer Console" },
      {
        name: "description",
        content: "Primäre Kundenverantwortung im eigenen Systemhaus verwalten.",
      },
    ],
  }),
  component: CustomerResponsibilityManagementPage,
});

function isDenial(message: string): boolean {
  return /Kundenverantwortung.*nicht verfügbar|manage_denied|Berechtigung|Unauthorized|401|403/i.test(
    message,
  );
}

function CustomerResponsibilityManagementPage() {
  const [state, setState] = useState<ResponsibilityManagementViewState>({ kind: "loading" });

  const load = useCallback(async (systemhouseId?: string) => {
    setState({ kind: "loading" });
    try {
      const payload = await listResponsibilityManagementFn({
        data: systemhouseId ? { systemhouseId } : {},
      });
      setState({ kind: "ready", payload });
    } catch (error: unknown) {
      const message = String((error as Error)?.message ?? error);
      logger.warn("customer-responsibility-management.list.failed", {
        message: message.slice(0, 200),
      });
      setState({ kind: isDenial(message) ? "denied" : "error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedSystemhouseId =
    state.kind === "ready" ? state.payload.selectedSystemhouseId : null;

  return (
    <CustomerPageShell>
      <CustomerResponsibilityManagementView
        state={state}
        onSystemhouseChange={(systemhouseId) => void load(systemhouseId)}
        loadCandidates={async (systemhouseId) =>
          listResponsibilityCandidatesFn({ data: { systemhouseId } })
        }
        onAssign={async (input) => {
          await setCustomerResponsibilityFn({ data: input });
          await load(input.systemhouseId);
        }}
        onEnd={async (input) => {
          await endCustomerResponsibilityFn({ data: input });
          await load(input.systemhouseId ?? selectedSystemhouseId ?? undefined);
        }}
      />
    </CustomerPageShell>
  );
}
