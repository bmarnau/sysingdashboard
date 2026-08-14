/**
 * AvkkService — Fachlogik des AVKK-Führungsmodells.
 *
 * Wichtige Architekturgrenze (ADR-0025): Aufgabenobjekte liegen lokal, es gibt
 * **keine** Datenbank-FK auf sie. Die Existenzprüfung ist daher eine
 * Anwendungsregel (`registerSubjectResolver`) und ausdrücklich keine
 * Integritätsgarantie der Datenbank.
 *
 * Katalogwerte kommen ausschließlich aus dem Reference-Data-Dienst; Schlüssel
 * und Label werden beim Schreiben als Momentaufnahme mitgespeichert.
 */

import { AvkkError } from "@/lib/errors";
import { isOnline } from "@/lib/online-status";
import { CATALOG_KEYS, requireValue } from "@/lib/reference-data";
import { evaluateRisk } from "./indicators";
import * as repository from "./repository";
import { SUBJECT_TYPES } from "./types";
import type { AvkkDossier, AvkkSubject, AvkkSubjectType, RiskThreshold } from "./types";

export interface SubjectResolver {
  /** Liefert den Titel des lokalen Objekts oder null, wenn es nicht existiert. */
  (subjectType: AvkkSubjectType, subjectId: string): string | null;
}

let resolver: SubjectResolver | null = null;

/** Wird beim App-Start mit dem lokalen Bestand verdrahtet (Sprint 08). */
export function registerSubjectResolver(fn: SubjectResolver | null): void {
  resolver = fn;
}

function assertOnline(): void {
  if (!isOnline()) {
    throw new AvkkError(
      "AVKK_OFFLINE_READONLY",
      "AVKK-Daten können ohne Verbindung nicht gespeichert werden. Es wurde nichts gespeichert.",
    );
  }
}

function assertSubjectType(subjectType: string): asserts subjectType is AvkkSubjectType {
  if (!(SUBJECT_TYPES as readonly string[]).includes(subjectType)) {
    throw new AvkkError("AVKK_SUBJECT_TYPE_INVALID", `Unbekannter Aufgabentyp: ${subjectType}`, {
      context: { subjectType },
    });
  }
}

export async function createSubject(input: {
  subjectType: string;
  subjectId: string;
  title?: string;
  actorId: string;
}): Promise<AvkkSubject> {
  assertOnline();
  assertSubjectType(input.subjectType);
  if (!input.subjectId.trim()) {
    throw new AvkkError("AVKK_SUBJECT_ID_REQUIRED", "Objektkennung fehlt.");
  }

  const resolved = resolver?.(input.subjectType, input.subjectId) ?? null;
  if (resolver && resolved === null) {
    throw new AvkkError(
      "AVKK_SUBJECT_NOT_FOUND",
      "Das referenzierte Objekt existiert im lokalen Bestand nicht.",
      { context: { subjectType: input.subjectType, subjectId: input.subjectId } },
    );
  }

  return repository.subjects.create({
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    title: input.title ?? resolved ?? "",
    actorId: input.actorId,
  });
}

export function listSubjects(): Promise<AvkkSubject[]> {
  return repository.subjects.list();
}

export async function assignResponsibility(input: {
  subjectRef: string;
  personId: string;
  roleKey: string;
  typeKeys: string[];
  note?: string;
  actorId: string;
}): Promise<void> {
  assertOnline();
  const role = await requireValue(CATALOG_KEYS.responsibilityRole, input.roleKey);
  const types = await Promise.all(
    input.typeKeys.map((k) => requireValue(CATALOG_KEYS.responsibilityType, k)),
  );

  const responsibilityId = await repository.responsibilities.create({
    subjectRef: input.subjectRef,
    personId: input.personId,
    roleValueId: role.id,
    roleKey: role.key,
    roleLabel: role.label,
    note: input.note ?? "",
    actorId: input.actorId,
  });

  await repository.responsibilities.addTypes(
    responsibilityId,
    types.map((t) => ({ valueId: t.id, key: t.key, label: t.label })),
    input.actorId,
  );
}

export async function rateCompetence(input: {
  subjectRef: string;
  dimensionKey: string;
  ratingKey: string;
  supportNeeded?: boolean;
  note?: string;
  actorId: string;
}): Promise<void> {
  assertOnline();
  const dimension = await requireValue(CATALOG_KEYS.competenceDimension, input.dimensionKey);
  const rating = await requireValue(CATALOG_KEYS.competenceRating, input.ratingKey);

  // Bewertungen werden nicht überschrieben, sondern fortgeschrieben.
  await repository.competences.supersede(input.subjectRef, dimension.key, input.actorId);
  await repository.competences.create({
    subjectRef: input.subjectRef,
    dimensionValueId: dimension.id,
    dimensionKey: dimension.key,
    dimensionLabel: dimension.label,
    ratingValueId: rating.id,
    ratingKey: rating.key,
    ratingLabel: rating.label,
    supportNeeded: input.supportNeeded ?? false,
    note: input.note ?? "",
    actorId: input.actorId,
  });
}

