/**
 * Functional-Coverage-Report — bewusst deklarativ.
 *
 * Der Runner ordnet jedem Endpoint eine ehrliche Selbsteinschätzung zu
 * (`complete | partial | missing | blocked | not-applicable`) und schreibt
 * das Rohformat unter `test-report/api-functional-raw.json`.
 *
 * Anders als die Smoke-Tests führen wir hier keine zusätzliche
 * Ausführung durch — die tatsächlichen fachlichen Assertions leben in
 * `src/__tests__/api/runner.test.ts` (bestehend, contract-getrieben).
 * Dieser File dokumentiert nur die Abdeckung strukturiert für CI-Gates
 * und Handbuch-Reports.
 */
import { afterAll, describe, it, expect } from "vitest";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import "../../env/test-instance";

const INVENTORY_PATH = resolve(process.cwd(), "test-report/api-inventory.json");
const RAW_OUT = resolve(process.cwd(), "test-report/api-functional-raw.json");

type Coverage = {
  endpointId: string;
  purpose: string;
  coverage: "complete" | "partial" | "missing" | "blocked" | "not-applicable";
  positive: boolean;
  negative: boolean;
  auth: boolean;
  authorization: boolean;
  scope: boolean;
  validation: boolean;
  errorHandling: boolean;
  sideEffects: boolean;
  idempotency: boolean;
  audit: boolean;
  gaps: string[];
};

const KNOWN: Record<string, Coverage> = {
  status: {
    endpointId: "status",
    purpose: "Health- und Systemstatus, secret-frei.",
    coverage: "partial",
    positive: true,
    negative: true,
    auth: false, // per Design anonym
    authorization: false,
    scope: false,
    validation: true,
    errorHandling: true,
    sideEffects: false,
    idempotency: true,
    audit: true,
    gaps: [
      "Kein Rate-Limit-Test (nicht implementiert).",
      "Correlation-ID-Header wird noch nicht in allen Fällen exposed.",
    ],
  },
  sync: {
    endpointId: "sync",
    purpose: "Manueller Sync-Trigger; Bearer-Session plus DB-Permission `azure.export`/`azure.import`.",
    coverage: "partial",
    positive: true,
    negative: true,
    auth: true,
    authorization: true,
    scope: false,
    validation: true,
    errorHandling: true,
    sideEffects: true,
    idempotency: false,
    audit: true,
    gaps: [
      "Keine echte Azure-Live-Verifizierung (AZURE_TEST_LIVE=false).",
      "Keine Parallelitäts-/Idempotenz-Tests.",
      "Positive Auth-End-to-End-Ausführung erfordert eine bereitgestellte Test-Session mit Azure-Permission.",
    ],
  },
};

const results: Coverage[] = [];

afterAll(() => {
  mkdirSync(dirname(RAW_OUT), { recursive: true });
  writeFileSync(RAW_OUT, JSON.stringify({ results }, null, 2) + "\n");
});

describe("api functional coverage", () => {
  it("inventory-present", () => {
    expect(existsSync(INVENTORY_PATH)).toBe(true);
  });

  const inv = existsSync(INVENTORY_PATH)
    ? (JSON.parse(readFileSync(INVENTORY_PATH, "utf8")) as {
        endpoints: { id: string; path: string }[];
      })
    : { endpoints: [] };

  for (const ep of inv.endpoints) {
    it(`coverage documented for ${ep.id}`, () => {
      const cov: Coverage = KNOWN[ep.id] ?? {
        endpointId: ep.id,
        purpose: "(nicht dokumentiert)",
        coverage: "missing",
        positive: false,
        negative: false,
        auth: false,
        authorization: false,
        scope: false,
        validation: false,
        errorHandling: false,
        sideEffects: false,
        idempotency: false,
        audit: false,
        gaps: ["Keine dokumentierte Functional-Coverage."],
      };
      results.push(cov);
      // `missing` erzeugt Finding, blockiert Test aber nicht — Coverage
      // ist Reporting, nicht Assertion.
      expect(cov.endpointId).toBe(ep.id);
    });
  }
});
