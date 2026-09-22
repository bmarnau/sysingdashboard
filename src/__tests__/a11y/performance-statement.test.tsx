/**
 * BSF-03B — Accessibility-Vertrag für den Leistungsnachweis.
 */
/// <reference types="vitest-axe/extend-expect" />
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import { PerformanceStatementView } from "@/components/performance-statement/PerformanceStatementView";
import type {
  PerformanceStatementReview,
  PerformanceStatementScopeOption,
  PerformanceStatementSnapshot,
  ReviewInput,
} from "@/lib/performance-statement/performance-statement-contract";

const SYSTEMHOUSE_ID = "11111111-1111-4111-8111-111111111111";
const CUSTOMER_ID = "22222222-2222-4222-8222-222222222222";

const selection: ReviewInput = {
  systemhouseId: SYSTEMHOUSE_ID,
  customerId: CUSTOMER_ID,
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
};

const scopes: PerformanceStatementScopeOption[] = [
  {
    systemhouseId: SYSTEMHOUSE_ID,
    systemhouseName: "Systemhaus Nord",
    customerId: CUSTOMER_ID,
    customerName: "Kunde Alpha",
  },
];

const review: PerformanceStatementReview = {
  ...selection,
  customerName: "Kunde Alpha",
  reviewFingerprint: "a".repeat(64),
  freshness: {
    oldestPublishedAt: "2026-09-01T08:00:00.000Z",
    latestPublishedAt: "2026-09-05T09:00:00.000Z",
  },
  summary: {
    billableHours: 2,
    nonBillableHours: 1,
    reviewableCount: 2,
  },
  rows: [
    {
      activitySourceId: "activity-1",
      sourceRevision: 2,
      sourceHash: "hash-1",
      sourcePublishedAt: "2026-09-01T08:00:00.000Z",
      date: "2026-09-01",
      title: "Kundenanalyse",
      durationHours: 2,
      sourceBillable: true,
      effectiveBillable: true,
      billingStatus: "offen",
      reviewState: "reviewable",
      hasStaleOverride: false,
      project: { sourceId: "project-1", name: "Projekt Alpha" },
      workPackage: { sourceId: "wp-1", title: "Analyse" },
      category: { key: "analyse", label: "Analyse", state: "known" },
    },
    {
      activitySourceId: "activity-2",
      sourceRevision: 2,
      sourceHash: "hash-2",
      sourcePublishedAt: "2026-09-02T08:00:00.000Z",
      date: "2026-09-02",
      title: "Interne Dokumentation",
      durationHours: 1,
      sourceBillable: true,
      effectiveBillable: false,
      billingStatus: "offen",
      reviewState: "reviewable",
      hasStaleOverride: true,
      project: { sourceId: "project-1", name: "Projekt Alpha" },
      workPackage: { sourceId: "wp-2", title: "Dokumentation" },
      category: { key: "doku", label: "Dokumentation", state: "known" },
    },
  ],
};

const snapshot: PerformanceStatementSnapshot = {
  id: "33333333-3333-4333-8333-333333333333",
  seriesId: "44444444-4444-4444-8444-444444444444",
  version: 1,
  systemhouseId: SYSTEMHOUSE_ID,
  customerId: CUSTOMER_ID,
  customerName: "Kunde Alpha",
  periodStart: selection.periodStart,
  periodEnd: selection.periodEnd,
  status: "finalized",
  finalizedBy: "55555555-5555-4555-8555-555555555555",
  finalizedAt: "2026-09-30T12:00:00.000Z",
  freshness: review.freshness,
  reviewFingerprint: review.reviewFingerprint,
  snapshotHash: "b".repeat(64),
  itemCount: 2,
  billableItemCount: 1,
  billableHours: 2,
  nonBillableHours: 1,
  replacesStatementId: null,
  supersededByStatementId: null,
  items: [],
};

const callbacks = {
  onSelectionChange: vi.fn(),
  onOverride: vi.fn(),
  onFinalize: vi.fn(),
  onReplace: vi.fn(),
  onExport: vi.fn(),
};

describe("BSF-03B Leistungsnachweis – Accessibility", () => {
  it("Filter, Review, Toggle, Finalisierung und Historie haben keine axe-Violations", async () => {
    const { container } = render(
      <PerformanceStatementView
        scopes={scopes}
        selection={selection}
        review={review}
        history={[snapshot]}
        loading={false}
        busy={false}
        error={null}
        {...callbacks}
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("Finalisierungsdialog inklusive Bestätigung bleibt zugänglich", async () => {
    const user = userEvent.setup();
    render(
      <PerformanceStatementView
        scopes={scopes}
        selection={selection}
        review={review}
        history={[snapshot]}
        loading={false}
        busy={false}
        error={null}
        {...callbacks}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Leistungsnachweis finalisieren" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Ich bestätige, dass ich den angezeigten Datenstand geprüft habe."),
    ).toBeInTheDocument();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it("Loading-, Fehler- und Empty-State bleiben zugänglich", async () => {
    const loading = render(
      <PerformanceStatementView
        scopes={[]}
        selection={null}
        review={null}
        history={[]}
        loading
        busy={false}
        error={null}
        {...callbacks}
      />,
    );
    expect(await axe(loading.container)).toHaveNoViolations();
    loading.unmount();

    const error = render(
      <PerformanceStatementView
        scopes={scopes}
        selection={selection}
        review={null}
        history={[]}
        loading={false}
        busy={false}
        error="Leistungsnachweis konnte nicht geladen werden."
        {...callbacks}
      />,
    );
    expect(await axe(error.container)).toHaveNoViolations();
  });
});
