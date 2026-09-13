import { useState } from "react";
import { AlertTriangle, ShieldOff, UserCheck } from "lucide-react";
import type {
  ResponsibilityCandidate,
  ResponsibilityManagementCustomer,
} from "@/lib/customer-data/customer-responsibility-management";
import type { ResponsibilityManagementPayload } from "@/lib/customer-data-runtime/customer-responsibility-management.functions";
import { Card } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtDate } from "@/components/dashboard/formatters";

export type ResponsibilityManagementViewState =
  | { kind: "loading" }
  | { kind: "denied" }
  | { kind: "error" }
  | { kind: "ready"; payload: ResponsibilityManagementPayload };

interface Props {
  state: ResponsibilityManagementViewState;
  onSystemhouseChange: (systemhouseId: string) => void;
  loadCandidates: (systemhouseId: string) => Promise<ResponsibilityCandidate[]>;
  onAssign: (input: {
    systemhouseId: string;
    customerId: string;
    targetUserId: string;
  }) => Promise<void>;
  onEnd: (input: { systemhouseId: string; customerId: string }) => Promise<void>;
}

type ActionDialog =
  | { kind: "assign"; customer: ResponsibilityManagementCustomer }
  | { kind: "end"; customer: ResponsibilityManagementCustomer }
  | null;

function statusText(status: string): string {
  if (status === "active") return "Aktiv";
  if (status === "inactive") return "Inaktiv";
  return status;
}

