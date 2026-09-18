import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CustomerPageShell } from "@/components/customers/CustomerPageShell";
import { PermissionGate } from "@/components/PermissionGate";
import {
  ProjectControllingView,
  type ProjectControllingViewState,
} from "@/components/project-controlling/ProjectControllingView";
import { readProjectControllingFn } from "@/lib/project-controlling-runtime/project-controlling.functions";
import type { ProjectControllingFilters } from "@/lib/project-controlling/project-controlling-contract";
import { logger } from "@/lib/logger";

export const Route = createFileRoute("/_authenticated/projektcontrolling")({
  head: () => ({
    meta: [
      { title: "Projektcontrolling – Engineer Console" },
      {
        name: "description",
        content: "Read-only Projektcontrolling für berechtigte Leitungsrollen.",
      },
    ],
  }),
  component: ProjectControllingPage,
});

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthFilters(): ProjectControllingFilters {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    from: localIsoDate(monthStart),
    to: localIsoDate(today),
    billable: "all",
  };
}

function ProjectControllingPage() {
  const [filters, setFilters] = useState<ProjectControllingFilters>(currentMonthFilters);
  const [state, setState] = useState<ProjectControllingViewState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });

    readProjectControllingFn({ data: filters })
      .then((outcome) => {
        if (cancelled) return;
        setState(outcome.ok ? { kind: "ready", result: outcome.value } : { kind: "error" });
      })
      .catch((error: unknown) => {
        logger.warn("project-controlling.read.failed", {
          message: String((error as Error)?.message ?? error).slice(0, 200),
        });
        if (!cancelled) setState({ kind: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [filters]);

  return (
    <PermissionGate permission="project.controlling.view">
      <CustomerPageShell sectionTitle="Projektcontrolling">
        <ProjectControllingView state={state} onFiltersChange={setFilters} />
      </CustomerPageShell>
    </PermissionGate>
  );
}
