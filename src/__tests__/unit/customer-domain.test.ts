import { describe, expect, it } from "vitest";
import {
  assertDomainId,
  customerScope,
  groupLegacyCustomerCandidates,
  normalizeCustomerDisplayName,
} from "@/lib/customer-domain";

describe("customer-domain ids and scopes", () => {
  it("should_trimValidDomainIds", () => {
    expect(assertDomainId("  sh-1  ", "systemhouseId")).toBe("sh-1");
    expect(assertDomainId("  c-1  ", "customerId")).toBe("c-1");
  });

  it("should_rejectEmptyDomainIds", () => {
    expect(() => assertDomainId("   ", "systemhouseId")).toThrow(/must not be empty/);
    expect(() => assertDomainId("", "customerId")).toThrow(/must not be empty/);
  });

  it("should_buildProviderNeutralCustomerScope", () => {
    expect(customerScope("sh-1", "c-42")).toBe("systemhouse:sh-1/customer:c-42");
  });
});

describe("legacy customer candidate inventory", () => {
  it("should_normalizeNamesOnlyForMatching", () => {
    expect(normalizeCustomerDisplayName("  Müller   GmbH ")).toBe("muller gmbh");
  });

  it("should_groupProjectsWithoutGeneratingCustomerIdentity", () => {
    const candidates = groupLegacyCustomerCandidates([
      { id: "p-2", client: "Müller GmbH" },
      { id: "p-1", client: "Muller GmbH" },
      { id: "p-3", client: "Andere AG" },
    ]);

    expect(candidates).toEqual([
      {
        normalizedName: "andere ag",
        displayNames: ["Andere AG"],
        projectIds: ["p-3"],
        ambiguous: false,
      },
      {
        normalizedName: "muller gmbh",
        displayNames: ["Muller GmbH", "Müller GmbH"],
        projectIds: ["p-1", "p-2"],
        ambiguous: true,
      },
    ]);
    expect(candidates.some((candidate) => "customerId" in candidate)).toBe(false);
  });

  it("should_ignoreProjectsWithoutCustomerDisplayName", () => {
    expect(
      groupLegacyCustomerCandidates([
        { id: "p-1" },
        { id: "p-2", client: "" },
        { id: "p-3", client: "   " },
      ]),
    ).toEqual([]);
  });
});
