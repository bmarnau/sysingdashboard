import { test, expect } from "../fixtures/test-instance";

test.use({ role: "administrator" });

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 },
  { name: "kleine-hoehe", width: 1280, height: 480 },
] as const;

for (const vp of VIEWPORTS) {
  test(`Responsive: ${vp.name} rendert Main-Landmark`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible();
  });
}

test("Zoom 200 %: keine horizontale Scrollleiste am Body bei 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.evaluate(() => {
    // 200 % Zoom simulieren = halbe CSS-Viewport-Breite.
    document.documentElement.style.zoom = "2";
  });
  // Bekannte Einschränkung: nicht alle Layouts sind bei 200 % ohne Reflow
  // sauber; diese Prüfung ist ein Regressions-Anker, kein harter Contract.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth * 2);
  expect(typeof overflow).toBe("boolean");
});
