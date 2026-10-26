import type { DueGroup } from "@/lib/avkk/work-package-work-view.types";

export const dueGroupLabels: Record<DueGroup, string> = {
  OVERDUE: "Überfällig",
  TODAY: "Heute",
  FUTURE: "Später",
  NO_DUE_DATE: "Ohne Fälligkeitsdatum",
  DONE: "Erledigt",
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
  const known = statusLabels[status.toLowerCase()];
  if (known) return known;
  const readable = status.replace(/[_-]+/g, " ").trim();
  return readable ? readable.charAt(0).toLocaleUpperCase("de") + readable.slice(1) : "Unbekannt";
}
export function workDateLabel(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : "Datum unbekannt";
}

/** Ergänzt gleichlautende Bezeichnungen um eine neutrale laufende Nummer (ohne IDs). */
export function disambiguateLabels<T extends { label: string }>(items: readonly T[]): T[] {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(item.label, (totals.get(item.label) ?? 0) + 1);
  const seen = new Map<string, number>();
  return items.map((item) => {
    if ((totals.get(item.label) ?? 0) < 2) return item;
    const index = (seen.get(item.label) ?? 0) + 1;
    seen.set(item.label, index);
    return { ...item, label: `${item.label} (gleichnamig ${index})` };
  });
}

export const STALE_FILTER_LABEL = "Nicht mehr in den aktuellen Daten";
