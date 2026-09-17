import { describe, expect, it } from "vitest";
import { checkKioskSession } from "@/lib/kiosk/kiosk-session-watchdog";

type Result<T> = Promise<{ data: T; error: unknown }>;

function client(input: {
  userId?: string | null;
  userError?: unknown;
  active?: boolean | null;
  activeError?: unknown;
}) {
  return {
    auth: {
      getUser: async (): Result<{ user: { id: string } | null }> => ({
        data: { user: input.userId ? { id: input.userId } : null },
        error: input.userError ?? null,
      }),
    },
    rpc: async (): Result<boolean | null> => ({
      data: input.active ?? null,
      error: input.activeError ?? null,
    }),
  };
}

describe("kiosk session watchdog", () => {
  it("accepts only the expected authenticated and active user", async () => {
    await expect(
      checkKioskSession(client({ userId: "kiosk-1", active: true }), "kiosk-1"),
    ).resolves.toBe("valid");
  });

  it("marks missing, rejected or changed auth sessions invalid", async () => {
    await expect(checkKioskSession(client({ userId: null }), "kiosk-1")).resolves.toBe("invalid");
    await expect(
      checkKioskSession(client({ userId: "kiosk-1", userError: new Error("expired") }), "kiosk-1"),
    ).resolves.toBe("invalid");
    await expect(
      checkKioskSession(client({ userId: "other", active: true }), "kiosk-1"),
    ).resolves.toBe("invalid");
  });

  it("marks a deactivated account inactive", async () => {
    await expect(
      checkKioskSession(client({ userId: "kiosk-1", active: false }), "kiosk-1"),
    ).resolves.toBe("inactive");
  });

  it("blocks silently continuing when account status cannot be verified", async () => {
    await expect(
      checkKioskSession(
        client({ userId: "kiosk-1", activeError: new Error("network") }),
        "kiosk-1",
      ),
    ).resolves.toBe("unavailable");
  });
});