export async function addConsequence(input: {
  subjectRef: string;
  areaKey: string;
  severityKey: string;
  scheduleImpactKey: string;
  description?: string;
  actorId: string;
}): Promise<void> {
  assertOnline();
  const [area, severity, impact] = await Promise.all([
    requireValue(CATALOG_KEYS.consequenceArea, input.areaKey),
    requireValue(CATALOG_KEYS.consequenceSeverity, input.severityKey),
    requireValue(CATALOG_KEYS.scheduleImpact, input.scheduleImpactKey),
  ]);

  await repository.consequences.create({
    subjectRef: input.subjectRef,
    areaValueId: area.id,
    areaKey: area.key,
    areaLabel: area.label,
    severityValueId: severity.id,
    severityKey: severity.key,
    severityLabel: severity.label,
    scheduleImpactValueId: impact.id,
    scheduleImpactKey: impact.key,
    scheduleImpactLabel: impact.label,
    description: input.description ?? "",
    actorId: input.actorId,
  });
}

export async function getDossier(
  subjectType: string,
  subjectId: string,
  threshold?: RiskThreshold,
): Promise<AvkkDossier | null> {
  assertSubjectType(subjectType);
  const subject = await repository.subjects.find(subjectType, subjectId);
  if (!subject) return null;

  const aggregate = await repository.loadAggregate(subject);
  const limits = threshold ?? (await repository.settings.riskThreshold());
  const risk = evaluateRisk(aggregate.responsibilities, aggregate.competences, limits);

  return { ...aggregate, atRisk: risk.atRisk, riskReasons: risk.reasons };
}

/**
 * Integritätsprüfung für die bewusst fehlende FK-Integrität: meldet
 * AVKK-Datensätze, deren Aufgabenobjekt lokal nicht (mehr) existiert.
 */
export async function findOrphanSubjects(existing: ReadonlySet<string>): Promise<AvkkSubject[]> {
  const all = await repository.subjects.list();
  return all.filter((s) => !existing.has(`${s.subjectType}:${s.subjectId}`));
}

/**
 * Lädt alle sichtbaren Dossiers in einem Durchgang. Der Schwellwert wird
 * einmalig geladen (statt je Subjekt) — für Arbeitsplatz und Führungssicht.
 * RLS bleibt maßgeblich: es kommen ausschließlich Datensätze zurück, die der
 * angemeldete Benutzer lesen darf.
 */
export async function listDossiers(threshold?: RiskThreshold): Promise<AvkkDossier[]> {
  const all = await repository.subjects.list();
  const limits = threshold ?? (await repository.settings.riskThreshold());
  return Promise.all(
    all.map(async (subject) => {
      const aggregate = await repository.loadAggregate(subject);
      const risk = evaluateRisk(aggregate.responsibilities, aggregate.competences, limits);
      return { ...aggregate, atRisk: risk.atRisk, riskReasons: risk.reasons };
    }),
  );
}

/**
 * Nimmt einen Sachverhalt zurück, ohne zu löschen: laufende Verantwortungen
 * werden beendet, Kompetenzen und Konsequenzen stillgelegt, der Sachverhalt
 * auf `closed` gesetzt. Grundlage der Demodaten-Rücknahme in der Cloud
 * (ADR-0026: Historisierung statt Hard Delete).
 */
export async function retireSubject(subjectRef: string, actorId: string): Promise<void> {
  assertOnline();
  const responsibilities = await repository.responsibilities.list(subjectRef);
  for (const r of responsibilities.filter((x) => x.validTo === null)) {
    await repository.responsibilities.end(r.id, actorId);
  }
  await repository.competences.supersedeAll(subjectRef, actorId);
  await repository.consequences.supersedeAll(subjectRef, actorId);
  await repository.subjects.setStatus(subjectRef, "closed", actorId);
}

/**
 * Beendet eine laufende Verantwortung (`valid_to`), ohne zu löschen. Wird für
 * das Umhängen einer Verantwortung benötigt (ADR-0026: Historisierung).
 */
export async function endResponsibility(responsibilityId: string, actorId: string): Promise<void> {
  assertOnline();
  await repository.responsibilities.end(responsibilityId, actorId);
}

export const AvkkService = {
  registerSubjectResolver,
  createSubject,
  listSubjects,
  listDossiers,
  assignResponsibility,
  endResponsibility,
  rateCompetence,
  addConsequence,
  getDossier,
  findOrphanSubjects,
  retireSubject,
};
