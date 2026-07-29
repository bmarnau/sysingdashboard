/**
 * Kanonische Serialisierung + Integritäts-Hash für den technischen Prüfbericht 2.0.
 *
 * Der Hash geht ausschließlich über fachlich relevante Felder — Zeitstempel,
 * Report-ID, Historie-Metadaten und UI-Zustände bleiben außen vor, damit
 * zwei inhaltlich identische Läufe denselben Hash liefern.
 *
 * INTEGRITY_FIELDS ist die dokumentierte Whitelist; sie wird im Report selbst
 * unter `integrity.fields` mitgeschrieben, damit spätere Verifikation
 * reproduzierbar bleibt (siehe verify.mjs).
 */
import { createHash } from "node:crypto";

export const INTEGRITY_ALGO = "sha256";

export const INTEGRITY_FIELDS = [
  "schemaVersion",
  "identity.dashboardVersion",
  "identity.commit",
  "identity.buildTag",
  "identity.dbMigrationHead",
  "identity.environment.node",
  "identity.environment.platform",
  "sections",
  "findings[].id",
  "findings[].severity",
  "findings[].status",
  "findings[].accepted",
  "findings[].gateRelevant",
  "findings[].area",
  "findings[].category",
  "findings[].title",
  "findings[].classification",
  "releaseStage.proposed",
  "releaseStage.reason",
  "blockers[].id",
  "blockers[].reason",
];

/** Stable JSON: Objekt-Keys werden alphabetisch sortiert; Arrays behalten die Reihenfolge. */
export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

/**
 * Extrahiert exakt die Felder aus INTEGRITY_FIELDS aus dem Report und
 * liefert das kanonische Objekt für die Hash-Berechnung.
 */
export function extractIntegrityPayload(report) {
  return {
    schemaVersion: report.schemaVersion ?? null,
    identity: {
      dashboardVersion: report.identity?.dashboardVersion ?? null,
      commit: report.identity?.commit ?? null,
      buildTag: report.identity?.buildTag ?? null,
      dbMigrationHead: report.identity?.dbMigrationHead ?? null,
      environment: {
        node: report.identity?.environment?.node ?? null,
        platform: report.identity?.environment?.platform ?? null,
      },
    },
    sections: report.sections ?? {},
    findings: [...(report.findings ?? [])]
      .map((f) => ({
        id: f.id,
        severity: f.severity,
        status: f.status,
        accepted: !!f.accepted,
        gateRelevant: !!f.gateRelevant,
        area: f.area ?? "",
        category: f.category ?? "",
        title: f.title ?? "",
        classification: f.classification ?? "confirmed",
      }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    releaseStage: {
      proposed: report.releaseStage?.proposed ?? null,
      reason: report.releaseStage?.reason ?? null,
    },
    blockers: [...(report.blockers ?? [])]
      .map((b) => ({ id: b.id, reason: b.reason }))
      .sort((a, b) =>
        (a.id + a.reason) < (b.id + b.reason) ? -1 : (a.id + a.reason) > (b.id + b.reason) ? 1 : 0,
      ),
  };
}

export function computeIntegrityHash(report) {
  const payload = extractIntegrityPayload(report);
  const serialized = stableStringify(payload);
  const value = createHash(INTEGRITY_ALGO).update(serialized).digest("hex");
  return { algo: INTEGRITY_ALGO, value, fields: INTEGRITY_FIELDS };
}
