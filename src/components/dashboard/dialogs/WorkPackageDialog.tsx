/**
 * Formulardialog zum Anlegen und Bearbeiten eines Arbeitspakets.
 * Verhaltensneutral aus dashboard.tsx extrahiert (Sprint 05).
 */
import { useId, useState } from "react";
import type { Priority, Project, WorkPackage, WorkPackageStatus } from "@/lib/dashboard-data";
import type { ReferenceValue } from "@/lib/reference-data/types";
import {
  categoryKeyOf,
  NO_CATEGORY_LABEL,
  selectableCategoryValues,
} from "@/lib/workpackage-category";
import { inputCls, wpStatusLabel } from "../constants";
import { FormActions, Modal } from "../primitives";

/**
 * BSF-03D: Kategoriekontext für den Dialog — providerneutral, vom Aufrufer
 * (Hook) befüllt. `values` sind bereits auf das gewählte Systemhaus gefiltert.
 * - `ready`: Auswahl möglich.
 * - `select-systemhouse`: Mehrfach-Membership, Systemhaus muss explizit gewählt werden.
 * - `no-systemhouse`: keine aktive Membership — Kategorie nicht wählbar.
 * - `loading` / `error`: Auswahl deaktiviert, Wert bleibt erhalten.
 */
export interface WorkPackageCategoryContext {
  status: "loading" | "ready" | "select-systemhouse" | "no-systemhouse" | "error";
  values: readonly ReferenceValue[];
  systemhouses: ReadonlyArray<{ id: string; name: string }>;
  selectedSystemhouseId: string | null;
  onSelectSystemhouse: (id: string) => void;
  error?: string | null;
}

export function WorkPackageDialog({
  wp,
  projects,
  onClose,
  onSave,
  categories,
}: {
  wp: WorkPackage;
  projects: Project[];
  onClose: () => void;
  onSave: (w: WorkPackage) => void;
  /** Optional: ohne Kontext wird kein Kategoriefeld gerendert (rückwärtskompatibel). */
  categories?: WorkPackageCategoryContext;
}) {
  const [form, setForm] = useState<WorkPackage & { tagsText: string }>({
    ...wp,
    tagsText: (wp.tags ?? []).join(", "),
  });
  const isNew = !wp.title;
  const valid = form.title.trim().length > 1;
  const categoryHintId = useId();
  const currentCategoryKey = categoryKeyOf(form);
  const categoryOptions = categories
    ? selectableCategoryValues(categories.values, currentCategoryKey)
    : [];
  const categoryDisabled = !!categories && categories.status !== "ready";
  const categoryUnknown =
    !!categories &&
    categories.status === "ready" &&
    currentCategoryKey !== null &&
    !categoryOptions.some((v) => v.key === currentCategoryKey);
  const categoryHint = (() => {
    if (!categories) return null;
    switch (categories.status) {
      case "loading":
        return "Kategorien werden geladen …";
      case "select-systemhouse":
        return "Bitte zuerst das Systemhaus wählen.";
      case "no-systemhouse":
        return "Keine aktive Systemhaus-Zugehörigkeit — Kategorie nicht wählbar.";
      case "error":
        return categories.error ?? "Kategorien derzeit nicht verfügbar.";
      default:
        return categoryUnknown
          ? `Gespeicherte Kategorie „${currentCategoryKey}“ ist im Katalog unbekannt und bleibt erhalten.`
          : null;
    }
  })();

  return (
    <Modal
      title={isNew ? "Neues Arbeitspaket" : `Arbeitspaket bearbeiten – ${wp.id}`}
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Titel
          <input
            className={`mt-1 ${inputCls}`}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium">
          Projekt (optional)
          <select
            className={`mt-1 ${inputCls}`}
            value={form.projectId ?? ""}
            onChange={(e) => setForm({ ...form, projectId: e.target.value || null })}
          >
            <option value="">— Kein Projekt —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-background">
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          Kunde
          <input
            className={`mt-1 ${inputCls}`}
            value={form.client ?? ""}
            onChange={(e) => setForm({ ...form, client: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium">
          Status
          <select
            className={`mt-1 ${inputCls}`}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as WorkPackageStatus })}
          >
            {(Object.keys(wpStatusLabel) as WorkPackageStatus[]).map((s) => (
              <option key={s} value={s} className="bg-background">
                {wpStatusLabel[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          Priorität
          <select
            className={`mt-1 ${inputCls}`}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
          >
            {(["niedrig", "mittel", "hoch", "kritisch"] as Priority[]).map((p) => (
              <option key={p} value={p} className="bg-background">
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          Fällig
          <input
            type="date"
            className={`mt-1 ${inputCls}`}
            value={form.due ?? ""}
            onChange={(e) => setForm({ ...form, due: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium">
          Geschätzt (h)
          <input
            type="number"
            min="0"
            step="0.25"
            className={`mt-1 ${inputCls}`}
            value={form.estimated ?? 0}
            onChange={(e) => setForm({ ...form, estimated: Number(e.target.value) })}
          />
        </label>
        <label className="text-xs font-medium">
          Zuständig
          <input
            className={`mt-1 ${inputCls}`}
            value={form.assignee ?? ""}
            onChange={(e) => setForm({ ...form, assignee: e.target.value })}
          />
        </label>
        {categories && categories.systemhouses.length > 1 && (
          <label className="text-xs font-medium">
            Systemhaus
            <select
              className={`mt-1 ${inputCls}`}
              value={categories.selectedSystemhouseId ?? ""}
              onChange={(e) => categories.onSelectSystemhouse(e.target.value)}
            >
              <option value="">— Systemhaus wählen —</option>
              {categories.systemhouses.map((s) => (
                <option key={s.id} value={s.id} className="bg-background">
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {categories && (
          <label className="text-xs font-medium">
            Kategorie
            <select
              className={`mt-1 ${inputCls}`}
              value={currentCategoryKey ?? ""}
              disabled={categoryDisabled}
              aria-describedby={categoryHint ? categoryHintId : undefined}
              onChange={(e) => setForm({ ...form, categoryKey: e.target.value || null })}
            >
              <option value="">{NO_CATEGORY_LABEL}</option>
              {categoryOptions.map((v) => (
                <option key={v.key} value={v.key} className="bg-background">
                  {v.isActive ? v.label : `${v.label} (deaktiviert)`}
                </option>
              ))}
              {categoryUnknown && currentCategoryKey && (
                <option value={currentCategoryKey} className="bg-background">
                  {`Unbekannte Kategorie (${currentCategoryKey})`}
                </option>
              )}
            </select>
            {categoryHint && (
              <span id={categoryHintId} className="mt-1 block text-[11px] text-muted-foreground">
                {categoryHint}
              </span>
            )}
          </label>
        )}
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Tags (Komma-getrennt)
          <input
            className={`mt-1 ${inputCls}`}
            value={form.tagsText}
            onChange={(e) => setForm({ ...form, tagsText: e.target.value })}
          />
        </label>
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Beschreibung
          <textarea
            rows={3}
            className={`mt-1 ${inputCls}`}
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
      </div>

      <FormActions
        onCancel={onClose}
        saveDisabled={!valid}
        saveLabel={isNew ? "Anlegen" : "Speichern"}
        onSave={() => {
          const { tagsText, ...rest } = form;
          onSave({
            ...rest,
            categoryKey: categoryKeyOf(rest),
            tags: tagsText
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          });
        }}
      />
    </Modal>
  );
}