export function CustomerResponsibilityManagementView({
  state,
  onSystemhouseChange,
  loadCandidates,
  onAssign,
  onEnd,
}: Props) {
  const [dialog, setDialog] = useState<ActionDialog>(null);
  const [candidates, setCandidates] = useState<ResponsibilityCandidate[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [actionError, setActionError] = useState(false);

  if (state.kind === "loading") {
    return (
      <section aria-labelledby="responsibility-management-heading">
        <h1 id="responsibility-management-heading" className="text-2xl font-semibold tracking-tight">
          Kundenverantwortung
        </h1>
        <div role="status" aria-live="polite" aria-busy="true" className="mt-6 grid gap-3">
          <span className="sr-only">Kundenverantwortung wird geladen …</span>
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </section>
    );
  }

  if (state.kind === "denied" || state.kind === "error") {
    const denied = state.kind === "denied";
    return (
      <section aria-labelledby="responsibility-management-heading">
        <h1 id="responsibility-management-heading" className="text-2xl font-semibold tracking-tight">
          Kundenverantwortung
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
              ? "Kundenverantwortung ist für dieses Konto nicht verfügbar. Es werden keine Kundendaten angezeigt."
              : "Kundenverantwortung konnte nicht geladen werden. Es werden keine Kundendaten angezeigt."}
          </p>
        </div>
      </section>
    );
  }

  const { payload } = state;
  if (!payload.selectedSystemhouseId || payload.systemhouses.length === 0) {
    return (
      <section aria-labelledby="responsibility-management-heading">
        <h1 id="responsibility-management-heading" className="text-2xl font-semibold tracking-tight">
          Kundenverantwortung
        </h1>
        <Card>
          <p className="mt-4 px-6 py-8 text-sm text-muted-foreground">
            Für dieses Konto steht kein verwaltbares Systemhaus zur Verfügung.
          </p>
        </Card>
      </section>
    );
  }

  const openAssignment = async (customer: ResponsibilityManagementCustomer) => {
    setDialog({ kind: "assign", customer });
    setCandidates([]);
    setSelectedUserId(customer.responsibility?.userId ?? "");
    setActionError(false);
    setCandidateLoading(true);
    try {
      const loaded = await loadCandidates(customer.systemhouseId);
      setCandidates(loaded);
      if (!customer.responsibility && loaded.length === 1) setSelectedUserId(loaded[0].userId);
    } catch {
      setActionError(true);
    } finally {
      setCandidateLoading(false);
    }
  };

  const submitAssignment = async () => {
    if (dialog?.kind !== "assign" || !selectedUserId) return;
    setBusy(true);
    setActionError(false);
    try {
      await onAssign({
        systemhouseId: dialog.customer.systemhouseId,
        customerId: dialog.customer.customerId,
        targetUserId: selectedUserId,
      });
      setDialog(null);
    } catch {
      setActionError(true);
    } finally {
      setBusy(false);
    }
  };

  const submitEnd = async () => {
    if (dialog?.kind !== "end") return;
    setBusy(true);
    setActionError(false);
    try {
      await onEnd({
        systemhouseId: dialog.customer.systemhouseId,
        customerId: dialog.customer.customerId,
      });
      setDialog(null);
    } catch {
      setActionError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="responsibility-management-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">BSF-03</p>
          <h1 id="responsibility-management-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Kundenverantwortung
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Primäre Kundenverantwortung verwalten. Diese Ansicht gewährt keinen Zugriff auf Projekte,
            Arbeitspakete oder Tätigkeiten eines Kunden.
          </p>
        </div>
        {payload.systemhouses.length > 1 && (
          <div className="grid gap-1.5">
            <label htmlFor="responsibility-systemhouse" className="text-xs font-medium text-muted-foreground">
              Systemhaus
            </label>
            <select
              id="responsibility-systemhouse"
              value={payload.selectedSystemhouseId}
              onChange={(event) => onSystemhouseChange(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {payload.systemhouses.map((systemhouse) => (
                <option key={systemhouse.systemhouseId} value={systemhouse.systemhouseId}>
                  {systemhouse.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Card>
        <div className="mt-6 overflow-x-auto">
          {payload.customers.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Keine Kunden im ausgewählten Systemhaus vorhanden.
            </p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Kunde</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Verantwortlich</th>
                  <th className="px-5 py-3 font-medium">Seit</th>
                  <th className="px-5 py-3 text-right font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payload.customers.map((customer) => (
                  <tr key={customer.customerId} data-testid={`responsibility-row-${customer.customerId}`}>
                    <td className="px-5 py-4 font-medium">{customer.name}</td>
                    <td className="px-5 py-4 text-muted-foreground">{statusText(customer.status)}</td>
                    <td className="px-5 py-4">
                      {customer.responsibility?.displayName ?? (
                        <span className="text-muted-foreground">Nicht zugeordnet</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {customer.responsibility
                        ? fmtDate(customer.responsibility.responsibleSince.slice(0, 10))
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`${customer.name} ${customer.responsibility ? "ändern" : "zuweisen"}`}
                          onClick={() => void openAssignment(customer)}
                        >
                          {customer.responsibility ? "Ändern" : "Zuweisen"}
                        </Button>
                        {customer.responsibility && (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`${customer.name} beenden`}
                            onClick={() => {
                              setActionError(false);
                              setDialog({ kind: "end", customer });
                            }}
                          >
                            Beenden
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Dialog
        open={dialog?.kind === "assign"}
        onOpenChange={(open) => {
          if (!open && !busy) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="size-5" aria-hidden="true" />
              {dialog?.kind === "assign" && dialog.customer.responsibility
                ? "Verantwortlichen ändern"
                : "Verantwortlichen zuweisen"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.kind === "assign"
                ? `${dialog.customer.name}: Wählen Sie einen aktiven berechtigten Systemingenieur dieses Systemhauses.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <label htmlFor="responsibility-candidate" className="text-sm font-medium">
              Verantwortlicher Systemingenieur
            </label>
            <select
              id="responsibility-candidate"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              disabled={candidateLoading || busy}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Bitte auswählen</option>
              {candidates.map((candidate) => (
                <option key={candidate.userId} value={candidate.userId}>
                  {candidate.displayName}
                </option>
              ))}
            </select>
            {candidateLoading && <p className="text-xs text-muted-foreground">Kandidaten werden geladen …</p>}
            {actionError && (
              <p role="alert" className="text-sm text-destructive">
                Die Aktion konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setDialog(null)}>
              Abbrechen
            </Button>
            <Button disabled={!selectedUserId || candidateLoading || busy} onClick={() => void submitAssignment()}>
              {busy ? "Speichern …" : dialog?.kind === "assign" && dialog.customer.responsibility ? "Ändern" : "Zuweisen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.kind === "end"}
        onOpenChange={(open) => {
          if (!open && !busy) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verantwortung beenden</DialogTitle>
            <DialogDescription>
              {dialog?.kind === "end"
                ? `Die aktuelle primäre Verantwortung für ${dialog.customer.name} wird beendet. Die Historie bleibt erhalten.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {actionError && (
            <p role="alert" className="text-sm text-destructive">
              Die Aktion konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setDialog(null)}>
              Abbrechen
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void submitEnd()}>
              {busy ? "Beenden …" : "Verantwortung beenden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
