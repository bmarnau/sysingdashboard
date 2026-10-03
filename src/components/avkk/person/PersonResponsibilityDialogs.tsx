import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ResponsibilityCandidate } from "@/lib/avkk/responsibility-mutations";
import type { ResponsibilityPersonViewRow } from "@/lib/avkk/responsibility-management.types";

export type PersonResponsibilityDialogAction = "transfer" | "add-deputy" | "end";

export function PersonResponsibilityDialogs({
  action,
  row,
  onClose,
  loadCandidates,
  onSubmit,
}: {
  action: PersonResponsibilityDialogAction | null;
  row: ResponsibilityPersonViewRow | null;
  onClose: () => void;
  loadCandidates: (responsibilityId: string) => Promise<readonly ResponsibilityCandidate[]>;
  onSubmit: (
    action: Exclude<PersonResponsibilityDialogAction, null>,
    responsibilityId: string,
    targetUserId?: string,
  ) => Promise<void>;
}) {
  const [candidates, setCandidates] = useState<readonly ResponsibilityCandidate[]>([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsTarget = action === "transfer" || action === "add-deputy";

  useEffect(() => {
    setCandidates([]);
    setTargetUserId("");
    setError(null);
    if (!row || !needsTarget) return;
    setLoading(true);
    loadCandidates(row.responsibilityId)
      .then(setCandidates)
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : "Kandidaten konnten nicht geladen werden.",
        ),
      )
      .finally(() => setLoading(false));
  }, [action, row, needsTarget, loadCandidates]);

  const title =
    action === "transfer"
      ? "Verantwortung übertragen"
      : action === "add-deputy"
        ? "Stellvertretung hinzufügen"
        : "Stellvertretung beenden";
  return (
    <Dialog open={action !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{row?.title}</DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {needsTarget ? (
          <label className="grid gap-2 text-sm">
            Neue verantwortliche Person
            <select
              aria-label="Neue verantwortliche Person"
              value={targetUserId}
              onChange={(event) => setTargetUserId(event.target.value)}
              disabled={loading || busy}
              className="border p-2"
            >
              <option value="">Bitte auswählen</option>
              {candidates.map((candidate) => (
                <option key={candidate.userId} value={candidate.userId}>
                  {candidate.displayName}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm">Die Deputy-Verantwortung wird beendet.</p>
        )}
        <DialogFooter>
          <button
            type="button"
            className="rounded-md border px-3 py-2"
            onClick={onClose}
            disabled={busy}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50"
            disabled={busy || loading || (needsTarget && !targetUserId)}
            onClick={() => {
              if (!action || !row) return;
              setBusy(true);
              setError(null);
              onSubmit(action, row.responsibilityId, targetUserId || undefined)
                .catch((cause: unknown) =>
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Änderung konnte nicht ausgeführt werden.",
                  ),
                )
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Wird gespeichert …" : title}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
