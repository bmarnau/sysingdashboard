import type { KioskDomainSnapshot } from "@/lib/kiosk/kiosk-contract";
import type { ProjectControllingResult } from "@/lib/project-controlling/project-controlling-contract";

export interface InternalKioskSnapshotProjection {
  period: {
    from: string;
    to: string;
  };
  observedAt: string | null;
  domains: KioskDomainSnapshot[];
}

function internalLevel(result: ProjectControllingResult): KioskDomainSnapshot["level"] {
  return result.latestPublishedAt ? "ok" : "unknown";
}

function freshnessNote(result: ProjectControllingResult): string | undefined {
  return result.latestPublishedAt
    ? undefined
    : "Datenstand der internen Quelle ist unbekannt.";
}

export function mapInternalKioskSnapshot(
  result: ProjectControllingResult,
): InternalKioskSnapshotProjection {
  const observedAt = result.latestPublishedAt;
  const level = internalLevel(result);
  const note = freshnessNote(result);

  return {
    period: {
      from: result.filters.from,
      to: result.filters.to,
    },
    observedAt,
    domains: [
      {
        id: "projects",
        title: "Projekte",
        level,
        sourceKind: "internal",
        observedAt,
        metrics: [
          {
            label: "Projekte mit Leistung im Zeitraum",
            value: result.summary.projects,
            level,
          },
          {
            label: "Kunden mit Leistung im Zeitraum",
            value: result.summary.customers,
            level,
          },
        ],
        note,
      },
      {
        id: "workPackages",
        title: "Arbeitspakete",
        level,
        sourceKind: "internal",
        observedAt,
        metrics: [
          {
            label: "Arbeitspakete mit Leistung im Zeitraum",
            value: result.summary.workPackages,
            level,
          },
          {
            label: "Tätigkeiten: AP-Kategorie nicht publiziert",
            value: result.completeness.categoryUnobservedRows,
            level:
              result.completeness.categoryUnobservedRows > 0 && level !== "unknown"
                ? "warning"
                : level,
          },
          {
            label: "Tätigkeiten: AP-Kategorie unbekannt",
            value: result.completeness.categoryUnknownRows,
            level:
              result.completeness.categoryUnknownRows > 0 && level !== "unknown"
                ? "warning"
                : level,
          },
        ],
        note,
      },
      {
        id: "activities",
        title: "Tätigkeiten",
        level,
        sourceKind: "internal",
        observedAt,
        metrics: [
          { label: "Tätigkeiten", value: result.summary.activities, level },
          { label: "Gesamtstunden", value: result.summary.totalHours, level, unit: "h" },
          {
            label: "Abrechenbare Stunden",
            value: result.summary.billableHours,
            level,
            unit: "h",
          },
          {
            label: "Nicht abrechenbare Stunden",
            value: result.summary.nonBillableHours,
            level,
            unit: "h",
          },
          {
            label: "Abrechenbarer Anteil",
            value: result.summary.billableQuotePercent,
            level,
            unit: "%",
          },
        ],
        note,
      },
    ],
  };
}
