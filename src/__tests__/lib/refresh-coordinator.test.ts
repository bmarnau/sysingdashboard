import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetRefreshForTest,
  isRefreshRunning,
  lastRefreshResult,
  listRefreshSteps,
  refreshGeneration,
  registerRefreshStep,
  runRefresh,
  subscribeRefresh,
} from "@/lib/refresh/refresh-coordinator";

describe("RefreshCoordinator", () => {
  beforeEach(() => {
    __resetRefreshForTest();
  });

  it("führt registrierte Schritte aus und erhöht die Generation", async () => {
    const run = vi.fn();
    registerRefreshStep({ id: "a", label: "A", run });

    const before = refreshGeneration();
    const result = await runRefresh();

    expect(run).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(refreshGeneration()).toBe(before + 1);
  });

  it("arbeitet Stufen nacheinander ab", async () => {
    const order: string[] = [];
    registerRefreshStep({ id: "late", label: "Spät", stage: 1, run: () => void order.push("late") });
    registerRefreshStep({
      id: "early",
      label: "Früh",
      stage: 0,
      run: async () => {
        await Promise.resolve();
        order.push("early");
      },
    });

    await runRefresh();
    expect(order).toEqual(["early", "late"]);
  });

  it("isoliert Teilfehler und meldet den betroffenen Bereich", async () => {
    const ok = vi.fn();
    registerRefreshStep({ id: "ok", label: "Kataloge", run: ok });
    registerRefreshStep({
      id: "bad",
      label: "AVKK",
      run: () => Promise.reject(new Error("keine Verbindung")),
    });

    const result = await runRefresh();

    expect(ok).toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.failed).toEqual([
      { id: "bad", label: "AVKK", message: "keine Verbindung" },
    ]);
    expect(lastRefreshResult()?.ok).toBe(false);
  });

  it("bündelt parallele Aufrufe (Single-Flight)", async () => {
    const run = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    registerRefreshStep({ id: "a", label: "A", run });

    const first = runRefresh();
    const second = runRefresh();
    expect(isRefreshRunning()).toBe(true);
    const [r1, r2] = await Promise.all([first, second]);

    expect(run).toHaveBeenCalledTimes(1);
    expect(r1).toBe(r2);
    expect(refreshGeneration()).toBe(1);
    expect(isRefreshRunning()).toBe(false);
  });

  it("benachrichtigt Abonnenten und erlaubt Deregistrierung", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRefresh(listener);
    const unregister = registerRefreshStep({ id: "a", label: "A", run: () => undefined });

    await runRefresh();
    expect(listener).toHaveBeenCalledTimes(1);

    unregister();
    unsubscribe();
    expect(listRefreshSteps()).toHaveLength(0);

    await runRefresh();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
