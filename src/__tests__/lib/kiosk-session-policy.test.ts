import { describe, expect, it } from "vitest";
import { resolveKioskSessionPolicy } from "@/lib/kiosk/kiosk-session-policy";

describe("kiosk session policy", () => {
  it("disables idle logout only for kiosk on /kiosk", () => {
    expect(resolveKioskSessionPolicy({ pathname: "/kiosk", hasKioskView: true })).toEqual({
      kioskMode: true,
      redirectTo: null,
      idleLogoutEnabled: false,
    });
  });

  it("redirects kiosk accounts away from other protected routes", () => {
    expect(resolveKioskSessionPolicy({ pathname: "/dashboard", hasKioskView: true })).toEqual({
      kioskMode: true,
      redirectTo: "/kiosk",
      idleLogoutEnabled: false,
    });
  });

  it("redirects normal accounts away from /kiosk", () => {
    expect(resolveKioskSessionPolicy({ pathname: "/kiosk", hasKioskView: false })).toEqual({
      kioskMode: false,
      redirectTo: "/dashboard",
      idleLogoutEnabled: true,
    });
  });

  it("keeps normal protected sessions unchanged", () => {
    expect(resolveKioskSessionPolicy({ pathname: "/dashboard", hasKioskView: false })).toEqual({
      kioskMode: false,
      redirectTo: null,
      idleLogoutEnabled: true,
    });
  });
});
