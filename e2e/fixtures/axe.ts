/**
 * Dünner Wrapper um `@axe-core/playwright`. Fokussiert auf WCAG 2.1 A/AA –
 * bekannte laute Regeln (region, color-contrast auf shadcn-Defaults) sind
 * bewusst nicht global unterdrückt; einzelne Tests dürfen `.disableRules()`
 * ergänzen und die Begründung im Code dokumentieren.
 */
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

export async function runAxe(page: Page, opts?: { include?: string }): Promise<{
  violationCount: number;
  violations: { id: string; impact?: string | null; nodes: number }[];
}> {
  const builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  if (opts?.include) builder.include(opts.include);
  const results = await builder.analyze();
  return {
    violationCount: results.violations.length,
    violations: results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
    })),
  };
}
