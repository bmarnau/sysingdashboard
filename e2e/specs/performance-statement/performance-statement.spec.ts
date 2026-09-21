import { test, expect } from "../../fixtures/test-instance";
import {
  CUSTOMER_A,
  DEFAULT_PERIOD,
  REVIEW_FINGERPRINT_AFTER_OVERRIDE,
  SH_A,
  STATEMENT_V1,
  installPerformanceStatementServerFnMock,
  performanceStatementReview,
  performanceStatementScopes,
  performanceStatementSnapshot,
} from "../../fixtures/performance-statement-e2e";
import type {
  PerformanceStatementReview,
  PerformanceStatementSnapshot,
} from "../../../src/lib/performance-statement/performance-statement-contract";

test.describe("BSF-03B Leistungsnachweis – Teamlead", () => {
  test.use({ role: "teamlead" });

  test("Review -> Override -> Finalisierung -> unveränderbare Historie -> Export", async ({
    page,
  }) => {
    let review = performanceStatementReview();
    let history: PerformanceStatementSnapshot[] = [];
    const overrideCalls: Record<string, unknown>[] = [];
    const finalizeCalls: Record<string, unknown>[] = [];

    await installPerformanceStatementServerFnMock(page, {
      resolve: ({ exportName, data }) => {
        switch (exportName) {
          case "listPerformanceStatementScopesFn":
            return { kind: "ok", value: performanceStatementScopes() };
          case "getPerformanceStatementReviewFn":
            return { kind: "ok", value: review };
          case "listPerformanceStatementsFn":
            return { kind: "ok", value: history };
          case "setPerformanceBillableOverrideFn": {
            overrideCalls.push(data ?? {});
            const rows: PerformanceStatementReview["rows"] = review.rows.map((row) =>
              row.activitySourceId === "activity-doc"
                ? {
                    ...row,
                    effectiveBillable: true,
                    hasStaleOverride: false,
                  }
                : row,
            );
            review = {
              ...review,
              rows,
              reviewFingerprint: REVIEW_FINGERPRINT_AFTER_OVERRIDE,
              summary: {
                billableHours: 3,
                nonBillableHours: 0,
                reviewableCount: 2,
              },
            };
            return { kind: "ok", value: { ok: true } };
          }
          case "finalizePerformanceStatementFn": {
            finalizeCalls.push(data ?? {});
            const snapshot = performanceStatementSnapshot({
              id: STATEMENT_V1,
              version: 1,
              reviewFingerprint: REVIEW_FINGERPRINT_AFTER_OVERRIDE,
              billableHours: 3,
              nonBillableHours: 0,
            });
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
            return { kind: "ok", value: { statementId: STATEMENT_V1 } };
          }
          default:
            return { kind: "deny", message: "Unerwarteter Leistungsnachweis-Aufruf." };
        }
      },
    });

    await page.goto("/leistungsnachweis");

    await expect(page.getByRole("heading", { name: "Leistungsnachweis", level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Leistungsnachweis-Filter" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Review-Zusammenfassung" })).toContainText(
      "2,00 h",
    );
    await expect(page.getByRole("region", { name: "Review", exact: true })).toContainText("Patch-Analyse");
    await expect(page.getByText("Veraltete Review-Entscheidung")).toBeVisible();

    const documentationBillable = page.getByLabel("Abrechenbar: Dokumentation");
    await expect(documentationBillable).not.toBeChecked();
    await documentationBillable.check();

    await expect.poll(() => overrideCalls.length).toBe(1);
    expect(overrideCalls[0]).toMatchObject({
      systemhouseId: SH_A,
      customerId: CUSTOMER_A,
      activitySourceId: "activity-doc",
      effectiveBillable: true,
    });
    await expect(documentationBillable).toBeChecked();
    await expect(page.getByRole("region", { name: "Review-Zusammenfassung" })).toContainText(
      "3,00 h",
    );
    await expect(page.getByText("Veraltete Review-Entscheidung")).toHaveCount(0);

    await page.getByRole("button", { name: "Leistungsnachweis finalisieren" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Kunde Alpha");
    await expect(dialog).toContainText(
      `${DEFAULT_PERIOD.periodStart} bis ${DEFAULT_PERIOD.periodEnd}`,
    );
    await expect(dialog).toContainText("3,00 h");
    await expect(dialog).toContainText("Leistungsnachweis, keine Rechnung.");

    const finalizeButton = dialog.getByRole("button", { name: "Jetzt finalisieren" });
    await expect(finalizeButton).toBeDisabled();
    await dialog
      .getByLabel("Ich bestätige, dass ich den angezeigten Datenstand geprüft habe.")
      .check();
    await expect(finalizeButton).toBeEnabled();
    await finalizeButton.click();

    await expect.poll(() => finalizeCalls.length).toBe(1);
    expect(finalizeCalls[0]).toMatchObject({
      systemhouseId: SH_A,
      customerId: CUSTOMER_A,
      expectedReviewFingerprint: REVIEW_FINGERPRINT_AFTER_OVERRIDE,
    });

    const historyRegion = page.getByRole("region", { name: "Leistungsnachweis-Historie" });
    await expect(historyRegion).toContainText("Version 1");
    await expect(historyRegion).toContainText("Finalisiert");
    await expect(historyRegion).toContainText("3,00 h abrechenbar");
    await expect(page.getByLabel("Abrechenbar: Patch-Analyse")).toBeDisabled();
    await expect(page.getByLabel("Abrechenbar: Dokumentation")).toBeDisabled();
    await expect(page.getByText("e2e-engineer-internal")).toHaveCount(0);
    await expect(page.getByText("source-hash-doc")).toHaveCount(0);

    for (const format of ["PDF", "CSV", "JSON"] as const) {
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: `Version 1 ${format} exportieren` }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename().toLowerCase()).toMatch(
        new RegExp(`\\.${format.toLowerCase()}$`),
      );
    }
  });

  test("Replacement erhält v1 unverändert und macht v2 zur aktiven Version", async ({ page }) => {
    const v1 = performanceStatementSnapshot({
      id: STATEMENT_V1,
      version: 1,
      billableHours: 3,
      nonBillableHours: 0,
    });
    let history: PerformanceStatementSnapshot[] = [v1];
    let review = performanceStatementReview({
      reviewFingerprint: "c".repeat(64),
      rows: performanceStatementReview().rows.map((row) =>
        row.activitySourceId === "activity-doc"
          ? {
              ...row,
              sourceRevision: 5,
              sourceHash: "source-hash-doc-v2",
              sourcePublishedAt: "2026-09-21T07:20:00.000Z",
              effectiveBillable: false,
              hasStaleOverride: false,
            }
          : row,
      ),
      summary: {
        billableHours: 2,
        nonBillableHours: 1,
        reviewableCount: 2,
      },
    });
    const replaceCalls: Record<string, unknown>[] = [];

    await installPerformanceStatementServerFnMock(page, {
      resolve: ({ exportName, data }) => {
        switch (exportName) {
          case "listPerformanceStatementScopesFn":
            return { kind: "ok", value: performanceStatementScopes() };
          case "getPerformanceStatementReviewFn":
            return { kind: "ok", value: review };
          case "listPerformanceStatementsFn":
            return { kind: "ok", value: history };
          case "replacePerformanceStatementFn": {
            replaceCalls.push(data ?? {});
            const v2 = performanceStatementSnapshot({
              version: 2,
              reviewFingerprint: review.reviewFingerprint,
              billableHours: 2,
              nonBillableHours: 1,
              replacesStatementId: STATEMENT_V1,
            });
            history = [
              {
                ...v1,
                status: "superseded",
                supersededByStatementId: v2.id,
              },
              v2,
            ];
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
            return { kind: "ok", value: { statementId: v2.id } };
          }
          default:
            return { kind: "deny", message: "Unerwarteter Leistungsnachweis-Aufruf." };
        }
      },
    });

    await page.goto("/leistungsnachweis");

    const historyRegion = page.getByRole("region", { name: "Leistungsnachweis-Historie" });
    await expect(historyRegion).toContainText("Version 1");
    await expect(historyRegion).toContainText("3,00 h abrechenbar");

    await page.getByRole("button", { name: "Version 1 ersetzen" }).click();

    await expect.poll(() => replaceCalls.length).toBe(1);
    expect(replaceCalls[0]).toMatchObject({
      replacesStatementId: STATEMENT_V1,
      expectedReviewFingerprint: "c".repeat(64),
    });

    await expect(historyRegion).toContainText("Version 1");
    await expect(historyRegion).toContainText("Version 2");
    await expect(historyRegion).toContainText("Ersetzt");
    await expect(historyRegion).toContainText("Finalisiert");
    await expect(historyRegion).toContainText("3,00 h abrechenbar");
    await expect(historyRegion).toContainText("2,00 h abrechenbar");
    await expect(page.getByRole("button", { name: "Version 1 ersetzen" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Version 2 ersetzen" })).toBeVisible();
  });

  test("staler Review-Fingerprint bricht Finalisierung ohne Snapshot ab", async ({ page }) => {
    const review = performanceStatementReview();
    const finalizeCalls: Record<string, unknown>[] = [];

    await installPerformanceStatementServerFnMock(page, {
      resolve: ({ exportName, data }) => {
        switch (exportName) {
          case "listPerformanceStatementScopesFn":
            return { kind: "ok", value: performanceStatementScopes() };
          case "getPerformanceStatementReviewFn":
            return { kind: "ok", value: review };
          case "listPerformanceStatementsFn":
            return { kind: "ok", value: [] };
          case "finalizePerformanceStatementFn":
            finalizeCalls.push(data ?? {});
            return { kind: "deny", message: "PERFORMANCE_STATEMENT_STALE_REVIEW" };
          default:
            return { kind: "deny", message: "Unerwarteter Leistungsnachweis-Aufruf." };
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

    await expect.poll(() => finalizeCalls.length).toBe(1);
    await expect(page.getByRole("alert")).toContainText(
      "Die Quelldaten haben sich seit dem Review geändert.",
    );
    await expect(page.getByRole("region", { name: "Leistungsnachweis-Historie" })).toContainText(
      "Noch kein finalisierter Leistungsnachweis",
    );
  });
});
