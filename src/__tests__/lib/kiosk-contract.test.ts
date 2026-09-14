import { describe, expect, it } from "vitest";
import { KIOSK_DOMAIN_IDS, KIOSK_REFRESH_MS } from "@/lib/kiosk/kiosk-contract";

describe("kiosk contract", () => {
  it("defines the fixed kiosk refresh and six domains", () => {
    expect(KIOSK_REFRESH_MS).toBe(60_000);
    expect(KIOSK_DOMAIN_IDS).toEqual([
      "projects",
      "workPackages",
      "activities",
      "availability",
      "infrastructure",
      "support",
    ]);
  });
});
