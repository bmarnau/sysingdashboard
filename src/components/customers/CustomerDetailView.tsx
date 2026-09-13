/**
 * BSF-03 Kundendetail — reine Darstellung (read-only).
 *
 * Zeigt Kundenkopf und die Hierarchie Projekt -> Arbeitspaket -> Tätigkeit aus
 * dem bereits serverseitig autorisierten Shared-Projection-Snapshot. Keine
 * Editier-, Lösch- oder Zuweisungsfunktionen.
 */
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Clock, FolderKanban, Layers, ShieldOff } from "lucide-react";
import type { MyCustomerDetail, WorkPackageNode } from "@/lib/customer-data/my-customers";
import { buildCustomerProjectionTree } from "@/lib/customer-data/my-customers";
import type {
  SharedActivityRecord,
  SharedProjectRecord,
} from "@/lib/customer-data/shared-projection-runtime";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/dashboard/primitives";
import { fmtDate } from "@/components/dashboard/formatters";
import {
  billingLabel,
  billingStyles,
  priorityStyles,
  projectStatusLabel,
  projectStatusStyles,
  wpStatusLabel,
  wpStatusStyles,
} from "@/components/dashboard/constants";
import { customerStatusText } from "./customer-status";
import { AccessLevelBadge, ResponsibilityBadge } from "./customer-badges";

export type CustomerDetailState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "denied" }
  | { kind: "ready"; detail: MyCustomerDetail };

function label<K extends string>(map: Record<K, string>, key: string): string {
  return (map as Record<string, string>)[key] ?? key;
}
function style<K extends string>(map: Record<K, string>, key: string): string {
  return (map as Record<string, string>)[key] ?? "bg-muted text-muted-foreground border-border";
}

