import { describe, expect, it } from "vitest";
import { narrowestScope, parseScope, scopeIncludes, serializeScope } from "@/lib/rbac/scope";

describe("parseScope / serializeScope", () => {
  it("should_returnEmpty_when_root", () => {
    expect(parseScope("*")).toEqual([]);
    expect(serializeScope([])).toBe("*");
  });

  it("should_roundTripHierarchicalScope", () => {
    const s = "tenant:acme/customer:c-42/project:pj-1";
    expect(serializeScope(parseScope(s))).toBe(s);
  });

  it("should_throw_when_segmentMissingColon", () => {
    expect(() => parseScope("tenant")).toThrow(/Invalid scope segment/);
  });
});

describe("scopeIncludes", () => {
  it("should_returnTrue_when_outerIsRoot", () => {
    expect(scopeIncludes("*", "tenant:acme/customer:c-1")).toBe(true);
  });

  it("should_returnTrue_when_prefixMatches", () => {
    expect(scopeIncludes("tenant:acme", "tenant:acme/customer:c-1")).toBe(true);
  });

  it("should_returnFalse_when_innerShorterThanOuter", () => {
    expect(scopeIncludes("tenant:acme/customer:c-1", "tenant:acme")).toBe(false);
  });

  it("should_matchWildcardIdOnSameLevel", () => {
    expect(scopeIncludes("tenant:acme/customer:*", "tenant:acme/customer:c-9")).toBe(true);
  });

  it("should_returnFalse_when_typeMismatch", () => {
    expect(scopeIncludes("tenant:acme/customer:c-1", "tenant:acme/project:pj-1")).toBe(false);
  });

  it("should_returnFalse_when_idMismatch", () => {
    expect(scopeIncludes("tenant:acme/customer:c-1", "tenant:acme/customer:c-2")).toBe(false);
  });
});

describe("narrowestScope", () => {
  it("should_returnInner_when_outerIncludesInner", () => {
    expect(narrowestScope("tenant:acme", "tenant:acme/customer:c-1")).toBe(
      "tenant:acme/customer:c-1",
    );
  });

  it("should_returnNull_when_disjoint", () => {
    expect(narrowestScope("tenant:acme/customer:c-1", "tenant:acme/customer:c-2")).toBeNull();
  });
});
