import "../env/test-instance";
import { describe, expect, it } from "vitest";
import { HelpDocumentationService } from "@/lib/help-documentation";

describe("Help: Arbeitspaket-Kategorien (BSF-03D)", () => {
  it("stellt ein eigenes Topic bereit", () => {
    const topic = HelpDocumentationService.getTopicById("workpackage-categories");
    expect(topic).not.toBeNull();
    expect(topic?.title).toBe("Arbeitspaket-Kategorien");
    expect(topic?.lastUpdated).toBe("2026-09-13");
  });

  it("erklärt Default, Kategorie vs. Tags, Altbestand und Pflegeberechtigung", () => {
    const content = HelpDocumentationService.getTopicById("workpackage-categories")?.content ?? "";
    expect(content).toContain("keine Kategorie");
    expect(content).toContain("höchstens **eine** Kategorie");
    expect(content).toContain("**Tags**");
    expect(content).toContain("deaktiviert");
    expect(content).toContain("Referenzdaten verwalten");
  });

  it("enthält keine technische RLS-Tiefe", () => {
    const content = HelpDocumentationService.getTopicById("workpackage-categories")?.content ?? "";
    expect(content).not.toMatch(/RLS|Policy|Trigger|systemhouse_id|scope_type/);
  });

  it("ist aus dem Referenzdaten-Topic verlinkt", () => {
    const ref = HelpDocumentationService.getTopicById("reference-data");
    expect(ref?.relatedTopics).toContain("workpackage-categories");
  });
});

describe("Help: Arbeitspaket-Kategorien verwalten (Admin-Dialog)", () => {
  it("dokumentiert den Verwaltungsdialog ohne technische Tiefe", () => {
    const topic = HelpDocumentationService.getTopicById("workpackage-categories-manage");
    expect(topic?.component).toBe("WorkPackageCategoryDialog");
    expect(topic?.content).toContain("Referenzdaten verwalten");
    expect(topic?.content).toContain("Deaktivieren");
    expect(topic?.content).not.toMatch(/RLS|Policy|Trigger/);
  });
});
