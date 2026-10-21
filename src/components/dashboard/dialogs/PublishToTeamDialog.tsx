/**
 * L0b: Dialog "An Team veröffentlichen".
 *
 * Bringt den lokalen Bestand (Projekte, Arbeitspakete, Tätigkeiten) für genau
 * einen Kunden in die gemeinsame Projektion. Der Dialog zeigt vor dem Schreiben
 * eine Vorschau mit Gründen für übersprungene Objekte und eine Schätzung der
 * Zurückziehungen. Der Server rechnet bei der Veröffentlichung erneut und bleibt
 * maßgeblich (Rolle, Systemhaus, Kundenfreigabe).
 *
 * Der Dialog kennt weder Supabase noch Server-Funktionen: Zugriffe kommen als
 * Props, damit er isoliert testbar bleibt.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { MyCustomerSummary } from "@/lib/customer-data/my-customers";
import { normalizeLegacyCustomerName } from "@/lib/customer-data/migration";
import {
  collectLocalCustomerNames,
  groupByReason,
  previewPublish,
  readStoredNameSelection,
  writeStoredNameSelection,
  buildPublishPayload,
  type LocalSnapshot,
  type PublishPayload,
} from "@/lib/customer-data/publish-to-team";
import type {
  SharedCustomerProjectionSnapshot,
  SharedProjectionPublishResult,
} from "@/lib/customer-data/shared-projection-runtime";
import { inputCls } from "../constants";
import { Modal } from "../primitives";

export interface PublishToTeamDialogProps {
  snapshot: LocalSnapshot;
  publisherUserId: string;
  onClose: () => void;
  listCustomers: () => Promise<MyCustomerSummary[]>;
  readProjection: (scope: {
    systemhouseId: string;
    customerId: string;
  }) => Promise<SharedCustomerProjectionSnapshot>;
  publish: (payload: PublishPayload) => Promise<SharedProjectionPublishResult>;
}

type CustomersState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; customers: MyCustomerSummary[] };

type ProjectionState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; projection: SharedCustomerProjectionSnapshot };

type RunState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "error" }
  | { kind: "done"; result: SharedProjectionPublishResult };

const customerKey = (customer: Pick<MyCustomerSummary, "systemhouseId" | "customerId">) =>
  `${customer.systemhouseId}::${customer.customerId}`;

function totalOf(counts: { projects: number; workPackages: number; activities: number }): number {
  return counts.projects + counts.workPackages + counts.activities;
}

export function PublishToTeamDialog({
  snapshot: openedSnapshot,
  publisherUserId,
  onClose,
  listCustomers,
  readProjection,
  publish,
}: PublishToTeamDialogProps) {
  // Der Stand beim Öffnen wird festgehalten: Vorschau und Veröffentlichung beziehen sich
  // auf denselben Snapshot, auch wenn sich der lokale Store im Hintergrund ändert.
  const [snapshot] = useState(openedSnapshot);
  const listCustomersRef = useRef(listCustomers);
  const readProjectionRef = useRef(readProjection);
  listCustomersRef.current = listCustomers;
  readProjectionRef.current = readProjection;
  const [customersState, setCustomersState] = useState<CustomersState>({ kind: "loading" });
  const [selectedKey, setSelectedKey] = useState("");
  const [projectionState, setProjectionState] = useState<ProjectionState>({ kind: "idle" });
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [confirmWithdrawal, setConfirmWithdrawal] = useState(false);
  const [run, setRun] = useState<RunState>({ kind: "idle" });
  const customerSelectId = useId();
  const confirmId = useId();

  useEffect(() => {
    let cancelled = false;
    listCustomersRef
      .current()
      .then((customers) => {
        if (cancelled) return;
        setCustomersState({
          kind: "ready",
          customers: customers.filter((customer) => customer.accessLevel === "write"),
        });
      })
      .catch(() => {
        if (!cancelled) setCustomersState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const customers = customersState.kind === "ready" ? customersState.customers : [];
  const customer = customers.find((entry) => customerKey(entry) === selectedKey) ?? null;

  const localNames = useMemo(() => collectLocalCustomerNames(snapshot), [snapshot]);

  useEffect(() => {
    if (!customer) {
      setProjectionState({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setProjectionState({ kind: "loading" });
    setConfirmWithdrawal(false);
    setRun({ kind: "idle" });

    // Vorbelegung: gemerkte Auswahl + exakt gleichlautender Kundenname. Keine Ähnlichkeitsraterei.
    const stored = readStoredNameSelection(publisherUserId, customer.customerId);
    const exact = localNames.filter(
      (name) => normalizeLegacyCustomerName(name) === normalizeLegacyCustomerName(customer.name),
    );
    const storedKnown = stored.filter((name) =>
      localNames.some(
        (local) => normalizeLegacyCustomerName(local) === normalizeLegacyCustomerName(name),
      ),
    );
    setSelectedNames([...new Set([...storedKnown, ...exact])]);

    readProjectionRef
      .current({ systemhouseId: customer.systemhouseId, customerId: customer.customerId })
      .then((projection) => {
        if (!cancelled) setProjectionState({ kind: "ready", projection });
      })
      .catch(() => {
        if (!cancelled) setProjectionState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [customer, localNames, publisherUserId]);

  const preview = useMemo(() => {
    if (!customer || projectionState.kind !== "ready") return null;
    return previewPublish({
      scope: { systemhouseId: customer.systemhouseId, customerId: customer.customerId },
      snapshot,
      selectedLegacyNames: selectedNames,
      publisherUserId,
      current: projectionState.projection,
    });
  }, [customer, projectionState, snapshot, selectedNames, publisherUserId]);

  const withdrawalTotal = preview ? totalOf(preview.withdrawals) : 0;
  const canRun =
    !!preview &&
    preview.canPublish &&
    preview.invalid.length === 0 &&
    (withdrawalTotal === 0 || confirmWithdrawal) &&
    run.kind !== "running";

  const toggleName = (name: string) => {
    setConfirmWithdrawal(false);
    setSelectedNames((current) => {
      const key = normalizeLegacyCustomerName(name);
      return current.some((entry) => normalizeLegacyCustomerName(entry) === key)
        ? current.filter((entry) => normalizeLegacyCustomerName(entry) !== key)
        : [...current, name];
    });
  };

  const execute = async () => {
    if (!customer || !preview || !canRun) return;
    setRun({ kind: "running" });
    try {
      const payload = buildPublishPayload({
        scope: { systemhouseId: customer.systemhouseId, customerId: customer.customerId },
        snapshot,
        selectedLegacyNames: selectedNames,
      });
      const result = await publish(payload);
      writeStoredNameSelection(publisherUserId, customer.customerId, selectedNames);
      setRun({ kind: "done", result });
    } catch {
      setRun({ kind: "error" });
    }
  };

  return (
    <Modal title="An Team veröffentlichen" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Veröffentlicht den lokalen Bestand für einen Kunden in die gemeinsame Datenbasis.
          Verantwortungen und Kundenansichten zeigen danach diese Daten. Der Stand dieses Geräts
          gilt dabei als vollständig: Objekte, die lokal nicht mehr vorkommen, werden im Team
          zurückgezogen.
        </p>

        {customersState.kind === "loading" && <p role="status">Kunden werden geladen …</p>}
        {customersState.kind === "error" && (
          <p role="alert" className="text-destructive">
            Kunden konnten nicht geladen werden. Bitte später erneut versuchen.
          </p>
        )}
        {customersState.kind === "ready" && customers.length === 0 && (
          <p role="status" className="rounded-lg border border-border bg-secondary/30 p-3">
            Für dein Konto ist kein Kunde mit Schreibrecht freigegeben. Veröffentlichen setzt eine
            aktive Systemhaus-Zugehörigkeit, die Verantwortung für den Kunden und eine
            Kundenfreigabe mit Schreibrecht voraus.
          </p>
        )}

        {customersState.kind === "ready" && customers.length > 0 && run.kind !== "done" && (
          <>
            <div>
              <label htmlFor={customerSelectId} className="text-xs font-medium">
                Zielkunde
              </label>
              <select
                id={customerSelectId}
                className={`mt-1 ${inputCls}`}
                value={selectedKey}
                onChange={(event) => setSelectedKey(event.target.value)}
              >
                <option value="" className="bg-background">
                  Bitte auswählen
                </option>
                {customers.map((entry) => (
                  <option
                    key={customerKey(entry)}
                    value={customerKey(entry)}
                    className="bg-background"
                  >
                    {entry.name}
                  </option>
                ))}
              </select>
            </div>

            {customer && projectionState.kind === "loading" && (
              <p role="status">Aktueller Teamstand wird geladen …</p>
            )}
            {customer && projectionState.kind === "error" && (
              <p role="alert" className="text-destructive">
                Der aktuelle Teamstand konnte nicht gelesen werden. Ohne ihn kann ich
                Zurückziehungen nicht abschätzen; deshalb ist das Veröffentlichen gesperrt.
              </p>
            )}

            {customer && preview && (
              <>
                <fieldset className="rounded-lg border border-border p-3">
                  <legend className="px-1 text-xs font-medium">
                    Welche lokalen Kundennamen gehören zu „{customer.name}“?
                  </legend>
                  {localNames.length === 0 ? (
                    <p className="text-muted-foreground">
                      Lokal ist an keinem Objekt ein Kundenname hinterlegt. Ohne Kundenname kann
                      nichts zugeordnet werden.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {localNames.map((name) => {
                        const checked = selectedNames.some(
                          (entry) =>
                            normalizeLegacyCustomerName(entry) ===
                            normalizeLegacyCustomerName(name),
                        );
                        return (
                          <li key={name}>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleName(name)}
                              />
                              <span>{name}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Es wird nichts automatisch zugeordnet, außer ein Name stimmt exakt mit dem
                    Kunden überein oder du hast ihn hier schon einmal gewählt.
                  </p>
                </fieldset>

                <section aria-label="Vorschau" className="rounded-lg border border-border p-3">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide">Vorschau</h4>
                  <p>
                    Wird veröffentlicht: {preview.publish.projects} Projekte,{" "}
                    {preview.publish.workPackages} Arbeitspakete, {preview.publish.activities}{" "}
                    Tätigkeiten.
                  </p>

                  {preview.invalid.length > 0 && (
                    <div role="alert" className="mt-2 text-destructive">
                      <p>
                        Veröffentlichen ist gesperrt: {preview.invalid.length} lokale Einträge
                        würden abgelehnt.
                      </p>
                      <ul className="mt-1 list-disc pl-5">
                        {preview.invalid.slice(0, 10).map((entry) => (
                          <li key={`${entry.entityType}:${entry.sourceId}:${entry.problem}`}>
                            {entry.sourceId || "(ohne ID)"} – {entry.problem}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preview.skipped.length > 0 && (
                    <div className="mt-2">
                      <p>Übersprungen (gehören zum Zielkunden):</p>
                      <ul className="list-disc pl-5">
                        {groupByReason(preview.skipped).map((entry) => (
                          <li key={entry.reason}>
                            {entry.count} × {entry.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preview.unresolved.length > 0 && (
                    <div className="mt-2">
                      <p>Nicht diesem Kunden zugeordnet (bleiben lokal):</p>
                      <ul className="list-disc pl-5">
                        {groupByReason(preview.unresolved).map((entry) => (
                          <li key={entry.reason}>
                            {entry.count} × {entry.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {withdrawalTotal > 0 && (
                    <div className="mt-2 rounded-md border border-border bg-secondary/30 p-2">
                      <p>
                        Voraussichtlich zurückgezogen: {preview.withdrawals.projects} Projekte,{" "}
                        {preview.withdrawals.workPackages} Arbeitspakete,{" "}
                        {preview.withdrawals.activities} Tätigkeiten. Sie sind lokal nicht mehr
                        vorhanden und werden im Team ausgeblendet.
                      </p>
                      <label htmlFor={confirmId} className="mt-1 flex items-center gap-2">
                        <input
                          id={confirmId}
                          type="checkbox"
                          checked={confirmWithdrawal}
                          onChange={(event) => setConfirmWithdrawal(event.target.checked)}
                        />
                        <span>Ich bestätige das Zurückziehen.</span>
                      </label>
                    </div>
                  )}
                </section>
              </>
            )}

            {run.kind === "error" && (
              <p role="alert" className="text-destructive">
                Das Veröffentlichen ist fehlgeschlagen. Es wurde nichts bestätigt. Bitte Rolle,
                Systemhaus und Kundenfreigabe prüfen und erneut versuchen.
              </p>
            )}
          </>
        )}

        {run.kind === "done" && (
          <section
            aria-label="Ergebnis"
            role="status"
            className="rounded-lg border border-border p-3"
          >
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide">Ergebnis</h4>
            <p>
              Veröffentlicht: {run.result.upsertedProjects} Projekte,{" "}
              {run.result.upsertedWorkPackages} Arbeitspakete, {run.result.upsertedActivities}{" "}
              Tätigkeiten.
            </p>
            <p>
              Zurückgezogen: {run.result.withdrawnProjects} Projekte,{" "}
              {run.result.withdrawnWorkPackages} Arbeitspakete, {run.result.withdrawnActivities}{" "}
              Tätigkeiten.
            </p>
            {run.result.skipped.length > 0 && (
              <p>Übersprungen: {run.result.skipped.length} (Gründe siehe Vorschau).</p>
            )}
          </section>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-9 rounded-md border border-border bg-secondary/40 px-4 text-sm hover:bg-secondary"
        >
          {run.kind === "done" ? "Schließen" : "Abbrechen"}
        </button>
        {run.kind !== "done" && (
          <button
            type="button"
            disabled={!canRun}
            onClick={() => void execute()}
            className="h-9 rounded-md px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
            style={{ background: "var(--gradient-primary)" }}
          >
            {run.kind === "running" ? "Veröffentliche …" : "Jetzt veröffentlichen"}
          </button>
        )}
      </div>
    </Modal>
  );
}
