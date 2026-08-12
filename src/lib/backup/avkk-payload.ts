/**
 * AVKK- und Reference-Data-Nutzdaten für Backup, Restore und JSON-Export.
 *
 * Vertrag (Sprint 08B):
 *  - AVKK wird **vollständig gesichert und geprüft**, aber vom Restore
 *    NICHT in die Datenbank zurückgeschrieben (dokumentierte Grenze, ADR-0026).
 *  - Reference Data wird vollständig mitgesichert UND je Katalog versioniert
 *    referenziert, damit Abweichungen beim Restore erkennbar sind.
 *  - Es werden ausschließlich maschinenstabile IDs und Schlüssel geführt;
 *    Labels sind reine Momentaufnahme und nie fachliche Identität.
 *  - Keine Secrets, keine Tokens, keine Zugangsdaten.
 */

import { AvkkService } from "../avkk";
import { SUBJECT_STATUS, SUBJECT_TYPES } from "../avkk/types";
import { ReferenceDataService } from "../reference-data";

export const AVKK_PAYLOAD_VERSION = 1;

export interface AvkkSubjectPayload {
  id: string;
  subjectType: string;
  subjectId: string;
  titleSnapshot: string;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AvkkResponsibilityPayload {
  id: string;
  subjectRef: string;
  personId: string;
  roleKey: string;
  typeKeys: string[];
  note: string;
  validFrom: string;
  validTo: string | null;
}

export interface AvkkCompetencePayload {
  id: string;
  subjectRef: string;
  dimensionKey: string;
  ratingKey: string;
  supportNeeded: boolean;
  note: string;
  supersededAt: string | null;
  createdAt: string;
}

export interface AvkkConsequencePayload {
  id: string;
  subjectRef: string;
  areaKey: string;
  severityKey: string;
  scheduleImpactKey: string;
  description: string;
  supersededAt: string | null;
}

/** Versionierter Katalogbezug — Nachweis, gegen welchen Stand gesichert wurde. */
export interface CatalogRef {
  key: string;
  version: number;
}

export interface AvkkDataset {
  payloadVersion: number;
  capturedAt: string;
  subjects: AvkkSubjectPayload[];
  responsibilities: AvkkResponsibilityPayload[];
  competences: AvkkCompetencePayload[];
  consequences: AvkkConsequencePayload[];
  /** Versionierte Referenz auf die Kataloge, gegen die gesichert wurde. */
  catalogRefs: CatalogRef[];
}

export interface ReferenceDataset {
  payloadVersion: number;
  capturedAt: string;
  catalogs: Array<{
    id: string;
    key: string;
    name: string;
    domain: string;
    version: number;
    isSystem: boolean;
  }>;
  values: Array<{
    id: string;
    catalogKey: string;
    key: string;
    label: string;
    sortOrder: number;
    isActive: boolean;
    isDefault: boolean;
    validFrom: string;
    validTo: string | null;
  }>;
}

export interface AvkkBackupPayload {
  avkk: AvkkDataset;
  referenceData: ReferenceDataset;
}

/* ------------------------------- Sammeln -------------------------------- */

export interface CollectResult {
  payload: AvkkBackupPayload | null;
  warnings: string[];
}

/**
 * Lädt AVKK und Reference Data. Schlägt der Zugriff fehl (offline, keine
 * Berechtigung, kein Backend), bleibt das Backup gültig — das Fehlen wird
 * ausdrücklich als Warnung gemeldet, nie stillschweigend übergangen.
 */
export async function collectAvkkPayload(): Promise<CollectResult> {
  const warnings: string[] = [];
  const capturedAt = new Date().toISOString();

  let reference: ReferenceDataset;
  try {
    const state = await ReferenceDataService.refresh();
    reference = {
      payloadVersion: AVKK_PAYLOAD_VERSION,
      capturedAt,
      catalogs: state.snapshot.catalogs.map((c) => ({
        id: c.id,
        key: c.key,
        name: c.name,
        domain: c.domain,
        version: c.version,
        isSystem: c.isSystem,
      })),
      values: state.snapshot.values.map((v) => ({
        id: v.id,
        catalogKey: v.catalogKey,
        key: v.key,
        label: v.label,
        sortOrder: v.sortOrder,
        isActive: v.isActive,
        isDefault: v.isDefault,
        validFrom: v.validFrom,
        validTo: v.validTo,
      })),
    };
  } catch (err) {
    warnings.push(
      `Reference Data konnte nicht gesichert werden: ${(err as Error)?.message ?? "unbekannt"}`,
    );
    return { payload: null, warnings };
  }

  try {
    const subjects = await AvkkService.listSubjects();
    const dataset: AvkkDataset = {
      payloadVersion: AVKK_PAYLOAD_VERSION,
      capturedAt,
      subjects: [],
      responsibilities: [],
      competences: [],
      consequences: [],
      catalogRefs: reference.catalogs.map((c) => ({ key: c.key, version: c.version })),
    };

    for (const s of subjects) {
      const dossier = await AvkkService.getDossier(s.subjectType, s.subjectId);
      if (!dossier) continue;
      dataset.subjects.push({
        id: s.id,
        subjectType: s.subjectType,
        subjectId: s.subjectId,
        titleSnapshot: s.subjectTitleSnapshot,
        status: s.status,
        version: s.version,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      });
      for (const r of dossier.responsibilities) {
        dataset.responsibilities.push({
          id: r.id,
          subjectRef: s.id,
          personId: r.personId,
          roleKey: r.roleKey,
          typeKeys: r.types.map((t) => t.key),
          note: r.note,
          validFrom: r.validFrom,
          validTo: r.validTo,
        });
      }
      for (const k of dossier.competences) {
        dataset.competences.push({
          id: k.id,
          subjectRef: s.id,
          dimensionKey: k.dimensionKey,
          ratingKey: k.ratingKey,
          supportNeeded: k.supportNeeded,
          note: k.note,
          supersededAt: k.supersededAt,
          createdAt: k.createdAt,
        });
      }
      for (const c of dossier.consequences) {
        dataset.consequences.push({
          id: c.id,
          subjectRef: s.id,
          areaKey: c.areaKey,
          severityKey: c.severityKey,
          scheduleImpactKey: c.scheduleImpactKey,
          description: c.description,
          supersededAt: c.supersededAt,
        });
      }
    }

    return { payload: { avkk: dataset, referenceData: reference }, warnings };
  } catch (err) {
    warnings.push(
      `AVKK-Daten konnten nicht gesichert werden: ${(err as Error)?.message ?? "unbekannt"}`,
    );
    return { payload: null, warnings };
  }
}

/* -------------------------------- Prüfen -------------------------------- */

export interface AvkkValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** Fachlich verwaiste Datensätze (Aufgabe lokal nicht vorhanden). */
  quarantine: Array<{ subjectRef: string; reason: string }>;
  counts: {
    subjects: number;
    responsibilities: number;
    competences: number;
    consequences: number;
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function requireString(
  row: Record<string, unknown>,
  field: string,
  where: string,
  errors: string[],
): string {
  const v = row[field];
  if (typeof v !== "string" || v.length === 0) {
    errors.push(`${where}: Pflichtfeld '${field}' fehlt oder hat den falschen Datentyp.`);
    return "";
  }
  return v;
}

/**
 * Vollständige Vorabprüfung der AVKK-Nutzdaten. Läuft VOR jedem Schreibvorgang.
 * `knownSubjects` enthält `"<typ>:<id>"` aller lokal vorhandenen Aufgaben;
 * fehlt die Menge, kann die Zuordnung nicht geprüft werden (Warnung).
 */
export function validateAvkkPayload(
  avkkRaw: unknown,
  refRaw: unknown,
  options: { knownSubjects?: ReadonlySet<string> } = {},
): AvkkValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const quarantine: Array<{ subjectRef: string; reason: string }> = [];
  const counts = { subjects: 0, responsibilities: 0, competences: 0, consequences: 0 };

  if (!isRecord(avkkRaw)) {
    return {
      ok: false,
      errors: ["AVKK-Datei enthält kein gültiges Objekt."],
      warnings,
      quarantine,
      counts,
    };
  }
  if (!isRecord(refRaw)) {
    return {
      ok: false,
      errors: ["Reference-Data-Datei enthält kein gültiges Objekt."],
      warnings,
      quarantine,
      counts,
    };
  }

  if (typeof avkkRaw.payloadVersion !== "number") {
    errors.push("AVKK-Datei ohne gültige `payloadVersion`.");
  } else if (avkkRaw.payloadVersion > AVKK_PAYLOAD_VERSION) {
    errors.push(
      `AVKK-Nutzdaten nutzen Version ${avkkRaw.payloadVersion}, unterstützt wird ${AVKK_PAYLOAD_VERSION}.`,
    );
  }

  // Katalogwerte indizieren: "<catalogKey>/<valueKey>"
  const refValues = Array.isArray(refRaw.values) ? (refRaw.values as unknown[]) : null;
  if (!refValues) {
    errors.push("Reference-Data-Datei enthält keine Werteliste.");
  }
  const valueIndex = new Map<string, Set<string>>();
  for (const v of refValues ?? []) {
    if (!isRecord(v)) continue;
    const catalogKey = typeof v.catalogKey === "string" ? v.catalogKey : "";
    const key = typeof v.key === "string" ? v.key : "";
    if (!catalogKey || !key) continue;
    if (!valueIndex.has(catalogKey)) valueIndex.set(catalogKey, new Set());
    valueIndex.get(catalogKey)!.add(key);
  }

  const catalogVersions = new Map<string, number>();
  for (const c of Array.isArray(refRaw.catalogs) ? (refRaw.catalogs as unknown[]) : []) {
    if (!isRecord(c)) continue;
    if (typeof c.key === "string" && typeof c.version === "number") {
      catalogVersions.set(c.key, c.version);
    }
  }
  for (const r of Array.isArray(avkkRaw.catalogRefs) ? (avkkRaw.catalogRefs as unknown[]) : []) {
    if (!isRecord(r) || typeof r.key !== "string") continue;
    const current = catalogVersions.get(r.key);
    if (current === undefined) {
      errors.push(`Referenzierter Katalog fehlt im Archiv: ${r.key}`);
    } else if (typeof r.version === "number" && current !== r.version) {
      warnings.push(
        `Katalog ${r.key}: gesichert in Version ${r.version}, Archivstand ${current}.`,
      );
    }
  }

  const requireValueRef = (catalogKey: string, valueKey: string, where: string): void => {
    if (!valueKey) return; // Pflichtfeldfehler wurde bereits gemeldet
    if (!valueIndex.get(catalogKey)?.has(valueKey)) {
      errors.push(`${where}: Katalogwert ${catalogKey}/${valueKey} ist im Archiv nicht bekannt.`);
    }
  };

  // Subjekte
  const subjects = Array.isArray(avkkRaw.subjects) ? (avkkRaw.subjects as unknown[]) : null;
  if (!subjects) {
    errors.push("AVKK-Datei enthält keine Subjektliste.");
  }
  const subjectIds = new Set<string>();
  for (const [i, raw] of (subjects ?? []).entries()) {
    const where = `AVKK-Subjekt #${i + 1}`;
    if (!isRecord(raw)) {
      errors.push(`${where}: kein gültiges Objekt.`);
      continue;
    }
    const id = requireString(raw, "id", where, errors);
    const subjectType = requireString(raw, "subjectType", where, errors);
    const subjectId = requireString(raw, "subjectId", where, errors);
    const status = requireString(raw, "status", where, errors);
    if (id) {
      if (subjectIds.has(id)) errors.push(`${where}: doppelte AVKK-ID ${id}.`);
      subjectIds.add(id);
    }
    if (subjectType && !(SUBJECT_TYPES as readonly string[]).includes(subjectType)) {
      errors.push(`${where}: ungültiger Aufgabentyp '${subjectType}'.`);
    }
    if (status && !(SUBJECT_STATUS as readonly string[]).includes(status)) {
      errors.push(`${where}: ungültiger Status '${status}'.`);
    }
    if (options.knownSubjects && subjectType && subjectId) {
      if (!options.knownSubjects.has(`${subjectType}:${subjectId}`)) {
        quarantine.push({
          subjectRef: id || `${subjectType}:${subjectId}`,
          reason: `Referenzierte Aufgabe ${subjectType}:${subjectId} existiert im lokalen Bestand nicht.`,
        });
      }
    }
    counts.subjects++;
  }
  if (!options.knownSubjects && counts.subjects > 0) {
    warnings.push(
      "Aufgabenbezug der AVKK-Daten konnte nicht geprüft werden (kein lokaler Bestand übergeben).",
    );
  }

  const childId = new Set<string>();
  const checkChild = (raw: unknown, where: string): Record<string, unknown> | null => {
    if (!isRecord(raw)) {
      errors.push(`${where}: kein gültiges Objekt.`);
      return null;
    }
    const id = requireString(raw, "id", where, errors);
    if (id) {
      if (childId.has(id)) errors.push(`${where}: doppelte AVKK-ID ${id}.`);
      childId.add(id);
    }
    const ref = requireString(raw, "subjectRef", where, errors);
    if (ref && !subjectIds.has(ref)) {
      errors.push(`${where}: verweist auf unbekanntes AVKK-Subjekt ${ref}.`);
    }
    return raw;
  };

  for (const [i, raw] of (Array.isArray(avkkRaw.responsibilities)
    ? (avkkRaw.responsibilities as unknown[])
    : []
  ).entries()) {
    const where = `AVKK-Verantwortung #${i + 1}`;
    const row = checkChild(raw, where);
    if (!row) continue;
    requireString(row, "personId", where, errors);
    const roleKey = requireString(row, "roleKey", where, errors);
    requireValueRef("avkk.responsibility_role", roleKey, where);
    const types = Array.isArray(row.typeKeys) ? row.typeKeys : [];
    if (!Array.isArray(row.typeKeys)) {
      errors.push(`${where}: 'typeKeys' muss eine Liste sein.`);
    }
    for (const t of types) {
      if (typeof t !== "string") {
        errors.push(`${where}: ungültiger Verantwortungstyp.`);
        continue;
      }
      requireValueRef("avkk.responsibility_type", t, where);
    }
    counts.responsibilities++;
  }

  for (const [i, raw] of (Array.isArray(avkkRaw.competences)
    ? (avkkRaw.competences as unknown[])
    : []
  ).entries()) {
    const where = `AVKK-Kompetenz #${i + 1}`;
    const row = checkChild(raw, where);
    if (!row) continue;
    requireValueRef(
      "avkk.competence_dimension",
      requireString(row, "dimensionKey", where, errors),
      where,
    );
    requireValueRef("avkk.competence_rating", requireString(row, "ratingKey", where, errors), where);
    if (typeof row.supportNeeded !== "boolean") {
      errors.push(`${where}: 'supportNeeded' muss ein Wahrheitswert sein.`);
    }
    counts.competences++;
  }

  for (const [i, raw] of (Array.isArray(avkkRaw.consequences)
    ? (avkkRaw.consequences as unknown[])
    : []
  ).entries()) {
    const where = `AVKK-Konsequenz #${i + 1}`;
    const row = checkChild(raw, where);
    if (!row) continue;
    requireValueRef("avkk.consequence_area", requireString(row, "areaKey", where, errors), where);
    requireValueRef(
      "avkk.consequence_severity",
      requireString(row, "severityKey", where, errors),
      where,
    );
    requireValueRef(
      "avkk.schedule_impact",
      requireString(row, "scheduleImpactKey", where, errors),
      where,
    );
    counts.consequences++;
  }

  return { ok: errors.length === 0, errors, warnings, quarantine, counts };
}
