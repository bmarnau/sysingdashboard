import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures/test-instance";
import { runAxe } from "../../fixtures/axe";
import { AP_IDS, installWorkPackageWorkViewMock } from "../../fixtures/work-package-work-view-e2e";

async function openWorkView(page: Page, url = "/verantwortungen") {
  await page.goto(url);
  await page.getByRole("tab", { name: "Arbeitspakete", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Arbeitspaket-Arbeitssicht", level: 1 }),
  ).toBeVisible();
}
async function visibleIds(page: Page) {
  return page
    .locator("[data-work-package-id]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-work-package-id")),
    );
}

test.describe("BSF-03E P3b operative Arbeitssicht", () => {
  test.use({ role: "teamlead", timezoneId: "Pacific/Honolulu" });

  test("grouping preserves the AP set and separates owner/deputy without a browser clock", async ({
    page,
  }) => {
    await installWorkPackageWorkViewMock(page);
    await openWorkView(page);
    await expect(page.locator("[data-work-package-id]")).toHaveCount(4);
    for (const mode of ["customer", "owner", "due"]) {
      await page.getByLabel("Gruppieren nach").selectOption(mode);
      expect((await visibleIds(page)).sort()).toEqual([...AP_IDS].sort());
      await expect(page.getByText("Berta Beispiel", { exact: true })).toHaveCount(1);
      await expect(
        page
          .locator('[data-work-package-id="ap-future"]')
          .getByText("Nicht zugeordnet", { exact: true }),
      ).toBeVisible();
    }
    for (const label of ["Überfällig", "Heute", "Später", "Ohne Fälligkeitsdatum"]) {
      await expect(
        page.getByRole("heading", { name: new RegExp(`^${label}`), level: 2 }),
      ).toBeVisible();
    }
    await expect(page.getByText(/04\.10\.2026.*Europe\/Berlin/)).toBeVisible();
    await expect(page.getByText("person-ada", { exact: true })).toHaveCount(0);
  });

  test("sort, filters and reset are independent; reload restores the authorized source", async ({
    page,
  }) => {
    await installWorkPackageWorkViewMock(page);
    await openWorkView(page);
    await expect(page.locator("[data-work-package-id]")).toHaveCount(4);
    await page.getByLabel("Sortieren nach").selectOption("title");
    expect((await visibleIds(page)).slice(0, 2)).toEqual(["ap-today", "ap-overdue"]);
    await page.getByLabel("Sortierrichtung").selectOption("desc");
    expect((await visibleIds(page)).slice(0, 2)).toEqual(["ap-overdue", "ap-today"]);
    await page.getByLabel("Verantwortlichen filtern").selectOption("UNASSIGNED");
    await page.getByLabel("Gruppieren nach").selectOption("due");
    expect((await visibleIds(page)).sort()).toEqual(["ap-future", "ap-no-due"]);
    await page.getByLabel("Fälligkeit filtern").selectOption("NO_DUE_DATE");
    expect(await visibleIds(page)).toEqual(["ap-no-due"]);
    await page.getByRole("button", { name: "Filter zurücksetzen" }).click();
    await expect(page.getByLabel("Gruppieren nach")).toHaveValue("due");
    await expect(page.getByLabel("Sortieren nach")).toHaveValue("title");
    await expect(page.locator("[data-work-package-id]")).toHaveCount(4);
    await page.reload();
    await page.getByRole("tab", { name: "Arbeitspakete", exact: true }).click();
    await expect(page.locator("[data-work-package-id]")).toHaveCount(4);
  });

  test("URL and local storage manipulation do not add browser scope to the request", async ({
    page,
  }) => {
    const server = await installWorkPackageWorkViewMock(page);
    await page.addInitScript(() => {
      localStorage.setItem("role", "systemadministrator");
      localStorage.setItem("systemhouseId", "foreign-systemhouse");
    });
    await openWorkView(
      page,
      "/verantwortungen?systemhouseId=foreign-systemhouse&customerId=foreign-customer&role=administrator&referenceInstant=2099-01-01",
    );
    await expect(page.locator("[data-work-package-id]")).toHaveCount(4);
    expect((await visibleIds(page)).sort()).toEqual([...AP_IDS].sort());
    expect(server.requests.length).toBeGreaterThan(0);
    expect(server.requests.join("\n")).not.toMatch(
      /systemhouseId|customerId|referenceInstant|foreign-|administrator/,
    );
    await expect(page.getByText("foreign-customer", { exact: true })).toHaveCount(0);
  });

  test("server denial, empty result and retry never preserve old AP data", async ({ page }) => {
    const server = await installWorkPackageWorkViewMock(page);
    await openWorkView(page);
    await expect(page.locator("[data-work-package-id]")).toHaveCount(4);
    server.setOutcome("deny");
    await page.getByRole("button", { name: "Arbeitspakete aktualisieren" }).click();
    await expect(page.getByRole("alert")).toContainText(/nicht geladen/);
    await expect(page.locator("[data-work-package-id]")).toHaveCount(0);
    server.setOutcome("empty");
    await page.getByRole("button", { name: "Arbeitspakete aktualisieren" }).click();
    await expect(page.getByText(/Keine Arbeitspakete im freigegebenen Bereich/)).toBeVisible();
    server.setOutcome("ok");
    await page.getByRole("button", { name: "Arbeitspakete aktualisieren" }).click();
    await expect(page.locator("[data-work-package-id]")).toHaveCount(4);
  });

  test("shows loading until the server has answered", async ({ page }) => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await installWorkPackageWorkViewMock(page, { beforeRead: () => pending });
    await openWorkView(page);
    await expect(page.getByText(/Arbeitspakete werden geladen/)).toBeVisible();
    await expect(page.locator("[data-work-package-id]")).toHaveCount(0);
    release();
    await expect(page.locator("[data-work-package-id]")).toHaveCount(4);
  });

  test("1280, 640 and 390 pixel layouts retain readable APs without document overflow", async ({
    page,
  }, testInfo) => {
    await installWorkPackageWorkViewMock(page);
    await openWorkView(page);
    await expect(page.locator("[data-work-package-id]")).toHaveCount(4);
    for (const width of [1280, 640, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const dimensions = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scroll, `width=${width}`).toBeLessThanOrEqual(dimensions.client);
      await expect(page.getByLabel("Gruppieren nach")).toBeVisible();
      await expect(page.locator('[data-work-package-id="ap-future"]')).toBeVisible();
      await testInfo.attach(`ap-work-view-${width}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    }
    expect(
      (await runAxe(page, { include: 'section[aria-labelledby="work-package-work-view-heading"]' }))
        .violations,
    ).toEqual([]);
  });
});

test.describe("project manager", () => {
  test.use({ role: "projectmanager" });
  test("can open the same authorized work view", async ({ page }) => {
    await installWorkPackageWorkViewMock(page);
    await openWorkView(page);
    await expect(page.locator("[data-work-package-id]")).toHaveCount(4);
    await page.getByRole("tab", { name: "Personen", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Verantwortungen nach Person" })).toBeVisible();
  });
});

for (const role of ["engineer", "viewer", "customer"] as const) {
  test.describe(`${role} DENY`, () => {
    test.use({ role });
    test("does not read APs even with manipulated URL and local role", async ({ page }) => {
      const server = await installWorkPackageWorkViewMock(page);
      await page.addInitScript(() => {
        localStorage.setItem("role", "teamlead");
      });
      await page.goto("/verantwortungen?role=teamlead&systemhouseId=foreign");
      await expect(page.getByRole("alert")).toContainText(/Keine Berechtigung/);
      await expect(page.locator("[data-work-package-id]")).toHaveCount(0);
      expect(server.requests).toEqual([]);
    });
  });
}
