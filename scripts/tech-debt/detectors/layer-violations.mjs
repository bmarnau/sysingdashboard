/**
 * Detektor: Layer-Violations.
 *
 * UI (src/components, src/routes) darf nicht direkt auf Persistenz- oder
 * Azure-Interna zugreifen — nur über Facades (Store-Selectors, azure-service).
 */
import { rel, read, walk, stableId, lineOf } from "../util.mjs";

const FORBIDDEN = [
  {
    tag: "ui-imports-persistence",
    // Direktimport der localStorage-Schicht statt Store-Selectors.
    pattern: /from\s+["']@\/lib\/store\/dashboard-persistence["']/g,
    title: "UI-Direktzugriff auf Persistenz-Schicht",
    impact:
      "Umgeht Store-Selectors und Debounce-Persistenz; erzeugt versteckte Kopplung an localStorage-Layout.",
    recommendation: "useDashboardStore-Selector oder dedizierten Facade-Hook verwenden.",
  },
  {
    tag: "ui-imports-azure-internal",
    // Direktzugriff auf azure/types oder azure/azure-history-store statt azure-service Facade.
    pattern: /from\s+["']@\/lib\/azure\/(?!azure-service|types)[^"']+["']/g,
    title: "UI-Direktzugriff auf Azure-Interna",
    impact:
      "Bricht die Azure-Facade auf; Änderungen am Azure-Schema propagieren ungefiltert in die UI.",
    recommendation: "Ausschließlich `@/lib/azure/azure-service` importieren.",
  },
];

export function detectLayerViolations(ROOT) {
  const findings = [];
  const now = new Date().toISOString();
  const scope = [
    ...walk(`${ROOT}/src/components`, /\.(ts|tsx)$/),
    ...walk(`${ROOT}/src/routes`, /\.(ts|tsx)$/),
  ];

  for (const abs of scope) {
    const relPath = rel(ROOT, abs);
    const text = read(abs);
    for (const rule of FORBIDDEN) {
      let m;
      const re = new RegExp(rule.pattern.source, "g");
      while ((m = re.exec(text)) !== null) {
        const line = lineOf(text, m.index);
        findings.push({
          id: stableId("layer", rule.tag, relPath, line),
          title: rule.title,
          category: "Architektur",
          location: `${relPath}:${line}`,
          description: `Datei importiert ein verbotenes Modul: ${m[0]}`,
          rootCause: "Fehlende Facade-Nutzung; Convenience-Import statt Store-/Service-Abstraktion.",
          impact: rule.impact,
          severity: "Medium",
          likelihood: "Mittel",
          recommendation: rule.recommendation,
          recommendedOrder: 40,
          effort: "klein",
          status: "offen",
          firstDetected: now,
          lastChecked: now,
          version: process.env.TECH_DEBT_VERSION ?? "unknown",
          source: "automated",
          automatedRule: rule.tag,
          priorityTag: "architecture",
        });
      }
    }
  }
  return findings;
}
