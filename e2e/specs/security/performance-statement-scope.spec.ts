import { test, expect } from "../../fixtures/test-instance";
import {
  CUSTOMER_A,
  CUSTOMER_FOREIGN,
  SH_A,
  SH_B,
  STATEMENT_FOREIGN,
  installPerformanceStatementServerFnMock,
  performanceStatementReview,
  performanceStatementScopes,
  performanceStatementSnapshot,
} from "../../fixtures/performance-statement-e2e";

const GENERIC_DENY = "Leistungsnachweis für diesen Scope nicht zulässig.";

for (const role of ["administrator", "projectmanager", "engineer", "viewer", "customer"] as const) {
  test.describe(`BSF-03B Leistungsnachweis – Rolle ${role}`, () => {
    test.use({ role });

    test("erhält keine Leistungsnachweis-Sicht", async ({ page }) => {
      await installPerformanceStatementServerFnMock(page, {
        resolve: () => ({ kind: "deny", message: GENERIC_DENY }),
      });

      await page.goto("/leistungsnachweis");

      await expect(
        page.getByRole("heading", { name: "Leistungsnachweis", level: 1 }),
      ).toHaveCount(0);
      await expect(page.getByRole("region", { name: "Review" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Leistungsnachweis finalisieren" })).toHaveCount(
        0,
      );
    });
  });
}

test.describe("BSF-03B Leistungsnachweis – Scope/IDOR/BOLA", () => {
  test.use({ role: "teamlead" });

  test("fremdes Systemhaus wird generisch abgelehnt", async ({ page }) => {
    await installPerformanceStatementServerFnMock(page, {
      resolve: ({ exportName, data }) => {
        if (exportName === "listPerformanceStatementScopesFn") {
          return { kind: "ok", value: performanceStatementScopes() };
        }

        if (
          (exportName === "getPerformanceStatementReviewFn" ||
            exportName === "listPerformanceStatementsFn") &&
          data?.systemhouseId === SH_B
        ) {
          return { kind: "deny", message: GENERIC_DENY };
        }

        if (exportName === "getPerformanceStatementReviewFn") {
          return { kind: "ok", value: performanceStatementReview() };
        }
        if (exportName === "listPerformanceStatementsFn") {
          return { kind: "ok", value: [] };
        }

        return { kind: "deny", message: GENERIC_DENY };
      },
    });

    await page.goto("/leistungsnachweis");
    await expect(page.getByText("Patch-Analyse")).toBeVisible();

    await page.getByLabel("Systemhaus").selectOption(SH_B);

    await expect(page.getByRole("alert")).toContainText(
      "Leistungsnachweis konnte nicht verarbeitet werden.",
    );
    await expect(page.getByText("Patch-Analyse")).toHaveCount(0);
  });

  test("fremder Customer-Scope wird generisch abgelehnt", async ({ page }) => {
    const scopes = [
      ...performanceStatementScopes().filter((scope) => scope.systemhouseId === SH_A),
      {
        systemhouseId: SH_A,
        systemhouseName: "Systemhaus Nord",
        customerId: CUSTOMER_FOREIGN,
        customerName: "Fremdkunde",
      },
    ];

    await installPerformanceStatementServerFnMock(page, {
      resolve: ({ exportName, data }) => {
        if (exportName === "listPerformanceStatementScopesFn") {
          return { kind: "ok", value: scopes };
        }

        if (
          (exportName === "getPerformanceStatementReviewFn" ||
            exportName === "listPerformanceStatementsFn") &&
          data?.customerId === CUSTOMER_FOREIGN
        ) {
          return { kind: "deny", message: GENERIC_DENY };
        }

        if (exportName === "getPerformanceStatementReviewFn") {
          return { kind: "ok", value: performanceStatementReview() };
        }
        if (exportName === "listPerformanceStatementsFn") {
          return { kind: "ok", value: [] };
        }

        return { kind: "deny", message: GENERIC_DENY };
      },
    });

    await page.goto("/leistungsnachweis");
    await page.getByLabel("Kunde").selectOption(CUSTOMER_FOREIGN);

    await expect(page.getByRole("alert")).toContainText(
      "Leistungsnachweis konnte nicht verarbeitet werden.",
    );
    await expect(page.getByText("Patch-Analyse")).toHaveCount(0);
    await expect(page.getByText("Fremdkunde Geheim")).toHaveCount(0);
  });

  test("fremde Statement-ID wird beim Replace generisch abgelehnt", async ({ page }) => {
    const foreignStatement = performanceStatementSnapshot({
      id: STATEMENT_FOREIGN,
      systemhouseId: SH_B,
      customerId: CUSTOMER_FOREIGN,
      customerName: "Fremdkunde",
    });
    const replaceCalls: Record<string, unknown>[] = [];

    await installPerformanceStatementServerFnMock(page, {
      resolve: ({ exportName, data }) => {
        switch (exportName) {
          case "listPerformanceStatementScopesFn":
            return {
              kind: "ok",
              value: performanceStatementScopes().filter((scope) => scope.customerId === CUSTOMER_A),
            };
          case "getPerformanceStatementReviewFn":
            return { kind: "ok", value: performanceStatementReview() };
          case "listPerformanceStatementsFn":
            return { kind: "ok", value: [foreignStatement] };
          case "replacePerformanceStatementFn":
            replaceCalls.push(data ?? {});
            return { kind: "deny", message: GENERIC_DENY };
          default:
            return { kind: "deny", message: GENERIC_DENY };
        }
      },
    });

    await page.goto("/leistungsnachweis");
    await page.getByRole("button", { name: "Version 1 ersetzen" }).click();

    await expect.poll(() => replaceCalls.length).toBe(1);
    expect(replaceCalls[0]).toMatchObject({
      systemhouseId: SH_A,
      customerId: CUSTOMER_A,
      replacesStatementId: STATEMENT_FOREIGN,
    });
    await expect(page.getByRole("alert")).toContainText(
      "Leistungsnachweis konnte nicht verarbeitet werden.",
    );
    await expect(page.getByText("Fremdkunde Geheim")).toHaveCount(0);
  });

  test("Browserpfad führt keine direkte DML auf Snapshot-/Claim-Tabellen aus", async ({ page }) => {
    const directDml: string[] = [];
    page.on("request", (request) => {
      const method = request.method();
      if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
      const url = request.url();
      if (
        /\/rest\/v1\/(customer_performance_statement|customer_performance_statement_item|performance_statement_activity_claim)/.test(
          url,
        )
      ) {
        directDml.push(`${method} ${url}`);
      }
    });

    let history = [] as ReturnType<typeof performanceStatementSnapshot>[];
    let review = performanceStatementReview();

    await installPerformanceStatementServerFnMock(page, {
      resolve: ({ exportName }) => {
        switch (exportName) {
          case "listPerformanceStatementScopesFn":
            return {
              kind: "ok",
              value: performanceStatementScopes().filter((scope) => scope.customerId === CUSTOMER_A),
            };
          case "getPerformanceStatementReviewFn":
            return { kind: "ok", value: review };
          case "listPerformanceStatementsFn":
            return { kind: "ok", value: history };
          case "finalizePerformanceStatementFn": {
            const snapshot = performanceStatementSnapshot();
            history = [snapshot];
            review = {
              ...review,
              rows: review.rows.map((row) =>
                row.reviewState === "reviewable"
                  ? { ...row, reviewState: "claimed_by_statement" as const }
                  : row,
              ),
              summary: {
                billableHours: 0,
                nonBillableHours: 0,
                reviewableCount: 0,
              },
            };
            return { kind: "ok", value: { statementId: snapshot.id } };
          }
          default:
            return { kind: "deny", message: GENERIC_DENY };
        }
      },
    });

    await page.goto("/leistungsnachweis");
    await page.getByRole("button", { name: "Leistungsnachweis finalisieren" }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog
      .getByLabel("Ich bestätige, dass ich den angezeigten Datenstand geprüft habe.")
      .check();
    await dialog.getByRole("button", { name: "Jetzt finalisieren" }).click();

    await expect(page.getByRole("region", { name: "Leistungsnachweis-Historie" })).toContainText(
      "Version 1",
    );
    expect(directDml).toEqual([]);
  });
});
