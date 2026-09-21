/**
 * BSF-03B Leistungsnachweis — synthetische Serverfunktions-Grenze für E2E.
 *
 * Produktivcode importiert diese Datei nicht. Der Harness bildet ausschließlich
 * bereits getroffene Serverentscheidungen ab. Auth/RBAC/RLS/Claims/DB-Write-
 * Grenzen werden zusätzlich in Backend-/Security-/SQL-Tests geprüft.
 */
import type { Page, Route } from "@playwright/test";
import type {
  PerformanceStatementReview,
  PerformanceStatementScopeOption,
  PerformanceStatementSnapshot,
} from "../../src/lib/performance-statement/performance-statement-contract";

export const SH_A = "11111111-1111-4111-8111-111111111111";
export const SH_B = "11111111-1111-4111-8111-1111111111b2";
export const CUSTOMER_A = "22222222-2222-4222-8222-222222222221";
export const CUSTOMER_B = "22222222-2222-4222-8222-2222222222b2";
export const CUSTOMER_FOREIGN = "22222222-2222-4222-8222-2222222222ff";
export const STATEMENT_V1 = "33333333-3333-4333-8333-333333333301";
export const STATEMENT_V2 = "33333333-3333-4333-8333-333333333302";
export const STATEMENT_FOREIGN = "33333333-3333-4333-8333-3333333333ff";
export const REVIEW_FINGERPRINT = "a".repeat(64);
export const REVIEW_FINGERPRINT_AFTER_OVERRIDE = "b".repeat(64);

export const DEFAULT_PERIOD = {
  periodStart: "2026-09-01",
  periodEnd: "2026-09-21",
} as const;

export function performanceStatementScopes(): PerformanceStatementScopeOption[] {
  return [
    {
      systemhouseId: SH_A,
      systemhouseName: "Systemhaus Nord",
      customerId: CUSTOMER_A,
      customerName: "Kunde Alpha",
    },
    {
      systemhouseId: SH_B,
      systemhouseName: "Systemhaus Süd",
      customerId: CUSTOMER_B,
      customerName: "Kunde Süd",
    },
  ];
}

export function performanceStatementReview(
  overrides: Partial<PerformanceStatementReview> = {},
): PerformanceStatementReview {
  return {
    systemhouseId: SH_A,
    customerId: CUSTOMER_A,
    customerName: "Kunde Alpha",
    ...DEFAULT_PERIOD,
    reviewFingerprint: REVIEW_FINGERPRINT,
    freshness: {
      oldestPublishedAt: "2026-09-18T08:00:00.000Z",
      latestPublishedAt: "2026-09-21T06:30:00.000Z",
    },
    summary: {
      billableHours: 2,
      nonBillableHours: 1,
      reviewableCount: 2,
    },
    rows: [
      {
        activitySourceId: "activity-patch",
        sourceRevision: 3,
        sourceHash: "source-hash-patch",
        sourcePublishedAt: "2026-09-21T06:30:00.000Z",
        date: "2026-09-20",
        title: "Patch-Analyse",
        durationHours: 2,
        sourceBillable: true,
        effectiveBillable: true,
        billingStatus: "open",
        reviewState: "reviewable",
        hasStaleOverride: false,
        project: { sourceId: "project-alpha", name: "Projekt Alpha" },
        workPackage: { sourceId: "wp-patch", title: "Patchmanagement" },
        category: { key: "wartung", label: "Wartung", state: "known" },
      },
      {
        activitySourceId: "activity-doc",
        sourceRevision: 4,
        sourceHash: "source-hash-doc",
        sourcePublishedAt: "2026-09-21T06:15:00.000Z",
        date: "2026-09-20",
        title: "Dokumentation",
        durationHours: 1,
        sourceBillable: false,
        effectiveBillable: false,
        billingStatus: "open",
        reviewState: "reviewable",
        hasStaleOverride: true,
        project: { sourceId: "project-alpha", name: "Projekt Alpha" },
        workPackage: { sourceId: "wp-doc", title: "Dokumentation" },
        category: { key: "doku", label: "Dokumentation", state: "known" },
      },
      {
        activitySourceId: "activity-claimed",
        sourceRevision: 1,
        sourceHash: "source-hash-claimed",
        sourcePublishedAt: "2026-09-18T08:00:00.000Z",
        date: "2026-09-18",
        title: "Bereits finalisierte Tätigkeit",
        durationHours: 0.5,
        sourceBillable: true,
        effectiveBillable: true,
        billingStatus: "finalized",
        reviewState: "claimed_by_statement",
        hasStaleOverride: false,
        project: { sourceId: "project-alpha", name: "Projekt Alpha" },
        workPackage: { sourceId: "wp-old", title: "Historie" },
        category: { key: "wartung", label: "Wartung", state: "known" },
      },
    ],
    ...overrides,
  };
}

