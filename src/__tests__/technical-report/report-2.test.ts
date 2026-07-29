import { describe, expect, it } from "vitest";
import { computeIntegrityHash, extractIntegrityPayload, stableStringify } from "../../scripts/technical-report/canonical.mjs";
import { proposeReleaseStage, applyReleaseOverride, STAGES } from "../../scripts/technical-report/release-gate.mjs";

const baseReport = {
  schemaVersion: "2.0.0",
  identity: { dashboardVersion: "1.43.0", commit: "abc123", environment: { node: "v22", platform: "linux" } },
  sections: { auth: { status: "passed" }, rls: { status: "passed" } },
  findings: [
    { id: "sec:1", severity: "MEDIUM", status: "open", accepted: false, gateRelevant: false, area: "security", category: "security", title: "T1", classification: "confirmed" },
    { id: "td:2", severity: "LOW", status: "open", accepted: true, area: "arch", category: "techdebt", title: "T2", classification: "accepted-debt" },
  ],
  releaseStage: { proposed: "production", reason: "OK" },
  blockers: [],
};

describe("technical-report canonical hash", () => {
  it("liefert deterministisch identischen Hash bei gleichem Inhalt", () => {
    const a = computeIntegrityHash(baseReport);
    const b = computeIntegrityHash({ ...baseReport, generatedAt: "2026-01-01", id: "different" });
    expect(a.value).toBe(b.value);
    expect(a.algo).toBe("sha256");
  });

  it("ändert sich bei relevantem Feldwechsel (Severity)", () => {
    const a = computeIntegrityHash(baseReport);
    const changed = { ...baseReport, findings: [{ ...baseReport.findings[0], severity: "HIGH" }, baseReport.findings[1]] };
    expect(computeIntegrityHash(changed).value).not.toBe(a.value);
  });

  it("sortiert findings stabil (Reihenfolge irrelevant)", () => {
    const reversed = { ...baseReport, findings: [...baseReport.findings].reverse() };
    expect(computeIntegrityHash(reversed).value).toBe(computeIntegrityHash(baseReport).value);
  });

  it("stableStringify sortiert Object-Keys", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("extractIntegrityPayload klammert flüchtige Felder aus", () => {
    const payload = extractIntegrityPayload({ ...baseReport, generatedAt: "x", id: "y", version: 99 });
    expect(payload).not.toHaveProperty("generatedAt");
    expect(payload).not.toHaveProperty("id");
    expect(payload).not.toHaveProperty("version");
  });
});

describe("release-gate", () => {
  it("schlägt production vor bei sauberem Report", () => {
    const p = proposeReleaseStage({ findings: [], sections: { auth: { status: "passed" } }, sources: { backup: { status: "passed" }, docs: { status: "passed" } }, blockers: [] });
    expect(p.proposed).toBe("production");
  });

  it("degradiert auf development bei offenem Critical", () => {
    const p = proposeReleaseStage({ findings: [{ severity: "CRITICAL", accepted: false }], sections: {}, sources: {}, blockers: [] });
    expect(p.proposed).toBe("development");
  });

  it("degradiert auf internal-test bei HIGH", () => {
    const p = proposeReleaseStage({ findings: [{ severity: "HIGH", accepted: false }], sections: { auth: { status: "passed" } }, sources: { security: { status: "passed" } }, blockers: [] });
    expect(p.proposed).toBe("internal-test");
  });

  it("Override überschreibt effective, nicht proposed", () => {
    const proposal = { proposed: "internal-test", reason: "x" };
    const applied = applyReleaseOverride(proposal, { stage: "pilot", by: "admin", reason: "r", ticket: "T-1", at: "2026-01-01" });
    expect(applied.proposed).toBe("internal-test");
    expect(applied.effective).toBe("pilot");
    expect(applied.overridden?.ticket).toBe("T-1");
  });

  it("wirft bei unbekannter Override-Stufe", () => {
    expect(() => applyReleaseOverride({ proposed: "pilot", reason: "" }, { stage: "invalid" })).toThrow();
  });

  it("STAGES enthält alle vier Stufen in Reihenfolge", () => {
    expect(STAGES).toEqual(["development", "internal-test", "pilot", "production"]);
  });
});
