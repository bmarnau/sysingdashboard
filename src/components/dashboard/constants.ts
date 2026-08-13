/**
 * Zentrale Label- und Style-Maps des Dashboards.
 * Rein deklarativ — keine Logik, keine Seiteneffekte.
 */
import type {
  BillingStatus,
  Priority,
  ProjectStatus,
  WorkPackageStatus,
} from "@/lib/dashboard-data";

export type Tab =
  | "projekte"
  | "arbeitspakete"
  | "taetigkeiten"
  | "abrechnung"
  | "avkk"
  | "avkk-management";

export const wpStatusLabel: Record<WorkPackageStatus, string> = {
  offen: "Offen",
  in_arbeit: "In Arbeit",
  wartend: "Wartet",
  erledigt: "Erledigt",
};
export const wpStatusStyles: Record<WorkPackageStatus, string> = {
  offen: "bg-info/15 text-info border-info/30",
  in_arbeit: "bg-primary/15 text-primary border-primary/30",
  wartend: "bg-warning/15 text-warning border-warning/30",
  erledigt: "bg-success/15 text-success border-success/30",
};
export const priorityStyles: Record<Priority, string> = {
  niedrig: "bg-muted text-muted-foreground",
  mittel: "bg-info/20 text-info",
  hoch: "bg-warning/20 text-warning",
  kritisch: "bg-destructive/20 text-destructive",
};
export const projectStatusLabel: Record<ProjectStatus, string> = {
  on_track: "Im Plan",
  at_risk: "Risiko",
  delayed: "Verzug",
  abgeschlossen: "Fertig",
};
export const projectStatusStyles: Record<ProjectStatus, string> = {
  on_track: "bg-success/15 text-success border-success/30",
  at_risk: "bg-warning/15 text-warning border-warning/30",
  delayed: "bg-destructive/15 text-destructive border-destructive/30",
  abgeschlossen: "bg-muted text-muted-foreground border-border",
};
export const billingLabel: Record<BillingStatus, string> = {
  offen: "Offen",
  abgerechnet: "Abgerechnet",
  nicht_abrechenbar: "Nicht abrechenbar",
};
export const billingStyles: Record<BillingStatus, string> = {
  offen: "bg-warning/15 text-warning border-warning/30",
  abgerechnet: "bg-success/15 text-success border-success/30",
  nicht_abrechenbar: "bg-muted text-muted-foreground border-border",
};

/** Einheitliche Eingabefeld-Klasse aller Dashboard-Formulare. */
export const inputCls =
  "h-10 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm outline-none transition focus:border-ring";