export function performanceStatementSnapshot(
  overrides: Partial<PerformanceStatementSnapshot> = {},
): PerformanceStatementSnapshot {
  const version = overrides.version ?? 1;
  const id = overrides.id ?? (version === 1 ? STATEMENT_V1 : STATEMENT_V2);
  return {
    id,
    seriesId: "44444444-4444-4444-8444-444444444444",
    version,
    systemhouseId: SH_A,
    customerId: CUSTOMER_A,
    customerName: "Kunde Alpha",
    ...DEFAULT_PERIOD,
    status: "finalized",
    finalizedBy: "e2e00003-0000-4000-8000-000000000003",
    finalizedAt: version === 1 ? "2026-09-21T07:00:00.000Z" : "2026-09-21T07:30:00.000Z",
    freshness: {
      oldestPublishedAt: "2026-09-18T08:00:00.000Z",
      latestPublishedAt: "2026-09-21T06:30:00.000Z",
    },
    reviewFingerprint: version === 1 ? REVIEW_FINGERPRINT_AFTER_OVERRIDE : "c".repeat(64),
    snapshotHash: version === 1 ? "d".repeat(64) : "e".repeat(64),
    itemCount: 2,
    billableItemCount: version === 1 ? 2 : 1,
    billableHours: version === 1 ? 3 : 2,
    nonBillableHours: version === 1 ? 0 : 1,
    replacesStatementId: version === 1 ? null : STATEMENT_V1,
    supersededByStatementId: null,
    items: [
      {
        position: 1,
        activitySourceId: "activity-patch",
        sourceRevision: 3,
        sourceHash: "source-hash-patch",
        sourcePublishedAt: "2026-09-21T06:30:00.000Z",
        sourceEngineerId: "e2e-engineer-internal",
        date: "2026-09-20",
        title: "Patch-Analyse",
        durationHours: 2,
        sourceBillable: true,
        effectiveBillable: true,
        billingStatus: "open",
        project: { sourceId: "project-alpha", name: "Projekt Alpha" },
        workPackage: { sourceId: "wp-patch", title: "Patchmanagement" },
        category: { key: "wartung", label: "Wartung" },
      },
      {
        position: 2,
        activitySourceId: "activity-doc",
        sourceRevision: version === 1 ? 4 : 5,
        sourceHash: version === 1 ? "source-hash-doc" : "source-hash-doc-v2",
        sourcePublishedAt: version === 1 ? "2026-09-21T06:15:00.000Z" : "2026-09-21T07:20:00.000Z",
        sourceEngineerId: "e2e-engineer-internal",
        date: "2026-09-20",
        title: "Dokumentation",
        durationHours: 1,
        sourceBillable: false,
        effectiveBillable: version === 1,
        billingStatus: "open",
        project: { sourceId: "project-alpha", name: "Projekt Alpha" },
        workPackage: { sourceId: "wp-doc", title: "Dokumentation" },
        category: { key: "doku", label: "Dokumentation" },
      },
    ],
    ...overrides,
  };
}

export type PerformanceStatementServerOutcome =
  | { kind: "ok"; value: unknown }
  | { kind: "deny"; message: string };

export interface PerformanceStatementServerRequest {
  exportName: string;
  data: Record<string, unknown> | null;
  rawBody: string;
}

export interface PerformanceStatementServerBehaviour {
  resolve(request: PerformanceStatementServerRequest): PerformanceStatementServerOutcome;
}

const HANDLED_EXPORTS = new Set([
  "listPerformanceStatementScopesFn",
  "getPerformanceStatementReviewFn",
  "setPerformanceBillableOverrideFn",
  "finalizePerformanceStatementFn",
  "replacePerformanceStatementFn",
  "getPerformanceStatementFn",
  "listPerformanceStatementsFn",
]);

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

function decodeTssValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeTssValue);
  if (!value || typeof value !== "object") return value;

  const node = value as Record<string, unknown>;
  if (node.t === 1 && typeof node.s === "string") return node.s;
  if (node.t === 2) return undefined;

  if (node.t === 10 && node.p && typeof node.p === "object") {
    const payload = node.p as Record<string, unknown>;
    if (Array.isArray(payload.k) && Array.isArray(payload.v)) {
      const decoded: Record<string, unknown> = {};
      payload.k.forEach((key, index) => {
        if (typeof key !== "string") return;
        const child = decodeTssValue(payload.v[index]);
        if (child !== undefined) decoded[key] = child;
      });
      return decoded;
    }
  }

  return Object.fromEntries(
    Object.entries(node).map(([key, child]) => [key, decodeTssValue(child)]),
  );
}

function findRequestData(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const object = value as Record<string, unknown>;
  const markerKeys = [
    "systemhouseId",
    "customerId",
    "activitySourceId",
    "statementId",
    "replacesStatementId",
    "expectedReviewFingerprint",
  ];
  if (markerKeys.some((key) => key in object)) return object;

  for (const child of Object.values(object)) {
    const found = findRequestData(child);
    if (found) return found;
  }
  return null;
}

export function parsePerformanceStatementE2eData(rawBody: string): Record<string, unknown> | null {
  if (!rawBody) return null;
  try {
    return findRequestData(decodeTssValue(JSON.parse(rawBody) as unknown));
  } catch {
    return null;
  }
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

export async function installPerformanceStatementServerFnMock(
  page: Page,
  behaviour: PerformanceStatementServerBehaviour,
): Promise<void> {
  await page.route(
    (url) => url.pathname.includes("_serverFn"),
    async (route) => {
      const request = route.request();
      const exportName = serverFnExport(request.url());
      console.log(
        "[BSF03B-E2E-SERVERFN]",
        request.method(),
        exportName || "<unparsed>",
        request.url(),
        (request.postData() ?? "").slice(0, 500),
      );
      if (!HANDLED_EXPORTS.has(exportName)) {
        await route.fallback();
        return;
      }

      const rawBody = request.postData() ?? "";
      const outcome = behaviour.resolve({
        exportName,
        data: parsePerformanceStatementE2eData(rawBody),
        rawBody,
      });

      if (outcome.kind === "deny") {
        await deny(route, outcome.message);
        return;
      }

      await ok(route, outcome.value);
    },
  );
}
