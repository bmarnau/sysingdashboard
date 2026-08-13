/**
 * Template-Quelle „konfiguriertes Verzeichnis".
 *
 * Der Pfad wird **niemals** in der Fachlogik hardcodiert, sondern zur
 * Laufzeit konfiguriert (`VITE_REPORT_TEMPLATE_BASE` bzw. gesetzter Wert).
 * Im Container zeigt die Basis auf ein gemountetes Volume, das statisch
 * ausgeliefert wird; später kann dieselbe Schnittstelle einen Dokument-
 * provider (z. B. SharePoint) bedienen.
 *
 * Fällt die Quelle aus, liefert der Provider `null` — der Aufrufer nutzt
 * dann das mitgelieferte Default-Template.
 */

import { logger } from "@/lib/logger";
import type { ReportTemplate, TemplateProvider } from "./types";

const ENV_BASE = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[
  "VITE_REPORT_TEMPLATE_BASE"
] ?? "") as string;

let configuredBase: string | null = ENV_BASE || null;

/** Setzt die Template-Basis zur Laufzeit (Konfiguration, Tests, Container). */
export function setTemplateBase(base: string | null): void {
  configuredBase = base && base.trim() ? base.replace(/\/+$/, "") : null;
}

export function getTemplateBase(): string | null {
  return configuredBase;
}

function isTemplate(value: unknown): value is ReportTemplate {
  if (!value || typeof value !== "object") return false;
  const t = value as Partial<ReportTemplate>;
  return (
    typeof t.id === "string" &&
    typeof t.name === "string" &&
    typeof t.version === "string" &&
    !!t.brand &&
    Array.isArray(t.brand.primary) &&
    t.brand.primary.length === 3
  );
}

export const filesystemTemplateProvider: TemplateProvider = {
  id: "filesystem",
  async getTemplate(templateId: string): Promise<ReportTemplate | null> {
    const base = configuredBase;
    if (!base) return null;
    try {
      const response = await fetch(`${base}/${templateId}.json`, { cache: "no-store" });
      if (!response.ok) return null;
      const parsed: unknown = await response.json();
      if (!isTemplate(parsed)) {
        logger.warn("report-template: Datei entspricht nicht dem Template-Vertrag", { templateId });
        return null;
      }
      return { ...parsed, source: "filesystem" };
    } catch (error) {
      logger.warn("report-template: externe Quelle nicht erreichbar, Fallback aktiv", {
        templateId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },
};
