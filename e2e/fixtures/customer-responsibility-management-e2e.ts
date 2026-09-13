import type { Page, Route } from "@playwright/test";

export const P5_SH = "33333333-3333-4333-8333-333333333333";
export const P5_CUSTOMER_A = "44444444-4444-4444-8444-444444444441";
export const P5_CUSTOMER_B = "44444444-4444-4444-8444-444444444442";
export const P5_USER_A = "55555555-5555-4555-8555-555555555551";
export const P5_USER_B = "55555555-5555-4555-8555-555555555552";

export interface P5Customer {
  systemhouseId: string;
  customerId: string;
  name: string;
  status: string;
  responsibility: null | {
    id: string;
    userId: string;
    displayName: string;
    responsibleSince: string;
  };
}

export interface P5Behaviour {
  denied?: boolean;
  systemhouses?: { systemhouseId: string; name: string }[];
  customers?: P5Customer[];
  candidates?: { userId: string; displayName: string }[];
}

const ok = (route: Route, result: unknown) =>
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result }) });
const deny = (route: Route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ error: { name: "Error", message: "Kundenverantwortung ist für diesen Scope nicht verfügbar." } }),
  });

function ids(raw: string): string[] {
  return (
    raw.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g) ?? []
  );
}

export async function installResponsibilityManagementMock(
  page: Page,
  behaviour: P5Behaviour = {},
): Promise<void> {
  const systemhouses = behaviour.systemhouses ?? [{ systemhouseId: P5_SH, name: "Systemhaus Nord" }];
  const customers: P5Customer[] = behaviour.customers ?? [
    {
      systemhouseId: P5_SH,
      customerId: P5_CUSTOMER_A,
      name: "Alpha GmbH",
      status: "active",
      responsibility: {
        id: "66666666-6666-4666-8666-666666666661",
        userId: P5_USER_A,
        displayName: "Anna Admin",
        responsibleSince: "2026-09-01T08:00:00.000Z",
      },
    },
    {
      systemhouseId: P5_SH,
      customerId: P5_CUSTOMER_B,
      name: "Beta AG",
      status: "active",
      responsibility: null,
    },
  ];
  const candidates = behaviour.candidates ?? [
    { userId: P5_USER_A, displayName: "Anna Admin" },
    { userId: P5_USER_B, displayName: "Berta Engineer" },
  ];

  await page.route(
    (url) => url.pathname.includes("_serverFn"),
    async (route) => {
      const url = route.request().url();
      const raw = route.request().postData() ?? "";
      if (!/responsibility|customerresponsibility|kundenverantwortung/i.test(url)) {
        await route.fallback();
        return;
      }
      if (behaviour.denied) {
        await deny(route);
        return;
      }

      if (/candidates/i.test(url)) {
        await ok(route, candidates);
        return;
      }
      if (/setcustomerresponsibility/i.test(url)) {
        const found = ids(raw);
        const customerId = found.find((id) => id === P5_CUSTOMER_A || id === P5_CUSTOMER_B);
        const targetUserId = found.find((id) => id === P5_USER_A || id === P5_USER_B);
        const customer = customers.find((entry) => entry.customerId === customerId);
        const candidate = candidates.find((entry) => entry.userId === targetUserId);
        if (!customer || !candidate) {
          await deny(route);
          return;
        }
        customer.responsibility = {
          id: "66666666-6666-4666-8666-666666666669",
          userId: candidate.userId,
          displayName: candidate.displayName,
          responsibleSince: "2026-09-13T15:00:00.000Z",
        };
        await ok(route, { responsibilityId: customer.responsibility.id });
        return;
      }
      if (/endcustomerresponsibility/i.test(url)) {
        const customerId = ids(raw).find((id) => id === P5_CUSTOMER_A || id === P5_CUSTOMER_B);
        const customer = customers.find((entry) => entry.customerId === customerId);
        if (!customer) {
          await deny(route);
          return;
        }
        customer.responsibility = null;
        await ok(route, { ended: true });
        return;
      }
      if (/listresponsibilitymanagement/i.test(url)) {
        await ok(route, {
          systemhouses,
          selectedSystemhouseId: systemhouses[0]?.systemhouseId ?? null,
          customers,
        });
        return;
      }
      await route.fallback();
    },
  );
}