function Chip({ className, children }: { className: string; children: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function BackLink() {
  return (
    <Link
      to="/meine-kunden"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> Zurück zu Meine Kunden
    </Link>
  );
}

function ActivityRow({ activity }: { activity: SharedActivityRecord }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm">
      <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{activity.title}</span>
      <span className="text-xs text-muted-foreground">{fmtDate(activity.date)}</span>
      <span className="font-mono text-xs">{activity.duration.toFixed(1)} h</span>
      <Chip className={style(billingStyles, activity.billingStatus)}>
        {activity.billable
          ? label(billingLabel, activity.billingStatus)
          : label(billingLabel, "nicht_abrechenbar")}
      </Chip>
    </li>
  );
}

function WorkPackageBlock({ node }: { node: WorkPackageNode }) {
  const { workPackage, activities } = node;
  return (
    <li className="rounded-xl border border-border bg-secondary/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Layers className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <h4 className="min-w-0 flex-1 truncate font-medium">{workPackage.title}</h4>
        <Chip className={style(wpStatusStyles, workPackage.status)}>
          {label(wpStatusLabel, workPackage.status)}
        </Chip>
        <Chip className={style(priorityStyles, workPackage.priority)}>{workPackage.priority}</Chip>
      </div>
      {activities.length > 0 ? (
        <ul
          aria-label={`Tätigkeiten zu ${workPackage.title}`}
          className="mt-2 divide-y divide-border pl-6"
        >
          {activities.map((activity) => (
            <ActivityRow key={activity.projectionId} activity={activity} />
          ))}
        </ul>
      ) : (
        <p className="mt-2 pl-6 text-xs text-muted-foreground">Keine Tätigkeiten.</p>
      )}
    </li>
  );
}

function ProjectBlock({
  project,
  workPackages,
}: {
  project: SharedProjectRecord;
  workPackages: WorkPackageNode[];
}) {
  return (
    <Card>
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <FolderKanban className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <h3 className="min-w-0 flex-1 truncate text-lg font-semibold">{project.name}</h3>
          <Chip className={style(projectStatusStyles, project.status)}>
            {label(projectStatusLabel, project.status)}
          </Chip>
        </div>
        {workPackages.length > 0 ? (
          <ul aria-label={`Arbeitspakete zu ${project.name}`} className="mt-4 grid gap-3">
            {workPackages.map((node) => (
              <WorkPackageBlock key={node.workPackage.projectionId} node={node} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Keine Arbeitspakete.</p>
        )}
      </div>
    </Card>
  );
}

export function CustomerDetailView({ state }: { state: CustomerDetailState }) {
  if (state.kind === "loading") {
    return (
      <section aria-labelledby="customer-detail-heading">
        <BackLink />
        <h1 id="customer-detail-heading" className="sr-only">
          Kunde wird geladen
        </h1>
        <div role="status" aria-live="polite" aria-busy="true" className="mt-4 grid gap-3">
          <span className="sr-only">Kundendaten werden geladen …</span>
          <Skeleton className="h-12 w-1/2 rounded-xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </section>
    );
  }

  if (state.kind === "denied" || state.kind === "error") {
    const denied = state.kind === "denied";
    return (
      <section aria-labelledby="customer-detail-heading">
        <BackLink />
        <h1 id="customer-detail-heading" className="mt-4 text-2xl font-semibold tracking-tight">
          {denied ? "Kunde nicht verfügbar" : "Kunde konnte nicht geladen werden"}
        </h1>
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm"
        >
          {denied ? (
            <ShieldOff className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          )}
          <p className="text-muted-foreground">
            {denied
              ? "Für diesen Kunden liegt keine gültige Zuordnung vor oder er existiert nicht. Es werden keine Daten angezeigt."
              : "Bitte versuchen Sie es später erneut. Es werden keine Kundendaten angezeigt."}
          </p>
        </div>
      </section>
    );
  }

  const { customer, responsible } = state.detail;
  const tree = buildCustomerProjectionTree(state.detail.projection);

  return (
    <section aria-labelledby="customer-detail-heading">
      <BackLink />
      <div className="mt-4 mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Kunde</p>
        <h1
          id="customer-detail-heading"
          className="mt-2 flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {customer.name}
          <Chip
            className={
              customer.status === "active"
                ? "border-success/30 bg-success/15 text-success"
                : "border-border bg-muted text-muted-foreground"
            }
          >
            {customerStatusText(customer.status)}
          </Chip>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tree.counts.projects} Projekte · {tree.counts.workPackages} Arbeitspakete ·{" "}
          {tree.counts.activities} Tätigkeiten · Ansicht: Nur-Lesen
        </p>
        <dl className="mt-4 grid gap-3 rounded-2xl border border-border bg-secondary/30 p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Verantwortlicher Systemingenieur
            </dt>
            <dd className="mt-1 font-medium">{responsible.displayName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Eigene Verantwortung
            </dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <ResponsibilityBadge status={customer.responsibilityStatus} />
              <span className="text-muted-foreground">
                seit {fmtDate(customer.responsibleSince.slice(0, 10))}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Kundenzugriff</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <AccessLevelBadge level={customer.accessLevel} />
              {customer.accessLevel === "write" && (
                <span className="text-xs text-muted-foreground">
                  Schreiben nur mit fachlicher Berechtigung
                </span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      <h2 className="sr-only">Projekte</h2>
      {tree.projects.length === 0 &&
        tree.unassignedWorkPackages.length === 0 &&
        tree.unassignedActivities.length === 0 && (
          <Card>
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Für diesen Kunden sind keine freigegebenen Projekte, Arbeitspakete oder Tätigkeiten
              vorhanden.
            </p>
          </Card>
        )}

      <div className="grid gap-4">
        {tree.projects.map((node) => (
          <ProjectBlock
            key={node.project.projectionId}
            project={node.project}
            workPackages={node.workPackages}
          />
        ))}

        {tree.unassignedWorkPackages.length > 0 && (
          <Card>
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold">Arbeitspakete ohne Projektzuordnung</h3>
              <ul aria-label="Arbeitspakete ohne Projektzuordnung" className="mt-4 grid gap-3">
                {tree.unassignedWorkPackages.map((node) => (
                  <WorkPackageBlock key={node.workPackage.projectionId} node={node} />
                ))}
              </ul>
            </div>
          </Card>
        )}

        {tree.unassignedActivities.length > 0 && (
          <Card>
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold">Tätigkeiten ohne Arbeitspaketzuordnung</h3>
              <ul
                aria-label="Tätigkeiten ohne Arbeitspaketzuordnung"
                className="mt-2 divide-y divide-border"
              >
                {tree.unassignedActivities.map((activity) => (
                  <ActivityRow key={activity.projectionId} activity={activity} />
                ))}
              </ul>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}
