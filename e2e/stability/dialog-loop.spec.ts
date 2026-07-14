import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

/**
 * Dialog-Loop-Stabilität (Prompt 2A.7). Öffnet/schließt einen sichtbaren
 * Dialog mehrfach und misst die Gesamtdauer. Kein Memory-Growth-Guard —
 * das dokumentiert der Ops-Report als Baseline.
 */
test("dialog loop stability", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: /systemstatus|system-status/i }).first();
  const t0 = Date.now();
  let iterations = 0;
  const targetMs = 8000;
  while (Date.now() - t0 < targetMs && iterations < 20) {
    try {
      await trigger.click({ timeout: 2000 });
      await page.keyboard.press("Escape");
      iterations++;
    } catch {
      break;
    }
  }
  const total = Date.now() - t0;
  mkdirSync("test-report", { recursive: true });
  writeFileSync(
    "test-report/stability-raw.json",
    JSON.stringify({ dialogLoopMs: total, iterations, at: new Date().toISOString() }, null, 2),
  );
  expect(iterations).toBeGreaterThan(0);
});
