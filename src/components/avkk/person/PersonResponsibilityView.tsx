import { useCallback, useState } from "react";
import { usePermission } from "@/hooks/usePermission";
import { useAvkkPeopleDirectory } from "@/hooks/useAvkkPeopleDirectory";
import { useResponsibilityPersonView } from "@/hooks/useResponsibilityPersonView";
import {
  addResponsibilityDeputyFn,
  endResponsibilityFn,
  listResponsibilityCandidatesFn,
  transferResponsibilityOwnerFn,
} from "@/lib/avkk-runtime/responsibility-mutations.functions";
import type { ResponsibilityPersonViewRow } from "@/lib/avkk/responsibility-management.types";
import {
  PersonResponsibilityDialogs,
  type PersonResponsibilityDialogAction,
} from "./PersonResponsibilityDialogs";
import { PersonResponsibilityTable } from "./PersonResponsibilityTable";

export function PersonResponsibilityView() {
  const { people, loading: peopleLoading, error: peopleError } = useAvkkPeopleDirectory();
  const [personId, setPersonId] = useState("");
  const { rows, loading, error, refresh } = useResponsibilityPersonView(personId || null);
  const canMutate = usePermission("avkk.responsibility.assign");
  const [dialog, setDialog] = useState<{
    action: PersonResponsibilityDialogAction;
    row: ResponsibilityPersonViewRow;
  } | null>(null);
  const submit = useCallback(
    async (
      action: PersonResponsibilityDialogAction,
      responsibilityId: string,
      targetUserId?: string,
    ) => {
      if (action === "transfer" && targetUserId)
        await transferResponsibilityOwnerFn({ data: { responsibilityId, targetUserId } });
      if (action === "add-deputy" && targetUserId)
        await addResponsibilityDeputyFn({ data: { responsibilityId, targetUserId } });
      if (action === "end") await endResponsibilityFn({ data: { responsibilityId } });
      setDialog(null);
      refresh();
    },
    [refresh],
  );
  return (
    <section aria-labelledby="person-responsibility-heading" className="space-y-5">
      <header>
        <h1 id="person-responsibility-heading" className="text-2xl font-semibold">
          Verantwortungen nach Person
        </h1>
        <p className="text-sm text-muted-foreground">
          Aktive Owner- und Deputy-Verantwortungen je Person.
        </p>
      </header>
      {peopleError ? <p role="alert">{peopleError}</p> : null}
      <label className="grid max-w-md gap-2 text-sm">
        Person
        <select
          aria-label="Person auswählen"
          value={personId}
          onChange={(event) => setPersonId(event.target.value)}
          disabled={peopleLoading}
          className="border p-2"
        >
          <option value="">Bitte auswählen</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.displayName}
            </option>
          ))}
        </select>
      </label>
      {!personId ? (
        <p className="text-sm text-muted-foreground">Bitte wählen Sie eine Person aus.</p>
      ) : null}
      {loading ? <p role="status">Verantwortungen werden geladen …</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {personId && !loading && !error ? (
        <PersonResponsibilityTable
          rows={rows}
          canMutate={canMutate}
          onTransfer={(row) => setDialog({ action: "transfer", row })}
          onAddDeputy={(row) => setDialog({ action: "add-deputy", row })}
          onEnd={(row) => setDialog({ action: "end", row })}
        />
      ) : null}
      <PersonResponsibilityDialogs
        action={dialog?.action ?? null}
        row={dialog?.row ?? null}
        onClose={() => setDialog(null)}
        loadCandidates={async (responsibilityId) =>
          listResponsibilityCandidatesFn({ data: { responsibilityId } })
        }
        onSubmit={submit}
      />
    </section>
  );
}
