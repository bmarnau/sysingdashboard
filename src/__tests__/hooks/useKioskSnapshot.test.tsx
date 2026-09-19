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

const HYBRID_SNAPSHOT: KioskSnapshot = {
  ...SNAPSHOT,
  mode: "hybrid",
  datasetVersion: "sysing.kiosk.hybrid.v1",
  observedAt: "2026-09-18T10:00:00.000Z",
  period: { from: "2026-09-01", to: "2026-09-19" },
  domains: [
    {
      id: "projects",
      title: "Projekte",
      level: "ok",
      sourceKind: "internal",
      observedAt: "2026-09-18T10:00:00.000Z",
      metrics: [{ label: "Projekte mit Leistung im Zeitraum", value: 3, level: "ok" }],
    },
    {
      id: "infrastructure",
      title: "Infrastruktur",
      level: "ok",
      sourceKind: "demo",
      observedAt: "2026-09-19T05:00:00.000Z",
      metrics: [{ label: "OK", value: 10, level: "ok" }],
    },
  ],
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

    act(() => {
      vi.advanceTimersByTime(59_999);
    });
    expect(getSnapshot).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(getSnapshot).toHaveBeenCalledTimes(2);
    unmount();
  });

  it("retains the last good snapshot when a later refresh fails", async () => {
    vi.useFakeTimers();
    let rejectRefresh!: (reason?: unknown) => void;
    const failedRefresh = new Promise<KioskSnapshot>((_resolve, reject) => {
      rejectRefresh = reject;
    });
    const getSnapshot = vi
      .fn<() => Promise<KioskSnapshot>>()
      .mockResolvedValueOnce(SNAPSHOT)
      .mockReturnValueOnce(failedRefresh);
    const provider: KioskDataProvider = { getSnapshot };
    const { result, unmount } = renderHook(() => useKioskSnapshot(provider));
    await act(async () => Promise.resolve());
    expect(result.current.snapshot).toEqual(SNAPSHOT);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(getSnapshot).toHaveBeenCalledTimes(2);

    await act(async () => {
      rejectRefresh(new Error("network"));
      await Promise.resolve();
    });
    expect(result.current.snapshot).toEqual(SNAPSHOT);
    expect(result.current.refreshError).toBe("Aktualisierung fehlgeschlagen");
    unmount();
  });

  it("retains the last good hybrid snapshot when an internal refresh fails", async () => {
    vi.useFakeTimers();
    const getSnapshot = vi
      .fn<() => Promise<KioskSnapshot>>()
      .mockResolvedValueOnce(HYBRID_SNAPSHOT)
      .mockRejectedValueOnce(new Error("internal read failed"));
    const provider: KioskDataProvider = { getSnapshot };
    const { result, unmount } = renderHook(() => useKioskSnapshot(provider));

    await act(async () => Promise.resolve());
    expect(result.current.snapshot).toEqual(HYBRID_SNAPSHOT);

    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });

    expect(result.current.status).toBe("ready");
    expect(result.current.snapshot).toEqual(HYBRID_SNAPSHOT);
    expect(result.current.snapshot?.mode).toBe("hybrid");
    expect(result.current.refreshError).toBe("Aktualisierung fehlgeschlagen");
    unmount();
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
