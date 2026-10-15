import { describe, expect, it } from "vitest";
import { avkkHelpTopics } from "@/lib/help-avkk-topics";
import { DOCUMENTATION_VERSION } from "@/lib/help-documentation";

describe("help documentation release contract", () => {
  it("publishes the BSF-03E P3a/P3b handbook increment", () => {
    expect(DOCUMENTATION_VERSION).toBe("1.24.0");

    const workView = avkkHelpTopics.find((topic) => topic.id === "avkk-arbeitspaket-arbeitssicht");
    expect(workView?.lastUpdated).toBe("2026-10-15");
    expect(workView?.content).toContain("Personensicht");
    expect(workView?.content).toContain("Einzelaktionen");
    expect(workView?.content).toContain("P5");
  });
});
