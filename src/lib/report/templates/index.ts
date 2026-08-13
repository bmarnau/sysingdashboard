/** Auflösung von Corporate Templates über austauschbare Provider. */

import { DEFAULT_TEMPLATE, DEFAULT_TEMPLATE_ID, defaultTemplateProvider } from "./default-provider";
import { filesystemTemplateProvider } from "./filesystem-provider";
import type { ReportTemplate, TemplateProvider } from "./types";

let providers: TemplateProvider[] = [filesystemTemplateProvider, defaultTemplateProvider];

/** Ersetzt die Provider-Kette (Tests, spätere Dokumentprovider). */
export function setTemplateProviders(next: TemplateProvider[]): void {
  providers = next.length ? next : [defaultTemplateProvider];
}

export function listTemplateProviders(): readonly TemplateProvider[] {
  return providers;
}

/**
 * Liefert immer ein verwendbares Template. Externe Quellen haben Vorrang,
 * das mitgelieferte Default ist der garantierte Fallback.
 */
export async function resolveTemplate(templateId: string): Promise<ReportTemplate> {
  for (const provider of providers) {
    const template = await provider.getTemplate(templateId);
    if (template) return template;
  }
  return { ...DEFAULT_TEMPLATE };
}

export { DEFAULT_TEMPLATE, DEFAULT_TEMPLATE_ID, defaultTemplateProvider };
export { filesystemTemplateProvider, setTemplateBase, getTemplateBase } from "./filesystem-provider";
export type { ReportTemplate, TemplateProvider } from "./types";
