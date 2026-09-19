import type { Page, Route } from "@playwright/test";
import type { InternalKioskSnapshotProjection } from "../../src/lib/kiosk/internal-kiosk-snapshot";

export const KIOSK_INTERNAL_SH_A = "11111111-1111-4111-8111-111111111111";
export const KIOSK_INTERNAL_SH_FOREIGN = "11111111-1111-4111-8111-1111111111ff";

export function internalKioskProjection(): InternalKioskSnapshotProjection {
  const observedAt = "2026-09-18T10:00:00.000Z";

  return {
    period: { from: "2026-09-01", to: "2026-09-19" },
    observedAt,
    domains: [
      {
        id: "projects",
        title: "Projekte",
        level: "ok",
        sourceKind: "internal",
        observedAt,
        metrics: [
          { label: "Projekte mit Leistung im Zeitraum", value: 3, level: "ok" },
          { label: "Kunden mit Leistung im Zeitraum", value: 2, level: "ok" },
        ],
      },
      {
        id: "workPackages",
        title: "Arbeitspakete",
        level: "warning",
        sourceKind: "internal",
        observedAt,
        metrics: [
          { label: "Arbeitspakete mit Leistung im Zeitraum", value: 5, level: "ok" },
          { label: "Tätigkeiten: AP-Kategorie nicht publiziert", value: 1, level: "warning" },
          { label: "Tätigkeiten: AP-Kategorie unbekannt", value: 1, level: "warning" },
        ],
      },
      {
        id: "activities",
        title: "Tätigkeiten",
        level: "ok",
        sourceKind: "internal",
        observedAt,
        metrics: [
          { label: "Tätigkeiten", value: 8, level: "ok" },
          { label: "Gesamtstunden", value: 25, level: "ok", unit: "h" },
          { label: "Abrechenbare Stunden", value: 20, level: "ok", unit: "h" },
          { label: "Nicht abrechenbare Stunden", value: 5, level: "ok", unit: "h" },
          { label: "Abrechenbarer Anteil", value: 80, level: "ok", unit: "%" },
        ],
      },
    ],
  };
}

function serverFnExport(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const encodedDescriptor = url.pathname.split("/_serverFn/")[1]?.split("/")[0];
    if (!encodedDescriptor) return "";

    const descriptor = JSON.parse(Buffer.from(encodedDescriptor, "base64url").toString("utf8")) as {
      export?: unknown;
    };
    return typeof descriptor.export === "string" ? descriptor.export : "";
  } catch {
    return "";
  }
}

async function success(route: Route): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ result: { ok: true, value: internalKioskProjection() } }),
  });
}

async function deny(route: Route): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      error: {
        name: "Error",
        message: "Projektcontrolling für diesen Scope nicht zulässig.",
      },
    }),
  });
}

export async function installInternalKioskServerFnMock(
  page: Page,
  options: { denyAll?: boolean; denyForeignScope?: boolean } = {},
): Promise<void> {
  await page.route(
    (url) => url.pathname.includes("_serverFn"),
    async (route) => {
      const request = route.request();
      if (!/readInternalKioskSnapshotFn/i.test(serverFnExport(request.url()))) {
        await route.fallback();
        return;
      }

      const rawBody = request.postData() ?? "";
      if (
        options.denyAll ||
        (options.denyForeignScope && rawBody.includes(KIOSK_INTERNAL_SH_FOREIGN))
      ) {
        await deny(route);
        return;
      }

      await success(route);
    },
  );
}

export async function seedKioskHybridDemoDataset(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    {
      key: "northbit-kiosk-demo-dataset-v1",
      value: JSON.stringify({
        version: "1.0.0",
        loadedAt: "2026-09-19T05:00:00.000Z",
        domains: [
          {
            id: "availability",
            title: "Urlaub (Mitarbeiter)",
            level: "ok",
            metrics: [
              { label: "Diese Woche im Urlaub", value: 4, level: "ok" },
              { label: "Nächste Woche im Urlaub", value: 6, level: "ok" },
            ],
            note: "Keine Gründe oder Gesundheitsdaten",
          },
          {
            id: "infrastructure",
            title: "Infrastruktur",
            level: "ok",
            metrics: [
              { label: "OK", value: 131, level: "ok" },
              { label: "Warnung", value: 8, level: "warning" },
              { label: "Kritisch", value: 3, level: "critical" },
              { label: "Verfügbar", value: 9, level: "ok" },
              { label: "Nicht verfügbar", value: 2, level: "critical" },
            ],
            rows: [],
          },
          {
            id: "support",
            title: "Support-Postfach",
            level: "warning",
            metrics: [
              { label: "Posteingang gesamt", value: 87, level: "warning", trend: [61, 68, 72] },
              { label: "Heute", value: 12, level: "ok", trend: [8, 11, 12] },
              { label: "Gestern", value: 18, level: "ok", trend: [13, 16, 18] },
              { label: "Älter", value: 57, level: "warning", trend: [39, 43, 57] },
            ],
          },
        ],
      }),
    },
  );
}
