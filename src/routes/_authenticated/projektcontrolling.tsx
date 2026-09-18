import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CustomerPageShell } from "@/components/customers/CustomerPageShell";
import { PermissionGate } from "@/components/PermissionGate";
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
  const filters = useMemo(currentMonthFilters, []);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    readProjectControllingFn({ data: filters })
      .then((outcome) => {
        if (!cancelled) setState(outcome.ok ? "ready" : "error");
      })
      .catch((error: unknown) => {
        logger.warn("project-controlling.read.failed", {
          message: String((error as Error)?.message ?? error).slice(0, 200),
        });
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [filters]);

  return (
    <PermissionGate permission="project.controlling.view">
      <CustomerPageShell sectionTitle="Projektcontrolling">
        <section aria-labelledby="project-controlling-title" className="space-y-4">
          <div>
            <p className="text-sm font-medium text-primary">BSF-03A</p>
            <h1 id="project-controlling-title" className="text-2xl font-semibold tracking-tight">
              Projektcontrolling
            </h1>
          </div>
          {state === "loading" && (
            <p role="status" className="text-sm text-muted-foreground">
              Controlling-Daten werden geladen …
            </p>
          )}
          {state === "ready" && (
            <p className="text-sm text-muted-foreground">
              Die read-only Controlling-Sicht wird vorbereitet.
            </p>
          )}
          {state === "error" && (
            <p role="alert" className="text-sm text-destructive">
              Projektcontrolling konnte nicht geladen werden.
            </p>
          )}
        </section>
      </CustomerPageShell>
    </PermissionGate>
  );
}
