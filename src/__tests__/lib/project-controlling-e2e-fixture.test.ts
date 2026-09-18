import { describe, expect, it } from "vitest";
import {
  CUSTOMER_A,
  PROJECT_A,
  SH_A,
  WORK_PACKAGE_A,
  parseProjectControllingE2eFilters,
} from "../../../e2e/fixtures/project-controlling-e2e";

function tssString(value: string) {
  return { t: 1, s: value };
}

describe("BSF-03A E2E ServerFn fixture", () => {
  it("dekodiert den realen TanStack-TSS-Requestvertrag", () => {
    const raw = JSON.stringify({
      t: {
        t: 10,
        i: 0,
        p: {
          k: ["data"],
          v: [
            {
              t: 10,
              i: 1,
              p: {
                k: [
                  "from",
                  "to",
                  "billable",
                  "systemhouseId",
                  "customerId",
                  "projectSourceId",
                  "workPackageSourceId",
                  "categoryKey",
                ],
                v: [
                  tssString("2026-09-03"),
                  tssString("2026-09-10"),
                  tssString("nonBillable"),
                  tssString(SH_A),
                  tssString(CUSTOMER_A),
                  tssString(PROJECT_A),
                  tssString(WORK_PACKAGE_A),
                  tssString("wartung"),
                ],
              },
              o: 0,
            },
          ],
        },
        o: 0,
      },
      f: 63,
      m: [],
    });

    expect(parseProjectControllingE2eFilters(raw)).toEqual({
      from: "2026-09-03",
      to: "2026-09-10",
      billable: "nonBillable",
      systemhouseId: SH_A,
      customerId: CUSTOMER_A,
      projectSourceId: PROJECT_A,
      workPackageSourceId: WORK_PACKAGE_A,
      categoryKey: "wartung",
    });
  });

  it("ignoriert TSS-undefined für nicht gesetzte abhängige Filter", () => {
    const raw = JSON.stringify({
      t: {
        t: 10,
        i: 0,
        p: {
          k: ["data"],
          v: [
            {
              t: 10,
              i: 1,
              p: {
                k: [
                  "from",
                  "to",
                  "billable",
                  "systemhouseId",
                  "customerId",
                  "projectSourceId",
                ],
                v: [
                  tssString("2026-09-01"),
                  tssString("2026-09-18"),
                  tssString("all"),
                  tssString(SH_A),
                  { t: 2, s: 1 },
                  { t: 2, s: 1 },
                ],
              },
              o: 0,
            },
          ],
        },
        o: 0,
      },
      f: 63,
      m: [],
    });

    expect(parseProjectControllingE2eFilters(raw)).toEqual({
      from: "2026-09-01",
      to: "2026-09-18",
      billable: "all",
      systemhouseId: SH_A,
    });
  });
});
