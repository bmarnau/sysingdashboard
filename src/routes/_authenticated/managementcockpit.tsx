import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CustomerPageShell } from "@/components/customers/CustomerPageShell";
import { ManagementCockpitAccess } from "@/components/management-cockpit/ManagementCockpitAccess";
import {
  ManagementCockpitView,
  type ManagementCockpitViewState,
} from "@/components/management-cockpit/ManagementCockpitView";
import { useRefreshSignal } from "@/hooks/useRefreshSignal";
import { readManagementCockpitFn } from "@/lib/management-cockpit-runtime/management-cockpit.functions";

export const Route = createFileRoute("/_authenticated/managementcockpit")({
  head: () => ({ meta: [{ title: "Managementcockpit – SysIng Dashboard" }] }),
  component: ManagementCockpitPage,
});

function ManagementCockpitPage() {
  return (
    <ManagementCockpitAccess
      fallback={<p role="alert">Keine Berechtigung für das Managementcockpit.</p>}
    >
      <CustomerPageShell sectionTitle="Managementcockpit">
        <CockpitRead />
      </CustomerPageShell>
    </ManagementCockpitAccess>
  );
}

// Erst innerhalb des Gates mounten: unberechtigte Rollen lösen keinen Read aus.
function CockpitRead() {
  const generation = useRefreshSignal();
  const [snapshot, setSnapshot] = useState<{
    generation: number;
    state: ManagementCockpitViewState;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    readManagementCockpitFn({ data: {} }).then(
      (result) => {
        if (!cancelled) setSnapshot({ generation, state: { kind: "ready", result } });
      },
      () => {
        if (!cancelled) setSnapshot({ generation, state: { kind: "unavailable" } });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [generation]);

  return (
    <ManagementCockpitView
      state={snapshot?.generation === generation ? snapshot.state : { kind: "loading" }}
    />
  );
}
