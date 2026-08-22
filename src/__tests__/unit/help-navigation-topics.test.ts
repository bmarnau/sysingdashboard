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

  it("überschreibt die historische Systemstatus-Hilfe mit dem aktuellen Betriebsmodell", () => {
    const topic = HelpDocumentationService.getTopicById("system-status");

    expect(topic?.lastUpdated).toBe("2026-08-22");
    expect(topic?.content).toContain("https://github.com/bmarnau/sysingdashboard");
    expect(topic?.content).toContain("Supabase");
    expect(topic?.content).toContain("vom Hosting nicht bereitgestellt");
    expect(topic?.content).toContain("nicht geprüft — users.manage erforderlich");
    expect(topic?.content).toContain("allgemeine **/api/status** bleibt ein secret-freier Health-Endpunkt");
  });

  it("überschreibt die historischen AVKK-Texte mit der fachnahen Handbuchfassung", () => {
    const model = HelpDocumentationService.getTopicById("avkk-modell");
    const workspace = HelpDocumentationService.getTopicById("avkk-arbeitsplatz");

    expect(model?.lastUpdated).toBe("2026-08-22");
    expect(model?.content).toContain("Fühle ich mich für diese Aufgabe");
    expect(model?.content).toContain("andere Mitwirkende");
    expect(model?.content).toContain("für den Kunden und für mich selbst");
    expect(model?.content).toContain("kein personenbezogener Kennwert");

    expect(workspace?.content).toContain("Kompetenzen und Ressourcen");
    expect(workspace?.content).toContain("identisch aktive Zuordnung");
    expect(workspace?.content).toContain("kein Instrument zur automatisierten personenbezogenen");
  });
});
