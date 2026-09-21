import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type {
  PerformanceStatementReview,
  PerformanceStatementReviewRow,
  PerformanceStatementScopeOption,
  PerformanceStatementSnapshot,
  ReviewInput,
} from "@/lib/performance-statement/performance-statement-contract";
import type { ReportFormat } from "@/lib/report/types";

interface Props {
  scopes: readonly PerformanceStatementScopeOption[];
  selection: ReviewInput | null;
  review: PerformanceStatementReview | null;
  history: readonly PerformanceStatementSnapshot[];
  loading: boolean;
  busy: boolean;
  error: string | null;
  onSelectionChange: (selection: ReviewInput) => void;
  onOverride: (row: PerformanceStatementReviewRow, effectiveBillable: boolean) => void;
  onFinalize: () => void;
  onReplace: (statement: PerformanceStatementSnapshot) => void;
  onExport: (statement: PerformanceStatementSnapshot, format: ReportFormat) => void;
}

function formatHours(value: number): string {
  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} h`;
}

function reviewStateLabel(row: PerformanceStatementReviewRow): string {
  switch (row.reviewState) {
    case "legacy_finalized":
      return "Bereits abgerechnet";
    case "claimed_by_statement":
      return "Bereits in Leistungsnachweis";
    default:
      return "Prüfbar";
  }
}

function uniqueSystemhouses(scopes: readonly PerformanceStatementScopeOption[]) {
  return [
    ...new Map(
      scopes.map((scope) => [
        scope.systemhouseId,
        { id: scope.systemhouseId, name: scope.systemhouseName },
      ]),
    ).values(),
  ];
}

export function PerformanceStatementView({
  scopes,
  selection,
  review,
  history,
  loading,
  busy,
  error,
  onSelectionChange,
  onOverride,
  onFinalize,
  onReplace,
  onExport,
}: Props) {
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const systemhouses = uniqueSystemhouses(scopes);
  const customers = selection
    ? scopes.filter((scope) => scope.systemhouseId === selection.systemhouseId)
    : [];

  const patchSelection = (patch: Partial<ReviewInput>) => {
    if (!selection) return;
    onSelectionChange({ ...selection, ...patch });
  };

  return (
    <section aria-labelledby="performance-statement-title" className="space-y-5">
      <div>
        <p className="text-sm font-medium text-primary">BSF-03B</p>
        <h1 id="performance-statement-title" className="text-2xl font-semibold tracking-tight">
          Leistungsnachweis
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tätigkeiten prüfen, Abrechenbarkeit freigeben und einen unveränderbaren
          Kunden-Leistungsnachweis finalisieren.
        </p>
      </div>

      <section aria-label="Leistungsnachweis-Filter" className="rounded-lg border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Systemhaus</span>
            <select
              value={selection?.systemhouseId ?? ""}
              disabled={!selection || busy}
              onChange={(event) => {
                if (!selection) return;
                const nextSystemhouseId = event.target.value;
                const nextCustomer = scopes.find(
                  (scope) => scope.systemhouseId === nextSystemhouseId,
                );
                if (!nextCustomer) return;
                onSelectionChange({
                  ...selection,
                  systemhouseId: nextCustomer.systemhouseId,
                  customerId: nextCustomer.customerId,
                });
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 disabled:opacity-50"
            >
              {systemhouses.map((systemhouse) => (
                <option key={systemhouse.id} value={systemhouse.id}>
                  {systemhouse.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Kunde</span>
            <select
              value={selection?.customerId ?? ""}
              disabled={!selection || busy}
              onChange={(event) => patchSelection({ customerId: event.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 disabled:opacity-50"
            >
              {customers.map((customer) => (
                <option key={customer.customerId} value={customer.customerId}>
                  {customer.customerName}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Von</span>
            <input
              type="date"
              value={selection?.periodStart ?? ""}
              disabled={!selection || busy}
              onChange={(event) => patchSelection({ periodStart: event.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 disabled:opacity-50"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Bis</span>
            <input
              type="date"
              value={selection?.periodEnd ?? ""}
              disabled={!selection || busy}
              onChange={(event) => patchSelection({ periodEnd: event.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 disabled:opacity-50"
            />
          </label>
        </div>
      </section>

      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Leistungsnachweis-Daten werden geladen …
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && !selection && scopes.length === 0 && (
        <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
          Für diesen Benutzer ist kein zulässiger Kunden-Scope verfügbar.
        </p>
      )}

      {review && (
        <>
          <section aria-label="Review-Zusammenfassung" className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Prüfbar</p>
              <p className="mt-1 text-xl font-semibold">{review.summary.reviewableCount}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Abrechenbar</p>
              <p className="mt-1 text-xl font-semibold">
                {formatHours(review.summary.billableHours)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Nicht abrechenbar
              </p>
              <p className="mt-1 text-xl font-semibold">
                {formatHours(review.summary.nonBillableHours)}
              </p>
            </div>
          </section>

          <section aria-label="Review" className="rounded-lg border bg-card">
            <div className="border-b p-4">
              <h2 className="text-lg font-semibold">Tätigkeiten prüfen</h2>
              <p className="text-sm text-muted-foreground">
                Ein Override gilt nur für exakt die angezeigte Source-Revision.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Datum</th>
                    <th className="px-4 py-3">Leistung</th>
                    <th className="px-4 py-3">Projekt / Arbeitspaket</th>
                    <th className="px-4 py-3">Kategorie</th>
                    <th className="px-4 py-3 text-right">Stunden</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Abrechenbar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {review.rows.map((row) => {
                    const reviewable = row.reviewState === "reviewable";
                    return (
                      <tr key={row.activitySourceId}>
                        <td className="px-4 py-3">{row.date}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.title}</div>
                          {row.hasStaleOverride && (
                            <div className="mt-1 text-xs font-medium text-amber-700">
                              Veraltete Review-Entscheidung
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div>{row.project.name ?? "Ohne Projekt"}</div>
                          <div>{row.workPackage.title ?? "Ohne Arbeitspaket"}</div>
                        </td>
                        <td className="px-4 py-3">{row.category.label ?? "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatHours(row.durationHours)}
                        </td>
                        <td className="px-4 py-3">{reviewStateLabel(row)}</td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Abrechenbar: ${row.title}`}
                            checked={row.effectiveBillable}
                            disabled={!reviewable || busy}
                            onChange={(event) => onOverride(row, event.target.checked)}
                            className="size-4 rounded border-input"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex justify-end">
            <AlertDialog
              open={finalizeDialogOpen}
              onOpenChange={(open) => {
                setFinalizeDialogOpen(open);
                if (!open) setReviewConfirmed(false);
              }}
            >
              <AlertDialogTrigger asChild>
                <Button disabled={busy || review.summary.reviewableCount === 0}>
                  Leistungsnachweis finalisieren
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leistungsnachweis finalisieren?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Die aktuelle Review-Auswahl wird als unveränderbarer Snapshot gespeichert.
                    Spätere Korrekturen erfolgen ausschließlich über eine neue Ersatzversion.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <dl className="grid gap-2 rounded-md border bg-muted/20 p-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Kunde</dt>
                    <dd className="font-medium">{review.customerName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Zeitraum</dt>
                    <dd className="font-medium">
                      {review.periodStart} bis {review.periodEnd}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Datenstand</dt>
                    <dd className="font-medium">
                      {review.freshness.latestPublishedAt ?? "Kein Veröffentlichungszeitpunkt"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Prüfbare Tätigkeiten</dt>
                    <dd className="font-medium">{review.summary.reviewableCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Abrechenbare Stunden</dt>
                    <dd className="font-medium">{formatHours(review.summary.billableHours)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Nicht abrechenbare Stunden</dt>
                    <dd className="font-medium">{formatHours(review.summary.nonBillableHours)}</dd>
                  </div>
                </dl>
                <p className="text-sm font-medium">Leistungsnachweis, keine Rechnung.</p>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={reviewConfirmed}
                    onChange={(event) => setReviewConfirmed(event.target.checked)}
                    className="mt-0.5 size-4 rounded border-input"
                  />
                  <span>Ich bestätige, dass ich den angezeigten Datenstand geprüft habe.</span>
                </label>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={!reviewConfirmed || busy}
                    onClick={() => {
                      setFinalizeDialogOpen(false);
                      setReviewConfirmed(false);
                      onFinalize();
                    }}
                  >
                    Jetzt finalisieren
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}

      <section aria-label="Leistungsnachweis-Historie" className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Historie</h2>
          <p className="text-sm text-muted-foreground">
            Finalisierte Versionen bleiben unverändert erhalten.
          </p>
        </div>
        <div className="divide-y divide-border">
          {history.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              Noch kein finalisierter Leistungsnachweis im gewählten Scope.
            </p>
          )}
          {history.map((statement) => {
            const active =
              statement.status === "finalized" && statement.supersededByStatementId === null;
            return (
              <article key={statement.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">Version {statement.version}</h3>
                    <span className="rounded-full border px-2 py-0.5 text-xs">
                      {active ? "Finalisiert" : "Ersetzt"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {statement.periodStart} bis {statement.periodEnd} ·{" "}
                    {formatHours(statement.billableHours)} abrechenbar
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["pdf", "csv", "json"] as const).map((format) => (
                    <Button
                      key={format}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      aria-label={`Version ${statement.version} ${format.toUpperCase()} exportieren`}
                      onClick={() => onExport(statement, format)}
                    >
                      {format.toUpperCase()}
                    </Button>
                  ))}
                  {active && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      aria-label={`Version ${statement.version} ersetzen`}
                      onClick={() => onReplace(statement)}
                    >
                      Ersetzen
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
