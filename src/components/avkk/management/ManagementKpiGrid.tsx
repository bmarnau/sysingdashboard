/**
 * Kennzahlenkopf der Führungssicht. Jede Kennzahl ist anklickbar und setzt den
 * zugehörigen Drill-down-Filter — keine Black-Box-KPI.
 */
import type { ManagementSummary } from "@/lib/avkk/management";

export interface KpiDefinition {
  id: string;
  label: string;
  value: number;
  hint: string;
  tone: "neutral" | "warn" | "danger";
}

const TONE: Record<KpiDefinition["tone"], string> = {
  neutral: "border-border bg-secondary/30",
  warn: "border-warning/40 bg-warning/10",
  danger: "border-destructive/40 bg-destructive/10",
};

export function kpisOf(summary: ManagementSummary): KpiDefinition[] {
  return [
    {
      id: "open",
      label: "Offene AVKK-Aufgaben",
      value: summary.open,
      hint: "Nicht vollständig bewertet oder gefährdet",
      tone: "neutral",
    },
    {
      id: "atRisk",
      label: "Gefährdet",
      value: summary.atRisk,
      hint: "Frühindikator des AVKK-Dienstes",
      tone: "danger",
    },
    {
      id: "critical",
      label: "Kritische Konsequenz",
      value: summary.critical,
      hint: "Schweregrad „kritisch" erfasst",
      tone: "danger",
    },
    {
      id: "overdue",
      label: "Überfällig",
      value: summary.overdue,
      hint: "Termin überschritten",
      tone: "warn",
    },
    {
      id: "competenceGap",
      label: "Kompetenzdefizit",
      value: summary.competenceGap,
      hint: "Voraussetzung fehlt oder nur teilweise vorhanden",
      tone: "warn",
    },
    {
      id: "highConsequence",
      label: "Hohe Konsequenz",
      value: summary.highConsequence,
      hint: "Schweregrad „hoch" oder höher",
      tone: "warn",
    },
    {
      id: "incomplete",
      label: "Unvollständig bewertet",
      value: summary.incomplete,
      hint: "A/V/K/K noch nicht vollständig erfasst",
      tone: "neutral",
    },
    {
      id: "withoutResponsibility",
      label: "Ohne Verantwortung",
      value: summary.withoutResponsibility,
      hint: "Keine gültige Verantwortungszuordnung",
      tone: "warn",
    },
  ];
}

export function ManagementKpiGrid({
  summary,
  activeId,
  onSelect,
}: {
  summary: ManagementSummary;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {kpisOf(summary).map((kpi) => (
        <li key={kpi.id}>
          <button
            type="button"
            aria-pressed={activeId === kpi.id}
            onClick={() => onSelect(kpi.id)}
            className={`w-full rounded-lg border p-3 text-left transition hover:bg-secondary/60 ${TONE[kpi.tone]} ${
              activeId === kpi.id ? "ring-2 ring-primary" : ""
            }`}
          >
            <span className="block text-xs text-muted-foreground">{kpi.label}</span>
            <span className="mt-0.5 block text-2xl font-semibold tabular-nums">{kpi.value}</span>
            <span className="mt-1 block text-[11px] text-muted-foreground">{kpi.hint}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
