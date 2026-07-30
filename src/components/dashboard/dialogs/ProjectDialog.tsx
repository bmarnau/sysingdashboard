/**
 * Formulardialog zum Anlegen und Bearbeiten eines Projekts.
 * Verhaltensneutral aus dashboard.tsx extrahiert (Sprint 05).
 */
import { useState } from "react";
import type { Project, ProjectStatus } from "@/lib/dashboard-data";
import { inputCls, projectStatusLabel } from "../constants";
import { FormActions, Modal } from "../primitives";

export function ProjectDialog({
  project,
  onClose,
  onSave,
}: {
  project: Project;
  onClose: () => void;
  onSave: (p: Project) => void;
}) {
  const [form, setForm] = useState<Project & { teamText: string }>({
    ...project,
    teamText: (project.team ?? []).join(", "),
  });
  const isNew = !project.name;
  const valid = form.name.trim().length > 1 && form.client.trim().length > 1;

  return (
    <Modal
      title={isNew ? "Neues Projekt anlegen" : `Projekt bearbeiten – ${project.id}`}
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Projektname
          <input
            className={`mt-1 ${inputCls}`}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="z. B. Datacenter Migration"
          />
        </label>
        <label className="text-xs font-medium">
          Kunde
          <input
            className={`mt-1 ${inputCls}`}
            value={form.client}
            onChange={(e) => setForm({ ...form, client: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium">
          Projektleitung
          <input
            className={`mt-1 ${inputCls}`}
            value={form.lead ?? ""}
            onChange={(e) => setForm({ ...form, lead: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium">
          Start
          <input
            type="date"
            className={`mt-1 ${inputCls}`}
            value={form.start ?? ""}
            onChange={(e) => setForm({ ...form, start: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium">
          Deadline
          <input
            type="date"
            className={`mt-1 ${inputCls}`}
            value={form.deadline ?? ""}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium">
          Budget (h)
          <input
            type="number"
            min="0"
            step="1"
            className={`mt-1 ${inputCls}`}
            value={form.budget ?? 0}
            onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
          />
        </label>
        <label className="text-xs font-medium">
          Status
          <select
            className={`mt-1 ${inputCls}`}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
          >
            {(["on_track", "at_risk", "delayed", "abgeschlossen"] as ProjectStatus[]).map((s) => (
              <option key={s} value={s} className="bg-background">
                {projectStatusLabel[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Team (Komma-getrennt)
          <input
            className={`mt-1 ${inputCls}`}
            value={form.teamText}
            onChange={(e) => setForm({ ...form, teamText: e.target.value })}
            placeholder="AB, CD, EF"
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
          const { teamText, ...rest } = form;
          onSave({
            ...rest,
            team: teamText
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          });
        }}
      />
    </Modal>
  );
}
