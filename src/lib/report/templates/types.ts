/** Vertrag der Corporate-Template-Anbindung (ADR-0028). */

export interface ReportTemplateBrand {
  /** RGB-Werte, damit Renderer ohne CSS-Auflösung arbeiten können. */
  primary: [number, number, number];
  muted: [number, number, number];
  tableHeaderText: [number, number, number];
  fontFamily: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  /** Woher das Template stammt — im Bericht nachweisbar. */
  source: "default" | "filesystem" | "remote";
  version: string;
  organization: string;
  /** Logo-Text bzw. Kürzel; Bilddaten sind für den MVP nicht vorgesehen. */
  logoText: string;
  brand: ReportTemplateBrand;
  header: { showLogo: boolean; showDocumentId: boolean };
  footer: { note: string; showPageNumbers: boolean };
  page: { format: "a4"; marginMm: number };
}

export interface TemplateProvider {
  readonly id: string;
  /** Liefert das Template oder `null`, wenn diese Quelle es nicht kennt. */
  getTemplate(templateId: string): Promise<ReportTemplate | null>;
}
