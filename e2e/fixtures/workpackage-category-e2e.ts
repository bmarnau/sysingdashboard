/**
 * BSF-03D (#103) — E2E-Mock für Arbeitspaket-Kategorien.
 *
 * Überlagert gezielt die Data-API-Tabellen `systemhouse_membership`,
 * `reference_catalog` und `reference_value` der synthetischen Supabase-Origin
 * (`installSupabaseMock` liefert dort standardmäßig leere Mengen). Später
 * registrierte Playwright-Routen haben Vorrang, daher nach der Fixture
 * installieren. Schreibzugriffe werden protokolliert, aber nicht persistiert.
 */
import type { Page, Route } from "@playwright/test";
import { E2E_SUPABASE_URL } from "./supabase-e2e";

export const CAT_SH_A = "77777777-7777-4777-8777-777777777771";
export const CAT_SH_B = "77777777-7777-4777-8777-777777777772";
export const CAT_CATALOG_ID = "88888888-8888-4888-8888-888888888881";

export interface CategoryMockBehaviour {
  /** Mehrere aktive Memberships → explizite Systemhaus-Wahl erforderlich. */
  multiSystemhouse?: boolean;
}

export interface CategoryWriteLog {
  inserts: unknown[];
  updates: unknown[];
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(body),
  });

const value = (id: string, key: string, label: string, systemhouseId: string, active = true) => ({
  id,
  catalog_id: CAT_CATALOG_ID,
  key,
  label,
  description: "",
  sort_order: 1,
  is_active: active,
  is_default: false,
  parent_value_id: null,
  attributes: {},
  valid_from: "2026-01-01T00:00:00.000Z",
  valid_to: active ? null : "2026-06-01T00:00:00.000Z",
  created_by: null,
  updated_by: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  systemhouse_id: systemhouseId,
});

export async function installWorkPackageCategoryMock(
  page: Page,
  behaviour: CategoryMockBehaviour = {},
): Promise<CategoryWriteLog> {
  const log: CategoryWriteLog = { inserts: [], updates: [] };

  const memberships = [
    {
      systemhouse_id: CAT_SH_A,
      status: "active",
      valid_from: null,
      valid_to: null,
      systemhouse: { name: "Systemhaus Alpha" },
    },
    ...(behaviour.multiSystemhouse
      ? [
          {
            systemhouse_id: CAT_SH_B,
            status: "active",
            valid_from: null,
            valid_to: null,
            systemhouse: { name: "Systemhaus Beta" },
          },
        ]
      : []),
  ];

  const catalogs = [
    {
      id: CAT_CATALOG_ID,
      key: "workpackage.category",
      name: "Arbeitspaket-Kategorien",
      description: "",
      domain: "project",
      is_system: false,
      is_hierarchical: false,
      version: 1,
      scope_type: "systemhouse",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];

  // Alpha: aktiv + deaktiviert; Beta: eigener Bestand (darf bei Alpha nie erscheinen).
  const values = [
    value("99999999-9999-4999-8999-999999999991", "netzwerk", "Netzwerk", CAT_SH_A),
    value("99999999-9999-4999-8999-999999999992", "altlast", "Altlast", CAT_SH_A, false),
    value("99999999-9999-4999-8999-999999999993", "beta_only", "Beta-Kategorie", CAT_SH_B),
  ];

  await page.route(`${E2E_SUPABASE_URL}/rest/v1/systemhouse_membership**`, (route) =>
    route.request().method() === "GET" ? json(route, memberships) : route.fallback(),
  );
  await page.route(`${E2E_SUPABASE_URL}/rest/v1/reference_catalog**`, (route) =>
    route.request().method() === "GET" ? json(route, catalogs) : route.fallback(),
  );
  await page.route(`${E2E_SUPABASE_URL}/rest/v1/reference_value**`, (route) => {
    const method = route.request().method();
    if (method === "GET") return json(route, values);
    if (method === "POST") {
      log.inserts.push(route.request().postDataJSON());
      return json(route, [], 201);
    }
    if (method === "PATCH") {
      log.updates.push(route.request().postDataJSON());
      return json(route, []);
    }
    return route.fallback();
  });

  return log;
}
