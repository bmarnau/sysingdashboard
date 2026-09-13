/**
 * BSF-03 „Meine Kunden“ — synthetische Serverfunktions-Grenze für E2E.
 *
 * Sicherheitsgrenze und Begründung:
 * - Die eigentliche Autorisierung (`aktive Identität ∩ dashboard.view ∩ aktive
 *   Membership ∩ aktive Responsibility ∩ Customer Access >= read`) liegt
 *   serverseitig in `readMyCustomerDetailFn`/`listMyCustomersFn` hinter RLS und
 *   `is_my_customer`. Diese Grenze wird im SQL-Testartefakt (R01–R18) und in
 *   den Security-Vitests (M09–M13) geprüft.
 * - Dieser Harness mockt ausschließlich die HTTP-Grenze der Serverfunktionen
 *   und bildet damit die bereits getroffene Serverentscheidung ab. Es wird
 *   keine Produktlogik verändert, kein Auth-Bypass eingebaut und keine
 *   Sicherheitsregel abgeschwächt: Der Client bekommt exakt das, was der
 *   Server im jeweiligen Szenario liefern würde (Daten oder generische
 *   Ablehnung).
 * - Produktivcode kennt diese Datei nicht.
 */
import type { Page, Route } from "@playwright/test";

/** Dieselbe generische Ablehnung wie in `my-customers.functions.ts`. */
export const DENIED_MESSAGE = "Kein zulässiger Kunde für diesen Benutzer.";
/** Ablehnung der Berechtigungsprüfung (`dashboard.view` fehlt). */
export const PERMISSION_MESSAGE = "Erforderliche Fachberechtigung fehlt.";

export const SH_A = "11111111-1111-4111-8111-111111111111";
export const SH_B = "11111111-1111-4111-8111-1111111111b2";
export const CUSTOMER_READ = "22222222-2222-4222-8222-222222222221";
export const CUSTOMER_WRITE = "22222222-2222-4222-8222-222222222222";
export const CUSTOMER_FOREIGN = "22222222-2222-4222-8222-2222222222ff";

export type AccessLevel = "read" | "write";

export interface SummaryFixture {
  systemhouseId: string;
  customerId: string;
  name: string;
  status: string;
  responsibilityStatus: string;
  responsibleSince: string;
  accessLevel: AccessLevel;
}

export function summary(overrides: Partial<SummaryFixture> = {}): SummaryFixture {
  return {
    systemhouseId: SH_A,
    customerId: CUSTOMER_READ,
    name: "ACME Industrie",
    status: "active",
    responsibilityStatus: "active",
    responsibleSince: "2026-01-15T00:00:00.000Z",
    accessLevel: "read",
    ...overrides,
  };
}

const projectionBase = (systemhouseId: string, customerId: string) => ({
  systemhouseId,
  customerId,
  legacyClient: "ACME",
  publishedBy: "e2e-publisher",
  publishedAt: "2026-02-01T00:00:00.000Z",
  sourceRevision: 1,
  sourceHash: "e2e-hash",
});

/** Detail-Antwort in genau der Form, die `readMyCustomerDetailFn` liefert. */
export function detail(
  overrides: Partial<SummaryFixture> = {},
  options: { displayName?: string; withProjection?: boolean } = {},
) {
  const customer = summary(overrides);
  const base = projectionBase(customer.systemhouseId, customer.customerId);
  const withProjection = options.withProjection ?? true;
  return {
    customer,
    responsible: { userId: "e2e-user", displayName: options.displayName ?? "E2E Systemingenieur" },
    projection: {
      systemhouseId: customer.systemhouseId,
      customerId: customer.customerId,
      projects: withProjection
        ? [{ ...base, projectionId: "p1", sourceId: "P1", name: "Migration", status: "aktiv" }]
        : [],
      workPackages: withProjection
        ? [
            {
              ...base,
              projectionId: "w1",
              sourceId: "W1",
              projectSourceId: "P1",
              parentLinkStatus: "linked",
              title: "Netzwerk",
              status: "offen",
              priority: "hoch",
            },
          ]
        : [],
      activities: withProjection
        ? [
            {
              ...base,
              projectionId: "a1",
              sourceId: "A1",
              workPackageSourceId: "W1",
              parentLinkStatus: "linked",
              engineerId: "e",
              title: "Switch konfiguriert",
              date: "2026-02-01",
              duration: 2,
              billable: true,
              billingStatus: "offen",
            },
          ]
        : [],
    },
  };
}

export type ServerOutcome<T> = { kind: "ok"; value: T } | { kind: "deny"; message: string };

export interface MyCustomersServerBehaviour {
  /** Ergebnis von `listMyCustomersFn`. */
  list: ServerOutcome<SummaryFixture[]>;
  /**
   * Ergebnis von `readMyCustomerDetailFn` je `${systemhouseId}:${customerId}`.
   * Nicht enthaltene Scopes werden fail-closed generisch abgelehnt — exakt wie
   * der Server bei fremden, unbekannten oder cross-systemhouse IDs.
   */
  detailByScope?: Record<string, ServerOutcome<ReturnType<typeof detail>>>;
  /** Optionaler Zähler für serverseitig abgelehnte Detailaufrufe. */
  onDetailDenied?: (scope: string) => void;
}

async function ok(route: Route, result: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ result }),
  });
}

async function deny(route: Route, message: string): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ error: { name: "Error", message } }),
  });
}

/**
 * Fängt die Serverfunktionsaufrufe von „Meine Kunden“ ab. Alle anderen
 * Serverfunktionen laufen unverändert weiter.
 */
export async function installMyCustomersServerFnMock(
  page: Page,
  behaviour: MyCustomersServerBehaviour,
): Promise<void> {
  await page.route(
    (url) => url.pathname.includes("_serverFn"),
    async (route) => {
      const request = route.request();
      const url = request.url();
      const raw = request.postData() ?? "";
      const scopeFromPage = parseScope(page.url());
      const scopeFromBody = parseScope(raw);
      const scope = scopeFromBody ?? scopeFromPage;
      const isDetail = /readmycustomerdetail/i.test(url) || (scope !== null && !isListUrl(url));
      const isList = isListUrl(url) || (!isDetail && scope === null);

      if (!isDetail && !isList) {
        await route.fallback();
        return;
      }

      if (isDetail) {
        const outcome = scope ? behaviour.detailByScope?.[scope] : undefined;
        if (!outcome || outcome.kind === "deny") {
          if (scope) behaviour.onDetailDenied?.(scope);
          await deny(route, outcome?.message ?? DENIED_MESSAGE);
          return;
        }
        await ok(route, outcome.value);
        return;
      }

      if (behaviour.list.kind === "deny") {
        await deny(route, behaviour.list.message);
        return;
      }
      await ok(route, behaviour.list.value);
    },
  );
}

function isListUrl(url: string): boolean {
  return /listmycustomers/i.test(url);
}

/**
 * Liest `(systemhouseId, customerId)`. Primärquelle ist der serialisierte
 * Request-Body, Fallback die aktuelle Detail-URL — beide tragen exakt die IDs,
 * die der Server autorisieren müsste.
 */
function parseScope(raw: string): string | null {
  const ids = raw.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
  );
  if (!ids || ids.length < 2) return null;
  return `${ids[0]}:${ids[1]}`;
}

export const scopeKey = (systemhouseId: string, customerId: string) =>
  `${systemhouseId}:${customerId}`;
