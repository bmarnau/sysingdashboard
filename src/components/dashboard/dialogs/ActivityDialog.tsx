/**
 * Formulardialog zum Anlegen und Bearbeiten einer Tätigkeit.
 * Verhaltensneutral aus dashboard.tsx extrahiert (Sprint 05).
 */
import { useState } from "react";
import { FolderKanban } from "lucide-react";
import type { Activity, BillingStatus, Project, WorkPackage } from "@/lib/dashboard-data";
import { fmtEuro } from "../formatters";
import { billingLabel, inputCls } from "../constants";
import { FormActions, Modal } from "../primitives";
import { validateActivity } from "../domain";

export function ActivityDialog({
  activity,
  workPackages,
  projects,
  onClose,
  onSave,
}: {
  activity: Activity;
  workPackages: WorkPackage[];
  projects: Project[];
  onClose: () => void;
  onSave: (a: Activity) => void;
}) {
  const [form, setForm] = useState<Activity>({ ...activity });
  const isNew = !activity.title;
  const errors = validateActivity(form);
  const valid = Object.keys(errors).length === 0;

  const wp = form.workPackageId ? workPackages.find((w) => w.id === form.workPackageId) : null;
  const project = wp?.projectId ? projects.find((p) => p.id === wp.projectId) : null;
  const amount = form.billable ? (Number(form.duration) || 0) * (Number(form.hourlyRate) || 0) : 0;
  const errCls = "mt-1 text-[11px] text-destructive";

  return (
    <Modal
      title={isNew ? "Neue Tätigkeit erfassen" : `Tätigkeit bearbeiten – ${activity.id}`}
      onClose={onClose}
    >
      <p className="mb-3 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-[11px] text-info">
        Abrechnung erfolgt ausschließlich auf Ebene der Tätigkeit. Zuordnung zu Arbeitspaket oder
        Projekt ist optional.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Tätigkeit
          <input
            className={`mt-1 ${inputCls}`}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Was wurde gemacht?"
            aria-invalid={!!errors.title}
          />
          {errors.title && <p className={errCls}>{errors.title}</p>}
        </label>
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Arbeitspaket (optional)
          <select
            className={`mt-1 ${inputCls}`}
            value={form.workPackageId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              const w = id ? workPackages.find((x) => x.id === id) : null;
              setForm({ ...form, workPackageId: id, client: form.client || w?.client });
            }}
          >
            <option value="">— Ohne Arbeitspaket —</option>
            {workPackages.map((w) => {
              const proj = w.projectId ? projects.find((p) => p.id === w.projectId) : null;
              return (
                <option key={w.id} value={w.id} className="bg-background">
                  {w.title} {proj ? `· ${proj.name}` : "· projektlos"}
                </option>
              );
            })}
          </select>
          {wp && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Zuordnung:{" "}
              {project ? (
                <span>
                  <FolderKanban className="mr-1 inline size-3" />
                  Projekt <span className="text-foreground">{project.name}</span>
                </span>
              ) : (
                <span className="italic">Arbeitspaket ohne Projekt</span>
              )}
            </p>
          )}
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
          Datum
          <input
            type="date"
            className={`mt-1 ${inputCls}`}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            aria-invalid={!!errors.date}
          />
          {errors.date && <p className={errCls}>{errors.date}</p>}
        </label>
        <label className="text-xs font-medium">
          Uhrzeit
          <input
            type="time"
            className={`mt-1 ${inputCls}`}
            value={form.time ?? ""}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium">
          Dauer (h)
          <input
            type="number"
            min="0.25"
            step="0.25"
            className={`mt-1 ${inputCls}`}
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
            aria-invalid={!!errors.duration}
          />
          {errors.duration && <p className={errCls}>{errors.duration}</p>}
        </label>
        <label className="text-xs font-medium">
          Stundensatz (€)
          <input
            type="number"
            min="0"
            step="1"
            disabled={!form.billable}
            className={`mt-1 ${inputCls} disabled:opacity-50`}
            value={form.hourlyRate}
            onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })}
            aria-invalid={!!errors.hourlyRate}
          />
          {form.billable ? (
            errors.hourlyRate && <p className={errCls}>{errors.hourlyRate}</p>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Nur für abrechenbare Tätigkeiten.
            </p>
          )}
        </label>
        <label className="flex items-center gap-2 text-xs font-medium pt-5">
          <input
            type="checkbox"
            checked={form.billable}
            onChange={(e) => {
              const next = e.target.checked;
              setForm({
                ...form,
                billable: next,
                hourlyRate: next ? form.hourlyRate : 0,
                billingStatus: next
                  ? form.billingStatus === "nicht_abrechenbar"
                    ? "offen"
                    : form.billingStatus
                  : "nicht_abrechenbar",
              });
            }}
            className="h-4 w-4 accent-primary"
          />
          Abrechenbar
        </label>
        <label className="text-xs font-medium">
          Abrechnungsstatus
          <select
            disabled={!form.billable}
            className={`mt-1 ${inputCls} disabled:opacity-50`}
            value={form.billingStatus}
            onChange={(e) => setForm({ ...form, billingStatus: e.target.value as BillingStatus })}
            aria-invalid={!!errors.billingStatus}
          >
            {form.billable ? (
              (["offen", "abgerechnet"] as BillingStatus[]).map((s) => (
                <option key={s} value={s} className="bg-background">
                  {billingLabel[s]}
                </option>
              ))
            ) : (
              <option value="nicht_abrechenbar" className="bg-background">
                {billingLabel.nicht_abrechenbar}
              </option>
            )}
          </select>
          {errors.billingStatus && <p className={errCls}>{errors.billingStatus}</p>}
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
        <div className="col-span-1 sm:col-span-2 rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs">
          Betrag:{" "}
          <span className="font-mono font-semibold text-foreground">
            {form.billable ? fmtEuro(amount) : "nicht abrechenbar"}
          </span>
        </div>
      </div>

      <FormActions
        onCancel={onClose}
        saveDisabled={!valid}
        saveLabel={isNew ? "Buchen" : "Speichern"}
        onSave={() => onSave(form)}
      />
    </Modal>
  );
}
