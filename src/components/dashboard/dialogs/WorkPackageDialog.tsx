/**
 * Formulardialog zum Anlegen und Bearbeiten eines Arbeitspakets.
 * Verhaltensneutral aus dashboard.tsx extrahiert (Sprint 05).
 */
import { useState } from "react";
import type { Priority, Project, WorkPackage, WorkPackageStatus } from "@/lib/dashboard-data";
import { inputCls, wpStatusLabel } from "../constants";
import { FormActions, Modal } from "../primitives";

export function WorkPackageDialog({
  wp,
  projects,
  onClose,
  onSave,
}: {
  wp: WorkPackage;
  projects: Project[];
  onClose: () => void;
  onSave: (w: WorkPackage) => void;
}) {
  const [form, setForm] = useState<WorkPackage & { tagsText: string }>({
    ...wp,
    tagsText: (wp.tags ?? []).join(", "),
  });
  const isNew = !wp.title;
  const valid = form.title.trim().length > 1;

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
