/**
 * Mitgeliefertes Default-Template („Sysing Neutral").
 *
 * Es ist der garantierte Fallback: Die Anwendung bleibt vollständig
 * benutzbar, auch wenn kein externes Corporate Template erreichbar ist.
 */

import type { ReportTemplate, TemplateProvider } from "./types";

export const DEFAULT_TEMPLATE_ID = "sysing-default";

export const DEFAULT_TEMPLATE: ReportTemplate = {
  id: DEFAULT_TEMPLATE_ID,
  name: "Sysing Neutral (mitgeliefert)",
  source: "default",
  version: "1.0.0",
  organization: "Sysing",
  logoText: "SY",
  brand: {
    primary: [30, 64, 175],
    muted: [110, 110, 110],
    tableHeaderText: [255, 255, 255],
    fontFamily: "helvetica",
  },
  header: { showLogo: true, showDocumentId: true },
  footer: {
    note: "Sysing Dashboard — vertraulich, nur für den internen Gebrauch",
    showPageNumbers: true,
  },
  page: { format: "a4", marginMm: 18 },
};

export const defaultTemplateProvider: TemplateProvider = {
  id: "default",
  async getTemplate(templateId: string): Promise<ReportTemplate | null> {
    if (templateId === DEFAULT_TEMPLATE_ID) return { ...DEFAULT_TEMPLATE };
    return null;
  },
};
