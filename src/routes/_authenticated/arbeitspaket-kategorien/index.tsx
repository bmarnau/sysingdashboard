import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CustomerPageShell } from "@/components/customers/CustomerPageShell";
import {
  WorkPackageCategoryManagementView,
  type WorkPackageCategoryManagementViewState,
} from "@/components/reference-data/WorkPackageCategoryManagementView";
import { usePermission } from "@/hooks/usePermission";
import {
  createWorkPackageCategoryFn,
  deactivateWorkPackageCategoryFn,
  listWorkPackageCategoryManagementFn,
  updateWorkPackageCategoryFn,
} from "@/lib/reference-data/workpackage-category.functions";
import { logger } from "@/lib/logger";

export const Route = createFileRoute("/_authenticated/arbeitspaket-kategorien/")({
  head: () => ({
    meta: [
      { title: "Arbeitspaket-Kategorien – Engineer Console" },
      {
        name: "description",
        content: "Systemhausweite Arbeitspaket-Kategorien verwalten.",
      },
    ],
  }),
  component: WorkPackageCategoryManagementPage,
});

function isDenial(message: string): boolean {
  return /nicht verfügbar|Berechtigung|Unauthorized|401|403/i.test(message);
}

function WorkPackageCategoryManagementPage() {
  const canManage = usePermission("referencedata.manage");
  const [state, setState] = useState<WorkPackageCategoryManagementViewState>({ kind: "loading" });

  const load = useCallback(async (systemhouseId?: string) => {
    setState({ kind: "loading" });
    try {
      const payload = await listWorkPackageCategoryManagementFn({
        data: systemhouseId ? { systemhouseId } : {},
      });
      setState({ kind: "ready", payload });
    } catch (error: unknown) {
      const message = String((error as Error)?.message ?? error);
      logger.warn("workpackage-category-management.list.failed", { message: message.slice(0, 200) });
      setState({ kind: isDenial(message) ? "denied" : "error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <CustomerPageShell sectionTitle="Arbeitspaket-Kategorien">
      <WorkPackageCategoryManagementView
        state={state}
        canManage={canManage}
        onSystemhouseChange={(systemhouseId) => void load(systemhouseId)}
        onCreate={async (input) => {
          await createWorkPackageCategoryFn({ data: input });
          await load(input.systemhouseId);
        }}
        onUpdate={async (input) => {
          await updateWorkPackageCategoryFn({ data: input });
          await load(input.systemhouseId);
        }}
        onDeactivate={async (input) => {
          await deactivateWorkPackageCategoryFn({ data: input });
          await load(input.systemhouseId);
        }}
      />
    </CustomerPageShell>
  );
}
