/**
 * Regressionstest für Sprint 03B – Login Recovery.
 *
 * Reproduziert den `TypeError: Cannot convert object to primitive value`,
 * der auftrat, wenn `location.search` als Objekt (parsed) an den
 * `_authenticated`-Guard geliefert wurde und in ein Template-Literal
 * gegossen wurde. Der Test prüft die reine Hilfsfunktion, ohne den
 * kompletten TanStack-Router-Kontext hochzuziehen.
 */
import { describe, expect, it } from "vitest";
import { __test } from "@/routes/_authenticated/route";

const { buildSafeInternalTarget } = __test;

describe("buildSafeInternalTarget", () => {
  it("verarbeitet parsed search als Objekt ohne zu werfen", () => {
    expect(() =>
      buildSafeInternalTarget({ pathname: "/dashboard", search: { tab: "overview" } }),
    ).not.toThrow();
    expect(
      buildSafeInternalTarget({ pathname: "/dashboard", search: { tab: "overview" } }),
    ).toBe("/dashboard?tab=overview");
  });

  it("akzeptiert String-search konsistent", () => {
    expect(buildSafeInternalTarget({ pathname: "/dashboard", search: "?x=1" })).toBe(
      "/dashboard?x=1",
    );
    expect(buildSafeInternalTarget({ pathname: "/dashboard", search: "x=1" })).toBe(
      "/dashboard?x=1",
    );
  });

  it("fällt bei leerer/ungültiger pathname auf /dashboard zurück", () => {
    expect(buildSafeInternalTarget({ pathname: "", search: "" })).toBe("/dashboard");
    expect(buildSafeInternalTarget({ pathname: undefined, search: undefined })).toBe(
      "/dashboard",
    );
  });

  it("blockiert Protocol-relative Open-Redirect (//evil.example)", () => {
    expect(buildSafeInternalTarget({ pathname: "//evil.example", search: "" })).toBe(
      "/dashboard",
    );
    expect(buildSafeInternalTarget({ pathname: "/\\evil", search: "" })).toBe(
      "/dashboard",
    );
  });

  it("gibt reinen Pfad zurück, wenn search leer ist", () => {
    expect(buildSafeInternalTarget({ pathname: "/dashboard", search: {} })).toBe(
      "/dashboard",
    );
  });

  it("überlebt exotische Werte im search-Objekt", () => {
    expect(() =>
      buildSafeInternalTarget({
        pathname: "/dashboard",
        search: { nested: { a: 1 }, keep: "yes", drop: null, skip: undefined },
      }),
    ).not.toThrow();
  });
});
