import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSafeAsync } from "@/hooks/useSafeAsync";
import { logger } from "@/lib/logger";

describe("useSafeAsync", () => {
  it("should_setData_when_fnResolves", async () => {
    const { result } = renderHook(() => useSafeAsync(async (x: unknown) => `ok:${x}`));
    await act(async () => {
      await result.current.execute("42");
    });
    expect(result.current.data).toBe("ok:42");
    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("should_captureError_and_logIt_when_fnThrows", async () => {
    const spy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const { result } = renderHook(() =>
      useSafeAsync(async () => {
        throw new Error("kaboom");
      }, { label: "boomOp" }),
    );
    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe("kaboom");
    expect(spy).toHaveBeenCalledWith("useSafeAsync failed", expect.any(Error), { label: "boomOp" });
  });

  it("reset_should_clearAllState", async () => {
    const { result } = renderHook(() => useSafeAsync(async () => "v"));
    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.data).toBe("v");
    act(() => result.current.reset());
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
