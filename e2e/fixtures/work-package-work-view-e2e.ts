/** Synthetic server decisions only; never imported by product code. */
import type { Page } from "@playwright/test";
import type { WorkPackageWorkViewRow } from "../../src/lib/avkk/work-package-work-view.types";

export const AP_IDS = ["ap-overdue", "ap-today", "ap-future", "ap-no-due"];
const base: WorkPackageWorkViewRow = {
  workPackageId: AP_IDS[0],
  sourceId: "wp-overdue",
  systemhouseId: "sh-authorized",
  customerId: "customer-alpha",
  customerName: "Alpha GmbH",
  title: "Zulu Migration",
  status: "open",
  due: "2026-10-03",
  dueGroup: "OVERDUE",
  owner: { personId: "person-ada", displayName: "Ada Beispiel" },
  deputies: [{ personId: "person-berta", displayName: "Berta Beispiel" }],
  asOfDate: "2026-10-04",
};
export const workViewRows: WorkPackageWorkViewRow[] = [
  base,
  {
    ...base,
    workPackageId: AP_IDS[1],
    sourceId: "wp-today",
    title: "Alpha Wartung",
    due: "2026-10-04",
    dueGroup: "TODAY",
    deputies: [],
  },
  {
    ...base,
    workPackageId: AP_IDS[2],
    sourceId: "wp-future",
    customerId: "customer-beta",
    customerName: "Beta GmbH",
    title: "Planung ".repeat(35),
    due: "2026-10-05",
    dueGroup: "FUTURE",
    owner: "UNASSIGNED",
    deputies: [],
  },
  {
    ...base,
    workPackageId: AP_IDS[3],
    sourceId: "wp-no-due",
    customerId: "customer-beta",
    customerName: "Beta GmbH",
    title: "Ohne Termin",
    due: null,
    dueGroup: "NO_DUE_DATE",
    owner: "UNASSIGNED",
    deputies: [],
  },
];

export async function installWorkPackageWorkViewMock(
  page: Page,
  options: { beforeRead?: () => Promise<void> } = {},
) {
  let outcome: "ok" | "empty" | "deny" = "ok";
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
        /* Unknown functions continue through the existing harness. */
      }
      if (!/^readWorkPackageWorkViewFn(?:_createServerFn_handler)?$/.test(name)) {
        await route.fallback();
        return;
      }
      requests.push(route.request().postData() ?? "");
      await options.beforeRead?.();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          outcome === "deny"
            ? {
                error: {
                  name: "Error",
                  message: "Arbeitspaket-Arbeitssicht für diesen Benutzer nicht zulässig.",
                },
              }
            : { result: outcome === "empty" ? [] : workViewRows },
        ),
      });
    },
  );
  return {
    requests,
    setOutcome: (next: typeof outcome) => {
      outcome = next;
    },
  };
}
