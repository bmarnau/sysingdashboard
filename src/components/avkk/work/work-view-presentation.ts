import type { DueGroup } from "@/lib/avkk/work-package-work-view.types";

export const dueGroupLabels: Record<DueGroup, string> = {
  OVERDUE: "Überfällig",
  TODAY: "Heute",
  FUTURE: "Später",
  NO_DUE_DATE: "Ohne Fälligkeitsdatum",
};

const statusLabels: Record<string, string> = {
  open: "Offen",
  offen: "Offen",
  in_arbeit: "In Arbeit",
  in_progress: "In Arbeit",
  wartend: "Wartet",
  done: "Erledigt",
  erledigt: "Erledigt",
  active: "Aktiv",
};
export function workStatusLabel(status: string): string {
  return statusLabels[status] ?? status;
}
export function workDateLabel(date: string): string {
  return date.split("-").reverse().join(".");
}
