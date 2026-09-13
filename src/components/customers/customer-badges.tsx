/**
 * BSF-03: kleine, reine Anzeige-Badges für den eigenen Verantwortungs- und
 * Zugriffsstatus. Kein Datenzugriff, keine Fachlogik.
 */
import { Eye, PenLine, UserCheck } from "lucide-react";
import type { CustomerAccessLevel } from "@/lib/customer-data/my-customers";
import { accessLevelText, responsibilityStatusText } from "./customer-status";

const base = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium";

/** Read-/Write-Indikator aus dem eigenen Customer Access (nur Darstellung). */
export function AccessLevelBadge({ level }: { level: CustomerAccessLevel }) {
  const write = level === "write";
  return (
    <span
      className={`${base} ${
        write
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-muted text-muted-foreground"
      }`}
      title={
        write
          ? "Schreibzugriff laut Kundenzugriff. Schreibaktionen erfordern zusätzlich die fachliche Berechtigung."
          : "Lesezugriff laut Kundenzugriff."
      }
    >
      {write ? (
        <PenLine className="size-3" aria-hidden="true" />
      ) : (
        <Eye className="size-3" aria-hidden="true" />
      )}
      {accessLevelText(level)}
    </span>
  );
}

/** Eigener Verantwortungsstatus (fachliche Beziehung, keine Rolle). */
export function ResponsibilityBadge({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span
      className={`${base} ${
        active
          ? "border-success/30 bg-success/15 text-success"
          : "border-border bg-muted text-muted-foreground"
      }`}
    >
      <UserCheck className="size-3" aria-hidden="true" />
      {responsibilityStatusText(status)}
    </span>
  );
}
