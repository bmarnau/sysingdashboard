/**
 * BSF-03 „Meine Kunden“ — reine Darstellung (Liste).
 *
 * Erhält bereits serverseitig autorisierte Kunden. Keine Fachlogik, kein
 * Datenzugriff, keine Schreibaktionen. Zustände: Laden, Fehler, leer, Liste.
 */
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Building2, ChevronRight, Users } from "lucide-react";
import type { MyCustomerSummary } from "@/lib/customer-data/my-customers";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/dashboard/primitives";
import { customerStatusText } from "./customer-status";
import { AccessLevelBadge, ResponsibilityBadge } from "./customer-badges";

export type MyCustomersState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; customers: MyCustomerSummary[] };

function CustomerStatusBadge({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        active
          ? "border-success/30 bg-success/15 text-success"
          : "border-border bg-muted text-muted-foreground"
      }`}
    >
      {customerStatusText(status)}
    </span>
  );
}

export function MyCustomersView({ state }: { state: MyCustomersState }) {
  return (
    <section aria-labelledby="my-customers-heading">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Kundenverantwortung
          </p>
          <h1
            id="my-customers-heading"
            className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Meine Kunden
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kunden, für die Sie fachlich verantwortlich sind und Lesezugriff besitzen.
          </p>
        </div>
      </div>

      {state.kind === "loading" && (
        <div role="status" aria-live="polite" aria-busy="true" className="grid gap-3">
          <span className="sr-only">Kunden werden geladen …</span>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {state.kind === "error" && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium">Kundenliste konnte nicht geladen werden.</p>
            <p className="text-muted-foreground">
              Bitte versuchen Sie es später erneut. Es werden keine Kundendaten angezeigt.
            </p>
          </div>
        </div>
      )}

      {state.kind === "ready" && state.customers.length === 0 && (
        <Card>
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Users className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">Keine zugeordneten Kunden</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Ihnen ist derzeit kein Kunde mit aktiver Verantwortung und Lesezugriff zugeordnet.
            </p>
          </div>
        </Card>
      )}

      {state.kind === "ready" && state.customers.length > 0 && (
        <Card>
          <ul aria-label="Meine Kunden" className="divide-y divide-border">
            {state.customers.map((customer) => (
              <li key={`${customer.systemhouseId}:${customer.customerId}`}>
                <Link
                  to="/meine-kunden/$systemhouseId/$customerId"
                  params={{
                    systemhouseId: customer.systemhouseId,
                    customerId: customer.customerId,
                  }}
                  className="flex items-center gap-4 px-4 py-4 transition hover:bg-secondary/50 focus-visible:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-6"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/40">
                    <Building2 className="size-5 text-primary" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{customer.name}</span>
                    <span className="block text-xs text-muted-foreground">Kunde öffnen</span>
                  </span>
                  <span className="flex flex-wrap items-center justify-end gap-1.5">
                    <CustomerStatusBadge status={customer.status} />
                    <ResponsibilityBadge status={customer.responsibilityStatus} />
                    <AccessLevelBadge level={customer.accessLevel} />
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
