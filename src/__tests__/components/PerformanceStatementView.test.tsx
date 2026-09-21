import { fireEvent, render, screen, within } from "@testing-library/react";
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

const scopes: PerformanceStatementScopeOption[] = [
  {
    systemhouseId: SYSTEMHOUSE_ID,
    systemhouseName: "Systemhaus Nord",
    customerId: CUSTOMER_ID,
    customerName: "Kunde Alpha",
  },
];

const selection: ReviewInput = {
  systemhouseId: SYSTEMHOUSE_ID,
  customerId: CUSTOMER_ID,
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
};

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
    nonBillableHours: 2,
    reviewableCount: 2,
  },
  rows: [
    {
      activitySourceId: "ACT-1",
      sourceRevision: 2,
      sourceHash: "secret-hash-1",
      sourcePublishedAt: "2026-09-01T08:00:00.000Z",
      date: "2026-09-01",
      title: "Analyse",
      durationHours: 2,
      sourceBillable: true,
      effectiveBillable: true,
      billingStatus: "offen",
      reviewState: "reviewable",
      hasStaleOverride: false,
      project: { sourceId: "P-1", name: "Projekt Alpha" },
      workPackage: { sourceId: "WP-1", title: "Analyse" },
      category: { key: "regelbetrieb", label: "Regelbetrieb", state: "known" },
    },
    {
      activitySourceId: "ACT-2",
      sourceRevision: 3,
      sourceHash: "secret-hash-2",
      sourcePublishedAt: "2026-09-02T08:00:00.000Z",
      date: "2026-09-02",
      title: "Dokumentation",
      durationHours: 2,
      sourceBillable: false,
      effectiveBillable: false,
      billingStatus: "offen",
      reviewState: "reviewable",
      hasStaleOverride: true,
      project: { sourceId: "P-1", name: "Projekt Alpha" },
      workPackage: { sourceId: "WP-1", title: "Analyse" },
      category: { key: null, label: null, state: "none" },
    },
    {
      activitySourceId: "ACT-3",
      sourceRevision: 1,
      sourceHash: "secret-hash-3",
      sourcePublishedAt: "2026-09-03T08:00:00.000Z",
      date: "2026-09-03",
      title: "Legacy",
      durationHours: 1,
      sourceBillable: true,
      effectiveBillable: true,
      billingStatus: "abgerechnet",
      reviewState: "legacy_finalized",
      hasStaleOverride: false,
      project: { sourceId: null, name: null },
      workPackage: { sourceId: null, title: null },
      category: { key: null, label: null, state: "unobserved" },
    },
    {
      activitySourceId: "ACT-4",
      sourceRevision: 1,
      sourceHash: "secret-hash-4",
      sourcePublishedAt: "2026-09-04T08:00:00.000Z",
      date: "2026-09-04",
      title: "Bereits verwendet",
      durationHours: 1,
      sourceBillable: true,
      effectiveBillable: true,
      billingStatus: "offen",
      reviewState: "claimed_by_statement",
      hasStaleOverride: false,
      project: { sourceId: null, name: null },
      workPackage: { sourceId: null, title: null },
      category: { key: null, label: null, state: "unobserved" },
    },
  ],
};

function snapshot(
  id: string,
  version: number,
  status: "finalized" | "superseded",
): PerformanceStatementSnapshot {
  return {
    id,
    seriesId: "33333333-3333-4333-8333-333333333333",
    version,
    systemhouseId: SYSTEMHOUSE_ID,
    customerId: CUSTOMER_ID,
    customerName: "Kunde Alpha",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    status,
    finalizedBy: "44444444-4444-4444-8444-444444444444",
    finalizedAt: "2026-09-30T12:00:00.000Z",
    freshness: {
      oldestPublishedAt: "2026-09-01T08:00:00.000Z",
      latestPublishedAt: "2026-09-05T09:00:00.000Z",
    },
    reviewFingerprint: "a".repeat(64),
    snapshotHash: "secret-snapshot-hash",
    itemCount: 2,
    billableItemCount: 1,
    billableHours: 2,
    nonBillableHours: 2,
    replacesStatementId: version > 1 ? "old-statement" : null,
    supersededByStatementId: status === "superseded" ? "new-statement" : null,
    items: [],
  };
}

