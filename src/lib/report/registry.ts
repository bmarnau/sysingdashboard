/** Registrierung aller verfügbaren Berichte (ADR-0028). */

import { avkkReportDefinitions } from "./definitions/avkk";
import type { ReportDefinition } from "./types";

const registry = new Map<string, ReportDefinition<never>>();

export function registerReport<T>(definition: ReportDefinition<T>): void {
  registry.set(definition.reportId, definition as unknown as ReportDefinition<never>);
}

export function getReport(reportId: string): ReportDefinition<never> | undefined {
  return registry.get(reportId);
}

export function listReports(): ReportDefinition<never>[] {
  return [...registry.values()].sort((a, b) => a.title.localeCompare(b.title, "de"));
}

for (const definition of avkkReportDefinitions) {
  registerReport(definition);
}
