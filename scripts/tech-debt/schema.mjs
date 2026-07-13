/**
 * Tech-Debt-Schema (Prompt 2A.2).
 *
 * Bewusst hand-rolled statt Zod: Detektoren laufen unter Node/Bun ohne
 * Vite-Transform; Runtime-Deps klein halten. Alle Enum-Werte sind SoT
 * für Report-Erzeugung und Handbuch.
 */

export const SEVERITIES = ["Critical", "High", "Medium", "Low", "Informational"];
export const LIKELIHOODS = ["Hoch", "Mittel", "Niedrig"];
export const EFFORTS = ["klein", "mittel", "gross"];
export const STATUSES = ["offen", "akzeptiert", "geplant", "behoben", "nicht-zutreffend"];
export const SOURCES = ["automated", "manual"];
export const CATEGORIES = [
  "Architektur",
  "Frontend",
  "Backend",
  "API",
  "Daten",
  "Tests",
  "Dokumentation",
];

/**
 * Priorisierungs-Ranking nach Prompt-Vorgabe. Kleiner = wichtiger.
 * Wird auf Rule-ID bzw. Kategorie gemappt (siehe run.mjs).
 */
export const PRIORITY_TAGS = [
  "security-vuln",
  "data-loss",
  "open-privileged-endpoint",
  "auth-rbac-gap",
  "backup-restore-risk",
  "functional-bug",
  "stability",
  "architecture",
  "performance",
  "documentation",
  "cosmetic",
];

const REQUIRED = [
  "id",
  "title",
  "category",
  "location",
  "description",
  "rootCause",
  "impact",
  "severity",
  "likelihood",
  "recommendation",
  "recommendedOrder",
  "effort",
  "status",
  "firstDetected",
  "lastChecked",
  "version",
  "source",
];

/**
 * Validiert einen Finding-Datensatz und liefert `{ ok, errors }`.
 * Wirft nicht — Aggregator sammelt und meldet.
 */
export function validateFinding(f) {
  const errors = [];
  if (!f || typeof f !== "object") return { ok: false, errors: ["not-an-object"] };
  for (const key of REQUIRED) if (!(key in f)) errors.push(`missing:${key}`);
  if (f.severity && !SEVERITIES.includes(f.severity)) errors.push(`severity:${f.severity}`);
  if (f.likelihood && !LIKELIHOODS.includes(f.likelihood)) errors.push(`likelihood:${f.likelihood}`);
  if (f.effort && !EFFORTS.includes(f.effort)) errors.push(`effort:${f.effort}`);
  if (f.status && !STATUSES.includes(f.status)) errors.push(`status:${f.status}`);
  if (f.source && !SOURCES.includes(f.source)) errors.push(`source:${f.source}`);
  if (f.category && !CATEGORIES.includes(f.category)) errors.push(`category:${f.category}`);
  if (f.recommendedOrder != null && typeof f.recommendedOrder !== "number")
    errors.push("recommendedOrder:not-number");
  return { ok: errors.length === 0, errors };
}

export const SEVERITY_RANK = Object.fromEntries(SEVERITIES.map((s, i) => [s, i]));
