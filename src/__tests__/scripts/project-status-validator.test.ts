/**
 * Tests des Project-Status-Validators (Sprint 06B, Teil C).
 *
 * Prüft `validateProjectStatus()` aus `scripts/project-status/check.mjs` gegen
 * das echte JSON-Schema. Abgedeckt: gültiges Manifest, ungültige YAML,
 * Schemaverstoß, doppelte IDs, ungültige Sprintreferenz, ungültige Roadmap,
 * fehlende Pflichtfelder und Versionskonflikt CHANGELOG ↔ Manifest.
 * Zusätzlich validiert ein Regressionstest das reale Manifest.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { stringify as toYaml } from "yaml";
// @ts-expect-error — reines ESM-Skript ohne Typdeklaration
import { validateProjectStatus } from "../../../scripts/project-status/check.mjs";

const ROOT = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const schema = JSON.parse(read("docs/project-status.schema.json"));
const realManifest = read("docs/PROJECT-STATUS.yaml");
const realChangelog = read("CHANGELOG.md");

/** Minimal gültiges Manifest — Basis für gezielte Verstöße. */
function baseDoc(): Record<string, unknown> {
  return {
    schemaVersion: "1.3.0",
    lastUpdated: "2026-08-07",
    project: {
      name: "Testprojekt",
      repository: "https://example.invalid/repo",
      sourceOfTruth: "github",
      lifecyclePhase: "mvp-hardening",
      description: "Testmanifest für die Validatorprüfung.",
    },
    vision: { statement: "Testvision.", targetState: ["Ziel A"] },
    architecturePrinciples: [{ id: "p1", rule: "Regel A" }],
    versions: { dashboard: "9.9.9", projectManifestSchema: "1.3.0" },
    currentState: {
      currentSprint: "S1",
      currentSprintTitle: "Sprint 1",
      releaseReadiness: "passed",
      testsPassing: 1,
    },
    roadmap: [
      {
        id: "S2",
        title: "Sprint 2",
        status: "planned",
        priority: "high",
        goal: "Ziel",
        dependencies: ["S1"],
        exitCriteria: ["Kriterium"],
      },
    ],
    completedSprints: [{ id: "S1", title: "Sprint 1", version: "9.9.9", status: "completed" }],
    backlog: [],
    technicalDebt: [],
    quality: { tests: { total: 1 }, gates: {} },
    releaseManagement: { currentRelease: "9.9.9", status: "passed" },
    risks: [],
    artifacts: {},
    validation: { command: "bun run project-status:check", checks: ["schema"] },
    sprintGovernance: { definitionOfDone: ["Tests grün"] },
  };
}

const CHANGELOG_999 = "# Changelog\n\n## 9.9.9 - 2026-08-07\n- Testeintrag.\n";

function run(doc: unknown, changelog = CHANGELOG_999) {
  return validateProjectStatus(toYaml(doc), changelog, schema) as {
    errors: string[];
    warnings: string[];
    doc: unknown;
  };
}

describe("project-status validator", () => {
  it("akzeptiert ein gültiges Manifest ohne Fehler", () => {
    const result = run(baseDoc());
    expect(result.errors).toEqual([]);
  });

  it("meldet ungültige YAML-Syntax", () => {
    const result = validateProjectStatus("foo: [unclosed\n  bar: :", CHANGELOG_999, schema) as {
      errors: string[];
    };
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/YAML/i);
  });

  it("meldet einen Schemaverstoß (falscher Typ)", () => {
    const doc = baseDoc();
    (doc.currentState as Record<string, unknown>).testsPassing = "viele";
    const result = run(doc);
    expect(result.errors.some((e) => e.startsWith("Schema:"))).toBe(true);
  });

  it("meldet unbekannte Felder in Listeneinträgen", () => {
    const doc = baseDoc();
    (doc.roadmap as Record<string, unknown>[])[0].unbekanntesFeld = true;
    const result = run(doc);
    expect(result.errors.some((e) => e.startsWith("Schema:"))).toBe(true);
  });

  it("meldet doppelte IDs", () => {
    const doc = baseDoc();
    (doc.roadmap as Record<string, unknown>[]).push({
      ...(doc.roadmap as Record<string, unknown>[])[0],
    });
    const result = run(doc);
    expect(result.errors.some((e) => /Doppelte ID in roadmap/.test(e))).toBe(true);
  });

  it("meldet einen unbekannten aktuellen Sprint", () => {
    const doc = baseDoc();
    (doc.currentState as Record<string, unknown>).currentSprint = "S99";
    const result = run(doc);
    expect(result.errors.some((e) => /currentSprint "S99"/.test(e))).toBe(true);
  });

  it("meldet eine Roadmap mit unbekannter Abhängigkeit", () => {
    const doc = baseDoc();
    (doc.roadmap as Record<string, unknown>[])[0].dependencies = ["S404"];
    const result = run(doc);
    expect(result.errors.some((e) => /unbekannte Abhängigkeit "S404"/.test(e))).toBe(true);
  });

  it("meldet einen Sprint, der zugleich offen und abgeschlossen ist", () => {
    const doc = baseDoc();
    (doc.completedSprints as Record<string, unknown>[]).push({
      id: "S2",
      title: "Sprint 2",
      version: "9.9.9",
      status: "completed",
    });
    const result = run(doc);
    expect(result.errors.some((e) => /gleichzeitig in roadmap und completedSprints/.test(e))).toBe(
      true,
    );
  });

  it("meldet fehlende Pflichtfelder", () => {
    const doc = baseDoc();
    delete doc.releaseManagement;
    delete doc.sprintGovernance;
    const result = run(doc);
    expect(result.errors.some((e) => /releaseManagement/.test(e))).toBe(true);
    expect(result.errors.some((e) => /sprintGovernance/.test(e))).toBe(true);
  });

  it("meldet einen Versionskonflikt zwischen CHANGELOG und Manifest", () => {
    const result = run(baseDoc(), "# Changelog\n\n## 1.0.0 - 2026-08-07\n- Anderer Stand.\n");
    expect(result.errors.some((e) => /weicht von der obersten CHANGELOG-Version/.test(e))).toBe(
      true,
    );
  });

  it("meldet abweichenden currentRelease", () => {
    const doc = baseDoc();
    (doc.releaseManagement as Record<string, unknown>).currentRelease = "1.2.3";
    const result = run(doc);
    expect(result.errors.some((e) => /currentRelease/.test(e))).toBe(true);
  });

  it("meldet ein fehlendes CHANGELOG-Format", () => {
    const result = run(baseDoc(), "# Changelog ohne Versionseintrag");
    expect(result.errors.some((e) => /CHANGELOG\.md enthält keinen Eintrag/.test(e))).toBe(true);
  });

  it("validiert das reale Projektmanifest fehlerfrei", () => {
    const result = validateProjectStatus(realManifest, realChangelog, schema) as {
      errors: string[];
    };
    expect(result.errors).toEqual([]);
  });
});
