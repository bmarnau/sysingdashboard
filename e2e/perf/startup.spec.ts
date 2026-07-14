import { test, expect } from "@playwright/test";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Startzeit- und First-Paint-Messung (Prompt 2A.7).
 *
 * Schreibt Rohwerte nach `test-report/perf-raw.json`. Bewusst weiche
 * Assertions (nur `>0`), damit CI-Rauschen nicht zu Falschalarmen führt —
 * die Bewertung erfolgt im Aggregator via Baseline-Delta.
 */
test("dashboard startup timing", async ({ page }) => {
  const t0 = Date.now();
  await page.goto("/", { waitUntil: "load" });
  const loadedAt = Date.now() - t0;

  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const paint = performance.getEntriesByType("paint");
    return {
      domContentLoaded: nav ? nav.domContentLoadedEventEnd : null,
      loadEvent: nav ? nav.loadEventEnd : null,
      firstPaint: paint.find((p) => p.name === "first-paint")?.startTime ?? null,
      firstContentfulPaint: paint.find((p) => p.name === "first-contentful-paint")?.startTime ?? null,
    };
  });

  const record = {
    startupMs: loadedAt,
    timing,
    at: new Date().toISOString(),
  };
  mkdirSync("test-report", { recursive: true });
  writeFileSync("test-report/perf-raw.json", JSON.stringify(record, null, 2));

  expect(loadedAt).toBeGreaterThan(0);
});
