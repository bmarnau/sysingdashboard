/**
 * Dialog für Engineer-Stammdaten und Arbeitszeitmodelle.
 * Verhaltensneutral aus dashboard.tsx extrahiert (Sprint 05).
 */
import { useState } from "react";
import type { Engineer } from "@/lib/dashboard-data";
import type { UserProfile } from "@/lib/user-management";
import {
  EngineerTargetTimeService,
  deriveCounterpart,
  type EngineerTargetTimeModel,
} from "@/lib/engineer-target-time";
import { inputCls } from "../constants";
import { FormActions, Modal } from "../primitives";

export function EngineerDialog({
  engineerState,
  currentUser,
  targetTimeModels,
  onOpenWorkingTime,
  onClose,
  onSave,
}: {
  engineerState: Engineer;
  currentUser: UserProfile | null;
  targetTimeModels: EngineerTargetTimeModel[];
  onOpenWorkingTime: () => void;
  onClose: () => void;
  onSave: (e: Engineer, userPatch: { email: string; phone: string } | null) => void;
}) {
  const now = new Date();
  const activeModel = EngineerTargetTimeService.getActiveTargetTimeModel(
    targetTimeModels,
    now,
    "self",
  );
  const derived = activeModel ? deriveCounterpart(activeModel, now) : null;

  // Engineer-Felder werden – wenn ein aktives Arbeitszeitmodell existiert –
  // aus dem Modell abgeleitet und im Formular gesperrt.
  const initialForm: Engineer = derived
    ? {
        ...engineerState,
        monthlyTargetHours: Math.round(derived.monthlyHours * 10) / 10,
        weeklyTarget: Math.round(derived.weeklyHours * 10) / 10,
        workloadPercent: 100,
      }
    : { ...engineerState };

  const [form, setForm] = useState<Engineer>(initialForm);
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [phone, setPhone] = useState(currentUser?.phone ?? "");
  const valid =
    form.name.trim().length > 1 && form.role.trim().length > 1 && form.company.trim().length > 1;
  const genInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const locked = !!derived;
  const lockedCls = locked ? " cursor-not-allowed opacity-60" : "";

  return (
    <Modal title="Engineer-Profil" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="col-span-1 sm:col-span-2 text-xs font-medium">
          Name
          <input
            className={`mt-1 ${inputCls}`}
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value, initials: genInitials(e.target.value) })
            }
          />
        </label>
        <label className="text-xs font-medium">
          Rolle
          <input
            className={`mt-1 ${inputCls}`}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium">
          Unternehmen
          <input
            className={`mt-1 ${inputCls}`}
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium">
          E-Mail
          <input
            type="email"
            className={`mt-1 ${inputCls}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!currentUser}
            placeholder={currentUser ? "name@firma.de" : "kein Benutzerprofil verknüpft"}
          />
          {currentUser && (
            <span className="mt-1 block text-[10px] text-muted-foreground">
              wird auf Benutzerprofil „{currentUser.displayName}" gespeichert
            </span>
          )}
        </label>
        <label className="text-xs font-medium">
          Telefon
          <input
            className={`mt-1 ${inputCls}`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={!currentUser}
            placeholder="+49 …"
          />
        </label>
        <label className="text-xs font-medium">
          Initialen
          <input
            className={`mt-1 ${inputCls}`}
            value={form.initials}
            maxLength={2}
            onChange={(e) =>
              setForm({ ...form, initials: e.target.value.toUpperCase().slice(0, 2) })
            }
          />
        </label>

        <div className="col-span-1 sm:col-span-2 mt-2 rounded-md border border-border bg-secondary/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Arbeitszeit
            </div>
            <button
              type="button"
              onClick={onOpenWorkingTime}
              className="rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-xs font-medium hover:bg-secondary"
            >
              Arbeitszeitmodell öffnen
            </button>
          </div>
          {derived ? (
            <p className="mb-3 text-[11px] text-muted-foreground">
              Diese Werte stammen aus dem aktiven Arbeitszeitmodell
              {activeModel?.description ? ` „${activeModel.description}"` : ""} und sind hier nicht
              editierbar. Änderungen bitte über das Arbeitszeitmodell vornehmen.
            </p>
          ) : (
            <p className="mb-3 text-[11px] text-muted-foreground">
              Kein aktives Arbeitszeitmodell hinterlegt – Eingaben werden auf das Profil
              zurückgeschrieben. Empfehlung: Arbeitszeitmodell anlegen.
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-xs font-medium">
              Wochenziel (h, legacy)
              <input
                type="number"
                min={1}
                className={`mt-1 ${inputCls}${lockedCls}`}
                value={form.weeklyTarget}
                disabled={locked}
                readOnly={locked}
                onChange={(e) => setForm({ ...form, weeklyTarget: Number(e.target.value) })}
              />
            </label>
            <label className="text-xs font-medium">
              Monatssoll (h)
              <input
                type="number"
                min={1}
                className={`mt-1 ${inputCls}${lockedCls}`}
                value={form.monthlyTargetHours ?? 168}
                disabled={locked}
                readOnly={locked}
                onChange={(e) =>
                  setForm({ ...form, monthlyTargetHours: Number(e.target.value) || 168 })
                }
              />
            </label>
            <label className="text-xs font-medium">
              Arbeitszeitmodell (%)
              <input
                type="number"
                min={1}
                max={100}
                step={5}
                className={`mt-1 ${inputCls}${lockedCls}`}
                value={form.workloadPercent ?? 100}
                disabled={locked}
                readOnly={locked}
                onChange={(e) =>
                  setForm({
                    ...form,
                    workloadPercent: Math.max(1, Math.min(100, Number(e.target.value) || 100)),
                  })
                }
              />
            </label>
          </div>
        </div>
      </div>
      <FormActions
        onCancel={onClose}
        saveDisabled={!valid}
        onSave={() =>
          onSave(form, currentUser ? { email: email.trim(), phone: phone.trim() } : null)
        }
      />
    </Modal>
  );
}
