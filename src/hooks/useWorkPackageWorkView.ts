import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRefreshSignal } from "@/hooks/useRefreshSignal";
import { readWorkPackageWorkViewFn } from "@/lib/avkk-runtime/work-package-work-view.functions";
import type { WorkPackageWorkViewRow } from "@/lib/avkk/work-package-work-view.types";
import { can } from "@/lib/rbac/permissions";

interface ReadState {
  key: string;
  rows: readonly WorkPackageWorkViewRow[];
  loading: boolean;
  error: string | null;
}

const EMPTY_ROWS: readonly WorkPackageWorkViewRow[] = [];
const READ_ERROR = "Die Arbeitspakete konnten nicht geladen werden. Bitte versuchen Sie es erneut.";

export function useWorkPackageWorkView() {
  const user = useCurrentUser();
  const enabled = user?.status === "active" && can(user, "avkk.management.view");
  const generation = useRefreshSignal();
  const [tick, setTick] = useState(0);
  const key = enabled ? `${user?.id}:${generation}:${tick}` : "";
  const [state, setState] = useState<ReadState>({
    key: "",
    rows: EMPTY_ROWS,
    loading: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ key, rows: EMPTY_ROWS, loading: enabled, error: null });
    if (!enabled) return;

    readWorkPackageWorkViewFn({ data: {} })
      .then((rows) => {
        if (!cancelled) setState({ key, rows, loading: false, error: null });
      })
      .catch(() => {
        if (!cancelled) setState({ key, rows: EMPTY_ROWS, loading: false, error: READ_ERROR });
      });
    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  // Do not wait for effects to hide a previous account's response.
  const current = enabled && state.key === key;
  return {
    rows: current ? state.rows : EMPTY_ROWS,
    loading: enabled && (!current || state.loading),
    error: current ? state.error : null,
    refresh: useCallback(() => setTick((value) => value + 1), []),
  };
}
