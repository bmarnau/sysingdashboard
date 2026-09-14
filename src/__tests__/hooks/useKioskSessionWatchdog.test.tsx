import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKioskSessionWatchdog } from "@/hooks/useKioskSessionWatchdog";
import type { KioskSessionCheckResult } from "@/lib/kiosk/kiosk-session-watchdog";

afterEach(() => vi.useRealTimers());

describe("useKioskSessionWatchdog", () => {
  it("checks immediately and every 60 seconds without idle activity", async () => {
    vi.useFakeTimers();
    const check = vi.fn<() => Promise<KioskSessionCheckResult>>().mockResolvedValue("valid");
    const logout = vi.fn(async () => true);
    const { result } = renderHook(() =>
      useKioskSessionWatchdog({ userId: "kiosk-1", check, logout }),
    );

    await act(async () => Promise.resolve());
    expect(check).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("valid");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(check).toHaveBeenCalledTimes(2);
    expect(logout).not.toHaveBeenCalled();
  });

  it("logs out an invalid or inactive kiosk session", async () => {
    const invalidLogout = vi.fn(async () => true);
    const { unmount } = renderHook(() =>
      useKioskSessionWatchdog({
        userId: "kiosk-1",
        check: async () => "invalid",
        logout: invalidLogout,
      }),
    );
    await act(async () => Promise.resolve());
    expect(invalidLogout).toHaveBeenCalledWith("session_invalid");
    unmount();

    const inactiveLogout = vi.fn(async () => true);
    renderHook(() =>
      useKioskSessionWatchdog({
        userId: "kiosk-1",
        check: async () => "inactive",
        logout: inactiveLogout,
      }),
    );
    await act(async () => Promise.resolve());
    expect(inactiveLogout).toHaveBeenCalledWith("account_inactive");
  });

  it("blocks the kiosk view when account status is temporarily unverifiable", async () => {
    const logout = vi.fn(async () => true);
    const { result } = renderHook(() =>
      useKioskSessionWatchdog({
        userId: "kiosk-1",
        check: async () => "unavailable",
        logout,
      }),
    );
    await act(async () => Promise.resolve());
    expect(result.current.status).toBe("unavailable");
    expect(logout).not.toHaveBeenCalled();
  });
});
