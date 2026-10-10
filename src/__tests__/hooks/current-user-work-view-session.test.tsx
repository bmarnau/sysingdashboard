import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useWorkPackageWorkView } from "@/hooks/useWorkPackageWorkView";
import type { WorkPackageWorkViewRow } from "@/lib/avkk/work-package-work-view.types";

type ReadResult = { data: unknown; error: null };
type AuthListener = (event: string, session: Session | null) => void;
const transport = vi.hoisted(() => ({
  session: null as Session | null,
  listeners: new Set<AuthListener>(),
  profiles: new Map<string, Promise<ReadResult>>(),
  roles: new Map<string, Promise<ReadResult>>(),
  workRead: vi.fn(),
}));

// Only external session/profile/AP reads are replaced. Both production hooks
// and their refresh, permission and stale-response boundaries remain real.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: transport.session }, error: null }),
      onAuthStateChange: (listener: AuthListener) => {
        transport.listeners.add(listener);
        return {
          data: { subscription: { unsubscribe: () => transport.listeners.delete(listener) } },
        };
      },
    },
    from: (table: string) => ({
      select: () => ({
        eq: (_column: string, id: string) => {
          const result = (table === "profiles" ? transport.profiles : transport.roles).get(id);
          if (!result) throw new Error("Missing synthetic profile fixture");
          return table === "profiles" ? { maybeSingle: () => result } : result;
        },
      }),
    }),
  },
}));
vi.mock("@/lib/avkk-runtime/work-package-work-view.functions", () => ({
  readWorkPackageWorkViewFn: transport.workRead,
}));

function session(id: string): Session {
  return {
    access_token: "synthetic-session-token",
    refresh_token: "synthetic-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id,
      aud: "authenticated",
      email: `${id}@example.invalid`,
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      created_at: "2026-10-10T00:00:00Z",
    },
  };
}
function profile(id: string): ReadResult {
  return {
    data: {
      id,
      first_name: "Test",
      last_name: id,
      display_name: `Test ${id}`,
      email: `${id}@example.invalid`,
      phone: "",
      status: "active",
      mfa_enabled: false,
      profile_image: null,
      created_at: "2026-10-10T00:00:00Z",
      updated_at: "2026-10-10T00:00:00Z",
    },
    error: null,
  };
}
function rows(id: string): WorkPackageWorkViewRow[] {
  return [
    {
      workPackageId: `AP-${id}`,
      sourceId: `WP-${id}`,
      systemhouseId: "SH-Test",
      customerId: `C-${id}`,
      customerName: `Kunde ${id}`,
      title: `Aufgabe ${id}`,
      status: "open",
      due: null,
      dueGroup: "NO_DUE_DATE",
      owner: "UNASSIGNED",
      deputies: [],
      asOfDate: "2026-10-10",
    },
  ];
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function emit(event: string, next: Session | null) {
  transport.session = next;
  transport.listeners.forEach((listener) => listener(event, next));
}

describe("actual auth/profile boundary of the work-package view", () => {
  beforeEach(() => {
    transport.listeners.clear();
    transport.profiles.clear();
    transport.roles.clear();
    for (const id of ["a", "b"]) {
      transport.profiles.set(id, Promise.resolve(profile(id)));
      transport.roles.set(id, Promise.resolve({ data: [{ role: "teamlead" }], error: null }));
    }
    transport.session = session("a");
    transport.workRead.mockReset();
    transport.workRead.mockImplementation(async () => rows(transport.session!.user.id));
  });

  it("hides A's AP rows as soon as SIGNED_IN B is observed, before B's profile arrives", async () => {
    const pending = deferred<ReadResult>();
    transport.profiles.set("b", pending.promise);
    const { result } = renderHook(() => useWorkPackageWorkView());
    await waitFor(() => expect(result.current.rows[0]?.workPackageId).toBe("AP-a"));
    act(() => emit("SIGNED_IN", session("b")));
    expect(result.current.rows).toEqual([]);
    await act(async () => {
      pending.resolve(profile("b"));
    });
    await waitFor(() => expect(result.current.rows[0]?.workPackageId).toBe("AP-b"));
  });

  it("does not republish an older profile after the newer account has loaded", async () => {
    const old = deferred<ReadResult>();
    transport.profiles.set("a", old.promise);
    const { result } = renderHook(() => useCurrentUser());
    await act(async () => {});
    act(() => emit("SIGNED_IN", session("b")));
    await waitFor(() => expect(result.current?.id).toBe("b"));
    await act(async () => {
      old.resolve(profile("a"));
    });
    expect(result.current?.id).toBe("b");
  });

  it("keeps signout empty when an earlier profile response arrives afterwards", async () => {
    const old = deferred<ReadResult>();
    transport.profiles.set("a", old.promise);
    const { result } = renderHook(() => useCurrentUser());
    await act(async () => {});
    await act(async () => emit("SIGNED_OUT", null));
    await act(async () => {
      old.resolve(profile("a"));
    });
    expect(result.current).toBeNull();
  });

  it("does not let an older role read overwrite a newer observed permission revocation", async () => {
    const { result } = renderHook(() => useCurrentUser());
    await waitFor(() => expect(result.current?.role).toBe("teamlead"));
    const old = deferred<ReadResult>();
    transport.roles.set("a", old.promise);
    await act(async () => emit("USER_UPDATED", session("a")));
    transport.roles.set("a", Promise.resolve({ data: [{ role: "viewer" }], error: null }));
    act(() => emit("USER_UPDATED", session("a")));
    await waitFor(() => expect(result.current?.role).toBe("viewer"));
    await act(async () => {
      old.resolve({ data: [{ role: "teamlead" }], error: null });
    });
    expect(result.current?.role).toBe("viewer");
  });

  it("ignores A's pending AP response while B's actual profile is still loading", async () => {
    const oldWork = deferred<WorkPackageWorkViewRow[]>();
    const newProfile = deferred<ReadResult>();
    transport.workRead.mockReturnValueOnce(oldWork.promise);
    transport.profiles.set("b", newProfile.promise);
    const { result } = renderHook(() => useWorkPackageWorkView());
    await waitFor(() => expect(result.current.loading).toBe(true));
    await act(async () => emit("SIGNED_IN", session("b")));
    await act(async () => {
      oldWork.resolve(rows("a"));
    });
    expect(result.current.rows).toEqual([]);
    await act(async () => {
      newProfile.resolve(profile("b"));
    });
    await waitFor(() => expect(result.current.rows[0]?.workPackageId).toBe("AP-b"));
  });
});
