/**
 * BSF-03D (#103) — Systemhaus-Kontext für systemhausbezogene Stammdaten.
 * Mehrfach-Membership erfordert eine explizite Auswahl; niemals stille
 * Vermischung mehrerer Systemhäuser.
 */
import { describe, expect, it } from "vitest";
import {
  activeMemberships,
  resolveSystemhouseSelection,
  type SystemhouseMembership,
} from "@/lib/systemhouse/membership";

const m = (id: string, over: Partial<SystemhouseMembership> = {}): SystemhouseMembership => ({
  systemhouseId: id,
  systemhouseName: `SH ${id}`,
  status: "active",
  validFrom: null,
  validTo: null,
  ...over,
});

describe("activeMemberships", () => {
  it("should_filterInactiveAndExpired", () => {
    const now = new Date("2026-09-13T12:00:00Z");
    const list = activeMemberships(
      [
        m("a"),
        m("b", { status: "inactive" }),
        m("c", { validTo: "2026-01-01T00:00:00Z" }),
        m("d", { validFrom: "2027-01-01T00:00:00Z" }),
      ],
      now,
    );
    expect(list.map((x) => x.systemhouseId)).toEqual(["a"]);
  });
});

describe("resolveSystemhouseSelection", () => {
  it("should_returnNone_when_noMembership", () => {
    expect(resolveSystemhouseSelection([], null)).toEqual({ status: "none", systemhouseId: null });
  });
  it("should_autoSelect_when_exactlyOneMembership", () => {
    expect(resolveSystemhouseSelection([m("a")], null)).toEqual({
      status: "selected",
      systemhouseId: "a",
    });
  });
  it("should_requireExplicitChoice_when_multipleMemberships", () => {
    expect(resolveSystemhouseSelection([m("a"), m("b")], null)).toEqual({
      status: "choice-required",
      systemhouseId: null,
    });
  });
  it("should_acceptExplicitChoice_onlyIfMember", () => {
    expect(resolveSystemhouseSelection([m("a"), m("b")], "b")).toEqual({
      status: "selected",
      systemhouseId: "b",
    });
    expect(resolveSystemhouseSelection([m("a"), m("b")], "zzz")).toEqual({
      status: "choice-required",
      systemhouseId: null,
    });
  });
});
