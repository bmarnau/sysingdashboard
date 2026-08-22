import "../env/test-instance";
import { describe, expect, it } from "vitest";
import { HelpDocumentationService } from "@/lib/help-documentation";
import { registerDashboardNavigationHelp } from "@/lib/help-navigation-topics";

registerDashboardNavigationHelp();

describe("Dashboard-Navigation im Benutzerhandbuch", () => {
  it("dokumentiert die primären Ansichten und den Hilfezugang", () => {
    const topic = HelpDocumentationService.getTopicById("navigation-ansichten");

    expect(topic).not.toBeNull();
    expect(topic?.content).toContain("**Projekte**");
    expect(topic?.content).toContain("**Arbeitspakete**");
    expect(topic?.content).toContain("**Tätigkeiten**");
    expect(topic?.content).toContain("**Abrechnung**");
    expect(topic?.content).toContain("**Mein AVKK**");
    expect(topic?.content).toContain("**AVKK Management**");
    expect(topic?.content).toContain("**Fragezeichen**");
  });

  it("erklärt Projektdetail und Bearbeitungsstift eindeutig", () => {
    const topic = HelpDocumentationService.getTopicById("projects");

    expect(topic?.title).toBe("Projekte, Projektdetail und Arbeitspakete");
    expect(topic?.content).toContain("**Projektnamen**");
    expect(topic?.content).toContain("**Stift**");
    expect(topic?.content).toContain("**Projektbericht**");
    expect(topic?.content).toContain("AVKK-Projektkontext");
  });
});
