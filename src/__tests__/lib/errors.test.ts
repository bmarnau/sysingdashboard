import { describe, it, expect } from "vitest";
import {
  DashboardError,
  SyncError,
  ImportError,
  ValidationError,
  ExportError,
  AzureError,
  BackupError,
  RbacError,
  isDashboardError,
  wrapError,
} from "@/lib/errors";

describe("DashboardError", () => {
  it("should_setCodeMessageAndContext_when_constructed", () => {
    const err = new DashboardError("X_FAILED", "boom", { context: { userId: "u1" } });
    expect(err.code).toBe("X_FAILED");
    expect(err.message).toBe("boom");
    expect(err.context).toEqual({ userId: "u1" });
    expect(err instanceof Error).toBe(true);
  });

  it("should_serializeSafely_via_toJSON", () => {
    const inner = new Error("original");
    const err = new DashboardError("X", "wrapped", { cause: inner, context: { a: 1 } });
    const json = err.toJSON();
    expect(json.code).toBe("X");
    expect(json.context).toEqual({ a: 1 });
    expect((json.cause as { message: string }).message).toBe("original");
  });

  it("should_expose_subclass_names", () => {
    expect(new SyncError("S", "").name).toBe("SyncError");
    expect(new ImportError("I", "").name).toBe("ImportError");
    expect(new ValidationError("V", "").name).toBe("ValidationError");
    expect(new ExportError("E", "").name).toBe("ExportError");
    expect(new AzureError("A", "").name).toBe("AzureError");
    expect(new BackupError("B", "").name).toBe("BackupError");
    expect(new RbacError("R", "").name).toBe("RbacError");
  });

  it("isDashboardError_should_return_true_for_subclass_and_false_for_plain_error", () => {
    expect(isDashboardError(new ImportError("X", ""))).toBe(true);
    expect(isDashboardError(new Error("plain"))).toBe(false);
    expect(isDashboardError(null)).toBe(false);
  });

  it("wrapError_should_return_original_when_already_dashboardError", () => {
    const original = new SyncError("S", "orig");
    const wrapped = wrapError("OTHER", "other", original);
    expect(wrapped).toBe(original);
  });

  it("wrapError_should_wrap_plainError_and_preserve_cause", () => {
    const cause = new Error("io");
    const wrapped = wrapError("X_FAILED", "friendly", cause, { path: "/tmp" });
    expect(wrapped.code).toBe("X_FAILED");
    expect(wrapped.context).toEqual({ path: "/tmp" });
    expect(wrapped.cause).toBe(cause);
  });
});
