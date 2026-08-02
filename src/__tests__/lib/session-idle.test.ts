import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseIdleTimeoutValue,
  resolveIdleTimeout,
  warningSecondsFor,
  DEFAULT_IDLE_TIMEOUT_MINUTES,
} from "@/lib/session/idle-config";
import { startIdleMonitor } from "@/lib/session/idle-monitor";
import { readLastActivity, persistLastActivity, clearLastActivity } from "@/lib/session/idle-channel";

describe("idle-config", () => {
  it("should_useDefaultWhenNothingConfigured", () => {
    expect(resolveIdleTimeout({})).toEqual({
      minutes: DEFAULT_IDLE_TIMEOUT_MINUTES,
      source: "default",
    });
  });

  it("should_preferSettingOverEnv", () => {
    expect(resolveIdleTimeout({ settingValue: 15, envValue: "30" })).toEqual({
      minutes: 15,
      source: "setting",
    });
  });

  it("should_fallBackToEnvWhenSettingInvalid", () => {
    const out = resolveIdleTimeout({ settingValue: 0, envValue: "30" });
    expect(out.minutes).toBe(30);
    expect(out.source).toBe("env");
    expect(out.invalidReason).toContain("Systemeinstellung");
  });

  it.each([["", "leer"], ["abc", "keine Zahl"], ["0", "kleiner"], ["-5", "kleiner"], ["481", "größer"], ["2.5", "ganze"]])(
    "should_rejectInvalidValue_%s",
    (raw) => {
      const parsed = parseIdleTimeoutValue(raw);
      expect(parsed.minutes).toBeNull();
    },
  );

  it("should_acceptBoundaryValues", () => {
    expect(parseIdleTimeoutValue(1).minutes).toBe(1);
    expect(parseIdleTimeoutValue(480).minutes).toBe(480);
  });

  it("should_neverDisableTimeoutOnInvalidInput", () => {
    const out = resolveIdleTimeout({ settingValue: "unendlich", envValue: "0" });
    expect(out.minutes).toBe(DEFAULT_IDLE_TIMEOUT_MINUTES);
    expect(out.source).toBe("default");
  });

  it("should_capWarningAtTwentyPercent", () => {
    expect(warningSecondsFor(5)).toBe(60);
    expect(warningSecondsFor(1)).toBe(12);
    expect(warningSecondsFor(60)).toBe(60);
  });
});

describe("idle-monitor", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function setup(overrides: Partial<Parameters<typeof startIdleMonitor>[0]> = {}) {
    const onWarn = vi.fn();
    const onTick = vi.fn();
    const onExpire = vi.fn();
    const onActivity = vi.fn();
    const monitor = startIdleMonitor({
      timeoutMs: 60_000,
      warningMs: 10_000,
      onWarn,
      onTick,
      onExpire,
      onActivity,
      ...overrides,
    });
    return { monitor, onWarn, onTick, onExpire, onActivity };
  }

  it("should_warnBeforeExpiry", () => {
    const { onWarn, onExpire, monitor } = setup();
    vi.advanceTimersByTime(50_000);
    expect(onWarn).toHaveBeenCalledTimes(1);
    expect(onExpire).not.toHaveBeenCalled();
    monitor.stop();
  });

  it("should_expireExactlyOnce", () => {
    const { onExpire, monitor } = setup();
    vi.advanceTimersByTime(120_000);
    expect(onExpire).toHaveBeenCalledTimes(1);
    monitor.stop();
  });

  it("should_resetOnUserActivity", () => {
    const { onExpire, monitor } = setup();
    vi.advanceTimersByTime(55_000);
    window.dispatchEvent(new Event("keydown"));
    vi.advanceTimersByTime(30_000);
    expect(onExpire).not.toHaveBeenCalled();
    monitor.stop();
  });

  it("should_broadcastActivityThrottled", () => {
    const { onActivity, monitor } = setup();
    window.dispatchEvent(new Event("mousemove"));
    vi.advanceTimersByTime(500);
    window.dispatchEvent(new Event("mousemove"));
    expect(onActivity).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2500);
    window.dispatchEvent(new Event("mousemove"));
    expect(onActivity).toHaveBeenCalledTimes(2);
    monitor.stop();
  });

  it("should_expireAfterSystemSleepGap", () => {
    let clock = 1_000_000;
    const onExpire = vi.fn();
    const monitor = startIdleMonitor({
      timeoutMs: 60_000,
      warningMs: 10_000,
      onWarn: vi.fn(),
      onTick: vi.fn(),
      onExpire,
      now: () => clock,
    });
    clock += 3_600_000; // Standby
    vi.advanceTimersByTime(1000);
    expect(onExpire).toHaveBeenCalledTimes(1);
    monitor.stop();
  });

  it("should_removeListenersOnStop", () => {
    const { monitor, onExpire } = setup();
    monitor.stop();
    vi.advanceTimersByTime(120_000);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("should_ignoreOlderExternalTimestamps", () => {
    const { monitor } = setup();
    const before = monitor.getLastActivity();
    monitor.notifyActivity(before - 5000);
    expect(monitor.getLastActivity()).toBe(before);
    monitor.stop();
  });
});

describe("idle-channel storage", () => {
  beforeEach(() => clearLastActivity());

  it("should_restorePlausibleTimestamp", () => {
    const now = Date.now();
    persistLastActivity(now - 1000);
    expect(readLastActivity(300_000, now)).toBe(now - 1000);
  });

  it("should_rejectFutureTimestamp", () => {
    const now = Date.now();
    persistLastActivity(now + 600_000);
    expect(readLastActivity(300_000, now)).toBeNull();
  });

  it("should_rejectStaleTimestamp", () => {
    const now = Date.now();
    persistLastActivity(now - 3_600_000);
    expect(readLastActivity(300_000, now)).toBeNull();
  });
});
