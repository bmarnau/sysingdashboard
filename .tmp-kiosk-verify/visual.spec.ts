import { readFileSync } from "node:fs";
import { test, expect } from "../e2e/fixtures/test-instance";

const source = JSON.parse(readFileSync("docs/examples/kiosk-demo-dataset-v1.json", "utf8"));
const dataset = {
  version: source.snapshot.datasetVersion,
  loadedAt: source.snapshot.observedAt,
  domains: source.snapshot.domains,
};

test.use({ role: "kiosk" });

for (const viewport of [
  { width: 1920, height: 1080, name: "full-hd" },
  { width: 1280, height: 900, name: "compact" },
]) {
  test(`${viewport.name} wallboard`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.addInitScript((value) => localStorage.setItem("northbit-kiosk-demo-dataset-v1", JSON.stringify(value)), dataset);
    await page.goto("/kiosk");
    await expect(page.getByRole("heading", { name: "Info-Kiosk" })).toBeVisible();
    await expect(page.getByText("DEMO-DATEN — KEINE LIVE-DATEN")).toBeVisible();
    await expect(page.getByRole("button", { name: "Abmelden" })).toBeVisible();
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(metrics.scrollWidth).toBe(metrics.clientWidth);
    expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.clientWidth);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `.tmp-kiosk-verify/screenshots/${viewport.name}.png` });
  });
}
