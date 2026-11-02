import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures/test-instance";
import { runAxe } from "../../fixtures/axe";
import { installWorkPackageWorkViewMock } from "../../fixtures/work-package-work-view-e2e";
import type { CockpitResult } from "../../../src/lib/management-cockpit/types";

// Bereits autorisiertes synthetisches Serverergebnis; kein Live-/RLS-Nachweis.
const result: CockpitResult = {
  asOfDate: "2026-10-27",
  dataState: "PARTIAL",
  sources: { controlling: "EMPTY", avkk: "UNAVAILABLE", workPackages: "AVAILABLE" },
  counters: { attentionItems: 1, reasonsByCode: { WP_OVERDUE: 1 } },
  items: [
    {
      key: "demo-scope",
      systemhouseId: "demo-systemhouse",
      customerId: "demo-customer",
      customerName: "DEMO – Kunde A",
      projectKey: null,
      projectName: null,
      dataState: "AVAILABLE",
      reasons: [
        {
          code: "WP_OVERDUE",
          count: 1,
          dataState: "AVAILABLE",
          drilldown: {
            target: "WORK_VIEW",
            systemhouseId: "demo-systemhouse",
            customerId: "demo-customer",
            projectKey: null,
          },
        },
      ],
    },
  ],
};

async function installCockpitRead(page: Page, payload = result) {
  const requests: string[] = [];
  await page.route(
    (url) => url.pathname.includes("/_serverFn/"),
    async (route) => {
      let name = "";
      try {
        const descriptor = new URL(route.request().url()).pathname
          .split("/_serverFn/")[1]
          ?.split("/")[0];
        name = JSON.parse(Buffer.from(descriptor, "base64url").toString("utf8")).export;
      } catch {
        /* Andere Serverfunktionen bleiben beim vorhandenen Harness. */
      }
      if (!/^readManagementCockpitFn(?:_createServerFn_handler)?$/.test(name)) {
        await route.fallback();
        return;
      }
      requests.push(route.request().postData() ?? "");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ result: payload }),
      });
    },
  );
  return requests;
}

for (const role of [
  "projectmanager",
  "teamlead",
  "administrator",
  "systemadministrator",
] as const) {
  test.describe(`L2 Managementcockpit ${role}`, () => {
    test.use({ role });
    test("liest den freigegebenen Bereich und zeigt Handlungsbedarf vor Kennzahlen", async ({
      page,
    }) => {
      const requests = await installCockpitRead(page);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.goto("/managementcockpit");
      await expect(page.getByRole("heading", { name: "Handlungsbedarf" })).toBeVisible();
      await expect(page.getByText("DEMO – Kunde A")).toBeVisible();
      await expect(page.getByText("Nicht verfügbar", { exact: true })).toBeVisible();
      // React StrictMode darf im Dev-Server einen Read erneut starten.
      expect(requests.length).toBeGreaterThan(0);
      const headings = await page.locator("main h2").allTextContents();
      expect(headings.indexOf("Handlungsbedarf")).toBeLessThan(headings.indexOf("Kennzahlen"));
      await expect(page.locator("main form, main input, main button")).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  });
}

for (const role of ["viewer", "customer", "kiosk", "engineer"] as const) {
  test.describe(`L2 Managementcockpit negativ ${role}`, () => {
    test.use({ role });
    test("zeigt keine Cockpitdaten und löst keinen Cockpit-Read aus", async ({ page }) => {
      const requests = await installCockpitRead(page);
      await page.goto("/managementcockpit");
      if (role === "kiosk") await expect(page).toHaveURL(/\/kiosk/);
      else await expect(page.getByRole("alert")).toContainText("Keine Berechtigung");
      await expect(page.getByRole("heading", { name: "Handlungsbedarf" })).toHaveCount(0);
      await expect(page.getByText("DEMO – Kunde A")).toHaveCount(0);
      expect(requests).toHaveLength(0);
    });
  });
}

test.describe("L2 Managementcockpit Darstellung und Drill-down", () => {
  test.use({ role: "teamlead" });
  test("ist bei 1280, 820 und 390 Pixel bedienbar, per Tastatur erreichbar und Axe-konform", async ({
    page,
  }) => {
    await installCockpitRead(page);
    await page.goto("/managementcockpit");
    const link = page.getByRole("link", { name: "Überfällige offene Arbeitspakete" });
    for (const width of [1280, 820, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(link).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
    expect(await runAxe(page, { include: "main" })).toEqual({ violationCount: 0, violations: [] });
    await installWorkPackageWorkViewMock(page);
    await link.click();
    await expect(page.getByRole("tab", { name: "Arbeitspakete", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("öffnet mit dem AVKK-Drill-down den vorhandenen Management-Reiter", async ({ page }) => {
    await page.goto("/dashboard?tab=avkk-management");
    await expect(page.getByRole("heading", { name: "AVKK Management", exact: true })).toBeVisible();
  });
});
