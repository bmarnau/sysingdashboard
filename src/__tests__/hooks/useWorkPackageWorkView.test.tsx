import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkPackageWorkView } from "@/hooks/useWorkPackageWorkView";
import type { UserProfile } from "@/lib/user-management";
import type { WorkPackageWorkViewRow } from "@/lib/avkk/work-package-work-view.types";

const boundary = vi.hoisted(() => ({ user: null as UserProfile | null, read: vi.fn() }));
vi.mock("@/hooks/useCurrentUser", () => ({ useCurrentUser: () => boundary.user }));
vi.mock("@/lib/avkk-runtime/work-package-work-view.functions", () => ({
  readWorkPackageWorkViewFn: boundary.read,
}));

function user(id = "user-a", role: UserProfile["role"] = "teamlead"): UserProfile {
  return {
    id,
    role,
    status: "active",
    firstName: "Test",
    lastName: "Leitung",
    displayName: "Test Leitung",
    email: "test@example.invalid",
    phone: "",
    mfaEnabled: false,
    createdAt: "2026-10-04",
    updatedAt: "2026-10-04",
  };
}
const rows: WorkPackageWorkViewRow[] = [
  {
    workPackageId: "AP-1",
    sourceId: "WP-1",
    systemhouseId: "SH-A",
    customerId: "C-A",
    customerName: "Alpha GmbH",
    title: "Migration",
    status: "open",
    due: "2026-10-04",
    dueGroup: "TODAY",
    owner: "UNASSIGNED",
    deputies: [],
    asOfDate: "2026-10-04",
  },
];
function deferred() {
  let resolve!: (value: WorkPackageWorkViewRow[]) => void;
  const promise = new Promise<WorkPackageWorkViewRow[]>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe("useWorkPackageWorkView session boundary", () => {
  beforeEach(() => {
    boundary.user = user();
    boundary.read.mockReset();
    boundary.read.mockResolvedValue(rows);
  });

  it("loads the authorized result without browser scope or clock arguments", async () => {
    const { result } = renderHook(() => useWorkPackageWorkView());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows).toEqual(rows);
    expect(boundary.read).toHaveBeenCalledWith({ data: {} });
  });

  it.each([null, user("viewer", "viewer"), { ...user(), status: "inactive" }])(
    "does not read for an absent, unauthorized or inactive user",
    async (identity) => {
      boundary.user = identity as UserProfile | null;
      const { result } = renderHook(() => useWorkPackageWorkView());
      expect(result.current.rows).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(boundary.read).not.toHaveBeenCalled();
    },
  );

  it("hides old rows at render time when the account changes", async () => {
    const seen: readonly WorkPackageWorkViewRow[][] = [];
    const { result, rerender } = renderHook(() => {
      const state = useWorkPackageWorkView();
      if (boundary.user?.id === "user-b")
        (seen as WorkPackageWorkViewRow[][]).push([...state.rows]);
      return state;
    });
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    const next = deferred();
    boundary.read.mockReturnValueOnce(next.promise);
    boundary.user = user("user-b");
    rerender();
    expect(seen.every((snapshot) => snapshot.length === 0)).toBe(true);
    expect(result.current.loading).toBe(true);
    await act(async () => {
      next.resolve([]);
    });
    expect(result.current.rows).toEqual([]);
  });

  it("ignores a late response from an earlier account", async () => {
    const old = deferred();
    const current = deferred();
    boundary.read.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const { result, rerender } = renderHook(() => useWorkPackageWorkView());
    boundary.user = user("user-b");
    rerender();
    await act(async () => {
      current.resolve([]);
      old.resolve(rows);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.rows).toEqual([]);
  });

  it("clears data immediately when management permission is revoked", async () => {
    const { result, rerender } = renderHook(() => useWorkPackageWorkView());
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    boundary.user = user("user-a", "engineer");
    rerender();
    expect(result.current.rows).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(boundary.read).toHaveBeenCalledTimes(1);
  });

  it("fails closed on refresh and permits retry without exposing the raw error", async () => {
    const { result } = renderHook(() => useWorkPackageWorkView());
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    boundary.read.mockRejectedValueOnce(new Error("internal-scope-id/private-database-detail"));
    act(() => {
      result.current.refresh();
    });
    expect(result.current.rows).toEqual([]);
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.rows).toEqual([]);
    expect(result.current.error).not.toMatch(/internal-scope|private-database/);
    act(() => {
      result.current.refresh();
    });
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(result.current.error).toBeNull();
  });
});
