import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKioskSnapshot } from "@/hooks/useKioskSnapshot";
import type { KioskDataProvider, KioskSnapshot } from "@/lib/kiosk/kiosk-contract";

const SNAPSHOT: KioskSnapshot = {
  mode: "demo",
  datasetState: "loaded",
  datasetVersion: "1.0.0",
  generatedAt: "2026-09-14T06:00:00.000Z",
  observedAt: "2026-09-14T06:00:00.000Z",
  domains: [],
};

afterEach(() => {
  vi.useRealTimers();
});

describe("useKioskSnapshot", () => {
  it("loads immediately and refreshes exactly every 60 seconds", async () => {
    vi.useFakeTimers();
    const getSnapshot = vi.fn(async () => SNAPSHOT);
    const provider: KioskDataProvider = { getSnapshot };

    const { result, unmount } = renderHook(() => useKioskSnapshot(provider));
    await act(async () => Promise.resolve());
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("ready");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(59_999);
    });
    expect(getSnapshot).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(getSnapshot).toHaveBeenCalledTimes(2);
    unmount();
  });

  it("retains the last good snapshot when a later refresh fails", async () => {
    vi.useFakeTimers();
    const getSnapshot = vi
      .fn<() => Promise<KioskSnapshot>>()
      .mockResolvedValueOnce(SNAPSHOT)
      .mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useKioskSnapshot({ getSnapshot }));
    await act(async () => Promise.resolve());
    expect(result.current.snapshot).toEqual(SNAPSHOT);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(result.current.snapshot).toEqual(SNAPSHOT);
    expect(result.current.refreshError).toBe("Aktualisierung fehlgeschlagen");
  });

  it("reports an initial provider failure without inventing data", async () => {
    const provider: KioskDataProvider = {
      getSnapshot: async () => {
        throw new Error("failed");
      },
    };
    const { result } = renderHook(() => useKioskSnapshot(provider));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.snapshot).toBeNull();
  });
});
