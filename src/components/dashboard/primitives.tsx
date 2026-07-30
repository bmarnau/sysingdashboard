/**
 * Präsentations-Primitives des Dashboards.
 * Ausschließlich Darstellung — kein Domain-Zugriff, kein Store, keine Effekte.
 */
import type { ReactNode } from "react";
import { Clock, Search } from "lucide-react";

export function Card({ children }: { children: ReactNode }) {
  return (
    <div
      className="card-print overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-elevated)]"
      style={{ background: "var(--gradient-card)" }}
    >
      {children}
    </div>
  );
}

export function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export function PeriodToggle({
  active,
  onToggle,
  periodLabel,
  count,
  total,
}: {
  active: boolean;
  onToggle: () => void;
  periodLabel: string;
  count: number;
  total: number;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      title={active ? `Filter aufheben – alle ${total} anzeigen` : `Auf ${periodLabel} eingrenzen`}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      <Clock className="size-3.5" />
      {active ? (
        <span>
          {periodLabel} · {count} von {total}
        </span>
      ) : (
        <span>Auf {periodLabel || "Periode"} filtern</span>
      )}
    </button>
  );
}

export function KpiCard({
  icon,
  label,
  value,
  sub,
  progress,
  tone = "primary",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  progress?: number;
  tone?: "primary" | "success" | "warning" | "info";
}) {
  const toneMap = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/15 text-info",
  };
  return (
    <div
      className="card-print relative overflow-hidden rounded-2xl border border-border p-5 shadow-[var(--shadow-elevated)]"
      style={{ background: "var(--gradient-card)" }}
    >
      <div className="flex items-start justify-between">
        <div className={`grid size-10 place-items-center rounded-lg ${toneMap[tone]}`}>{icon}</div>
      </div>
      <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: progress > 100 ? "var(--destructive)" : "var(--gradient-primary)",
            }}
          />
        </div>
      )}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-input bg-secondary/40 pl-9 pr-3 text-sm outline-none transition focus:border-ring"
      />
    </div>
  );
}

export function IconBtn({
  onClick,
  variant = "default",
  title,
  children,
}: {
  onClick: () => void;
  variant?: "default" | "danger";
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`grid size-7 place-items-center rounded-md transition ${
        variant === "danger"
          ? "text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm no-print"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-2xl rounded-2xl border border-border p-6 shadow-[var(--shadow-elevated)]"
        style={{ background: "var(--gradient-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function FormActions({
  onCancel,
  onSave,
  saveDisabled,
  saveLabel = "Speichern",
}: {
  onCancel: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button
        onClick={onCancel}
        className="h-9 rounded-md border border-border bg-secondary/40 px-4 text-sm hover:bg-secondary"
      >
        Abbrechen
      </button>
      <button
        disabled={saveDisabled}
        onClick={onSave}
        className="h-9 rounded-md px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
        style={{ background: "var(--gradient-primary)" }}
      >
        {saveLabel}
      </button>
    </div>
  );
}
