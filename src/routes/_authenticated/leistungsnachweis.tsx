import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CustomerPageShell } from "@/components/customers/CustomerPageShell";
import { PermissionGate } from "@/components/PermissionGate";
import { PerformanceStatementView } from "@/components/performance-statement/PerformanceStatementView";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ExportDownloadService } from "@/lib/export-download-service";
import { logger } from "@/lib/logger";
import type {
  PerformanceStatementReview,
  PerformanceStatementScopeOption,
  PerformanceStatementSnapshot,
  ReviewInput,
} from "@/lib/performance-statement/performance-statement-contract";
import {
  finalizePerformanceStatementFn,
  getPerformanceStatementReviewFn,
  listPerformanceStatementScopesFn,
  listPerformanceStatementsFn,
  replacePerformanceStatementFn,
  setPerformanceBillableOverrideFn,
} from "@/lib/performance-statement-runtime/performance-statement.functions";
import { renderReport } from "@/lib/report/facade";
import type { ReportFormat } from "@/lib/report/types";

export const Route = createFileRoute("/_authenticated/leistungsnachweis")({
  head: () => ({
    meta: [
      { title: "Leistungsnachweis – Engineer Console" },
      {
        name: "description",
        content: "Teamlead-Review und finalisierter Kunden-Leistungsnachweis.",
      },
    ],
  }),
  component: PerformanceStatementPage,
});

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function initialPeriod(): Pick<ReviewInput, "periodStart" | "periodEnd"> {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    periodStart: localIsoDate(monthStart),
    periodEnd: localIsoDate(today),
  };
}

function userMessage(error: unknown): string {
  const message = String((error as Error)?.message ?? error);
  if (message.includes("PERFORMANCE_STATEMENT_STALE_REVIEW")) {
    return "Die Quelldaten haben sich seit dem Review geändert. Bitte Daten neu prüfen.";
  }
  if (message.includes("PERFORMANCE_STATEMENT_CLAIM_CONFLICT")) {
    return "Mindestens eine Tätigkeit wurde inzwischen in einem anderen Leistungsnachweis verwendet.";
  }
  return "Leistungsnachweis konnte nicht verarbeitet werden.";
}

function PerformanceStatementPage() {
  const currentUser = useCurrentUser();
  const [scopes, setScopes] = useState<PerformanceStatementScopeOption[]>([]);
  const [selection, setSelection] = useState<ReviewInput | null>(null);
  const [review, setReview] = useState<PerformanceStatementReview | null>(null);
  const [history, setHistory] = useState<PerformanceStatementSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshGeneration, setRefreshGeneration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listPerformanceStatementScopesFn()
      .then((visibleScopes) => {
        if (cancelled) return;
        setScopes(visibleScopes);
        if (visibleScopes.length === 0) {
          setSelection(null);
          setReview(null);
          setHistory([]);
          setLoading(false);
          return;
        }

        const first = visibleScopes[0];
        setSelection((current) => ({
          systemhouseId: first.systemhouseId,
          customerId: first.customerId,
          ...(current
            ? {
                periodStart: current.periodStart,
                periodEnd: current.periodEnd,
              }
            : initialPeriod()),
        }));
      })
      .catch((cause: unknown) => {
        logger.warn("performance-statement.scopes.failed", {
          message: String((cause as Error)?.message ?? cause).slice(0, 200),
        });
        if (!cancelled) {
          setError("Zulässige Kunden-Scopes konnten nicht geladen werden.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selection) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getPerformanceStatementReviewFn({ data: selection }),
      listPerformanceStatementsFn({
        data: {
          systemhouseId: selection.systemhouseId,
          customerId: selection.customerId,
          periodStart: selection.periodStart,
          periodEnd: selection.periodEnd,
        },
      }),
    ])
      .then(([nextReview, statements]) => {
        if (cancelled) return;
        setReview(nextReview);
        setHistory(
          statements.filter(
            (statement) =>
              statement.periodStart === selection.periodStart &&
              statement.periodEnd === selection.periodEnd,
          ),
        );
        setLoading(false);
      })
      .catch((cause: unknown) => {
        logger.warn("performance-statement.read.failed", {
          message: String((cause as Error)?.message ?? cause).slice(0, 200),
        });
        if (!cancelled) {
          setReview(null);
          setHistory([]);
          setError(userMessage(cause));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selection, refreshGeneration]);

  const refresh = () => setRefreshGeneration((generation) => generation + 1);

  const handleOverride = async (
    row: PerformanceStatementReview["rows"][number],
    effectiveBillable: boolean,
  ) => {
    if (!selection) return;
    setBusy(true);
    setError(null);
    try {
      await setPerformanceBillableOverrideFn({
        data: {
          systemhouseId: selection.systemhouseId,
          customerId: selection.customerId,
          activitySourceId: row.activitySourceId,
          sourceRevision: row.sourceRevision,
          sourceHash: row.sourceHash,
          sourceBillable: row.sourceBillable,
          effectiveBillable,
          note: "Teamlead-Review BSF-03B",
        },
      });
      refresh();
    } catch (cause) {
      setError(userMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const handleFinalize = async () => {
    if (!selection || !review) return;
    setBusy(true);
    setError(null);
    try {
      await finalizePerformanceStatementFn({
        data: {
          ...selection,
          requestId: crypto.randomUUID(),
          expectedReviewFingerprint: review.reviewFingerprint,
        },
      });
      refresh();
    } catch (cause) {
      setError(userMessage(cause));
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleReplace = async (statement: PerformanceStatementSnapshot) => {
    if (!selection || !review) return;
    setBusy(true);
    setError(null);
    try {
      await replacePerformanceStatementFn({
        data: {
          ...selection,
          requestId: crypto.randomUUID(),
          replacesStatementId: statement.id,
          expectedReviewFingerprint: review.reviewFingerprint,
        },
      });
      refresh();
    } catch (cause) {
      setError(userMessage(cause));
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (
    statement: PerformanceStatementSnapshot,
    format: ReportFormat,
  ) => {
    setBusy(true);
    setError(null);
    try {
      const result = await renderReport({
        reportId: "performance-statement",
        format,
        input: statement,
        context: {
          actor: {
            id: currentUser?.id ?? null,
            displayName: currentUser?.displayName ?? currentUser?.email ?? "Angemeldeter Benutzer",
            role: currentUser?.role ?? "viewer",
          },
          generatedAt: new Date(),
          period: `${statement.periodStart}_${statement.periodEnd}`,
        },
      });

      const download = await ExportDownloadService.addDownload({
        fileName: result.fileName,
        format,
        period: `${statement.periodStart} – ${statement.periodEnd}`,
        createdBy: currentUser?.displayName ?? currentUser?.email ?? "Angemeldeter Benutzer",
        reportId: result.metadata.reportId,
        blob: result.blob,
      });
      await ExportDownloadService.triggerDownload(download.id);
    } catch (cause) {
      logger.warn("performance-statement.export.failed", {
        message: String((cause as Error)?.message ?? cause).slice(0, 200),
      });
      setError("Leistungsnachweis-Export konnte nicht erstellt werden.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PermissionGate permission="performance.statement.manage">
      <CustomerPageShell sectionTitle="Leistungsnachweis">
        <PerformanceStatementView
          scopes={scopes}
          selection={selection}
          review={review}
          history={history}
          loading={loading}
          busy={busy}
          error={error}
          onSelectionChange={setSelection}
          onOverride={handleOverride}
          onFinalize={handleFinalize}
          onReplace={handleReplace}
          onExport={handleExport}
        />
      </CustomerPageShell>
    </PermissionGate>
  );
}
