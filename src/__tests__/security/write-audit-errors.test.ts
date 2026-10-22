import { beforeEach, describe, expect, it, vi } from "vitest";

const loggerError = vi.fn();

vi.mock("@/lib/logger", () => ({
  logger: { error: (...args: unknown[]) => loggerError(...args), warn: vi.fn(), info: vi.fn() },
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: vi.fn() }));

import { writeAudit } from "@/lib/admin/auth-accounts.server";

type AdminClient = Parameters<typeof writeAudit>[0];

function adminWith(result: () => Promise<{ error: unknown }>): AdminClient {
  return { from: () => ({ insert: result }) } as unknown as AdminClient;
}

describe("writeAudit (SEC-AUDIT-ERRORS)", () => {
  beforeEach(() => loggerError.mockClear());

  it("reports an error returned by the database instead of swallowing it", async () => {
    const dbError = { message: "permission denied", code: "42501" };

    await expect(
      writeAudit(
        adminWith(async () => ({ error: dbError })),
        "actor-1",
        "auth_account.delete",
        "target-1",
        { reason: "geheim" },
      ),
    ).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalledTimes(1);
    const [message, error, context] = loggerError.mock.calls[0];
    expect(message).toBe("auth.audit.write_failed");
    expect(error).toBe(dbError);
    expect(context).toEqual({ action: "auth_account.delete", target: "target-1" });
  });

  it("never logs the payload", async () => {
    await writeAudit(
      adminWith(async () => ({ error: { message: "x" } })),
      "actor-1",
      "auth_account.password_set",
      "target-1",
      { secret: "do-not-log" },
    );

    expect(JSON.stringify(loggerError.mock.calls)).not.toContain("do-not-log");
  });

  it("reports a thrown error without failing the action", async () => {
    await expect(
      writeAudit(
        adminWith(async () => {
          throw new Error("network");
        }),
        "actor-1",
        "auth_account.confirm",
        "target-1",
        {},
      ),
    ).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalledTimes(1);
  });

  it("stays silent when the audit entry was written", async () => {
    await writeAudit(
      adminWith(async () => ({ error: null })),
      "actor-1",
      "auth_account.confirm",
      "target-1",
      {},
    );

    expect(loggerError).not.toHaveBeenCalled();
  });
});