describe("BSF-03B PerformanceStatementView", () => {
  it("renders review states and allows toggling only reviewable rows", () => {
    const onOverride = vi.fn();

    render(
      <PerformanceStatementView
        scopes={scopes}
        selection={selection}
        review={review}
        history={[]}
        loading={false}
        busy={false}
        error={null}
        onSelectionChange={vi.fn()}
        onOverride={onOverride}
        onFinalize={vi.fn()}
        onReplace={vi.fn()}
        onExport={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Leistungsnachweis" })).toBeInTheDocument();
    expect(screen.getByText("Veraltete Review-Entscheidung")).toBeInTheDocument();
    expect(screen.getByText("Bereits abgerechnet")).toBeInTheDocument();
    expect(screen.getByText("Bereits in Leistungsnachweis")).toBeInTheDocument();

    const analyse = screen.getByRole("checkbox", { name: "Abrechenbar: Analyse" });
    const legacy = screen.getByRole("checkbox", { name: "Abrechenbar: Legacy" });
    expect(analyse).toBeEnabled();
    expect(legacy).toBeDisabled();

    fireEvent.click(analyse);
    expect(onOverride).toHaveBeenCalledWith(review.rows[0], false);

    const rendered = document.body.textContent ?? "";
    expect(rendered).not.toContain("secret-hash");
    expect(rendered).not.toContain("secret-snapshot-hash");
  });

  it("renders immutable history, replacement and export actions", () => {
    const oldStatement = snapshot("old-statement", 1, "superseded");
    const activeStatement = snapshot("new-statement", 2, "finalized");

    render(
      <PerformanceStatementView
        scopes={scopes}
        selection={selection}
        review={review}
        history={[activeStatement, oldStatement]}
        loading={false}
        busy={false}
        error={null}
        onSelectionChange={vi.fn()}
        onOverride={vi.fn()}
        onFinalize={vi.fn()}
        onReplace={vi.fn()}
        onExport={vi.fn()}
      />,
    );

    expect(screen.getByText("Version 1")).toBeInTheDocument();
    expect(screen.getByText("Version 2")).toBeInTheDocument();
    expect(screen.getByText("Ersetzt")).toBeInTheDocument();
    expect(screen.getByText("Finalisiert")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /PDF exportieren/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /CSV exportieren/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /JSON exportieren/ })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Version 2 ersetzen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Version 1 ersetzen" })).not.toBeInTheDocument();
  });

  it("requires explicit review confirmation before finalization", () => {
    const onFinalize = vi.fn();

    render(
      <PerformanceStatementView
        scopes={scopes}
        selection={selection}
        review={review}
        history={[]}
        loading={false}
        busy={false}
        error={null}
        onSelectionChange={vi.fn()}
        onOverride={vi.fn()}
        onFinalize={onFinalize}
        onReplace={vi.fn()}
        onExport={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Leistungsnachweis finalisieren" }));

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("Kunde Alpha")).toBeInTheDocument();
    expect(within(dialog).getByText("2026-09-01 bis 2026-09-30")).toBeInTheDocument();
    expect(within(dialog).getByText("Leistungsnachweis, keine Rechnung.")).toBeInTheDocument();

    const finalize = within(dialog).getByRole("button", { name: "Jetzt finalisieren" });
    expect(finalize).toBeDisabled();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Ich bestätige, dass ich den angezeigten Datenstand geprüft habe.",
      }),
    );

    expect(finalize).toBeEnabled();
    fireEvent.click(finalize);
    expect(onFinalize).toHaveBeenCalledTimes(1);
  });
});
