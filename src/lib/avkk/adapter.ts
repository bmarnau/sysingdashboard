/**
 * Supabase-Adapter für AVKK. Einziger Ort dieser Domäne mit Supabase-Import.
 */

import { supabase } from "@/integrations/supabase/client";
import { AvkkError } from "@/lib/errors";
import type {
  AvkkCompetence,
  AvkkConsequence,
  AvkkResponsibility,
  AvkkSubject,
  AvkkSubjectStatus,
  AvkkSubjectType,
  RiskThreshold,
} from "./types";
import { DEFAULT_RISK_THRESHOLD } from "./types";

function fail(code: string, message: string, cause?: unknown): never {
  throw new AvkkError(code, message, { cause });
}

/* ------------------------------- Subject ------------------------------- */

export async function insertSubject(input: {
  subjectType: AvkkSubjectType;
  subjectId: string;
  title: string;
  status?: AvkkSubjectStatus;
  actorId: string;
}): Promise<AvkkSubject> {
  const { data, error } = await supabase
    .from("avkk_subject")
    .insert({
      subject_type: input.subjectType,
      subject_id: input.subjectId,
      subject_title_snapshot: input.title,
      status: input.status ?? "draft",
      created_by: input.actorId,
      updated_by: input.actorId,
    })
    .select("*")
    .single();
  if (error || !data) fail("AVKK_SUBJECT_INSERT_FAILED", error?.message ?? "unbekannt", error);
  return mapSubject(data);
}

export async function selectSubjects(): Promise<AvkkSubject[]> {
  const { data, error } = await supabase
    .from("avkk_subject")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) fail("AVKK_SUBJECT_FETCH_FAILED", error.message, error);
  return (data ?? []).map(mapSubject);
}

export async function selectSubject(
  subjectType: AvkkSubjectType,
  subjectId: string,
): Promise<AvkkSubject | null> {
  const { data, error } = await supabase
    .from("avkk_subject")
    .select("*")
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (error) fail("AVKK_SUBJECT_FETCH_FAILED", error.message, error);
  return data ? mapSubject(data) : null;
}

interface SubjectRow {
  id: string;
  subject_type: string;
  subject_id: string;
  subject_title_snapshot: string;
  status: string;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapSubject(row: SubjectRow): AvkkSubject {
  return {
    id: row.id,
    subjectType: row.subject_type as AvkkSubjectType,
    subjectId: row.subject_id,
    subjectTitleSnapshot: row.subject_title_snapshot,
    status: row.status as AvkkSubjectStatus,
    version: row.version,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ---------------------------- Verantwortung ---------------------------- */

export async function insertResponsibility(input: {
  subjectRef: string;
  personId: string;
  roleValueId: string;
  roleKey: string;
  roleLabel: string;
  note: string;
  actorId: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("avkk_responsibility")
    .insert({
      avkk_subject_id: input.subjectRef,
      person_id: input.personId,
      role_value_id: input.roleValueId,
      role_key_snapshot: input.roleKey,
      role_label_snapshot: input.roleLabel,
      note: input.note,
      created_by: input.actorId,
      updated_by: input.actorId,
    })
    .select("id")
    .single();
  if (error || !data)
    fail("AVKK_RESPONSIBILITY_INSERT_FAILED", error?.message ?? "unbekannt", error);
  return data.id;
}

export async function insertResponsibilityTypes(
  responsibilityId: string,
  types: { valueId: string; key: string; label: string }[],
  actorId: string,
): Promise<void> {
  if (types.length === 0) return;
  const { error } = await supabase.from("avkk_responsibility_type").insert(
    types.map((t) => ({
      responsibility_id: responsibilityId,
      type_value_id: t.valueId,
      type_key_snapshot: t.key,
      type_label_snapshot: t.label,
      created_by: actorId,
    })),
  );
  if (error) fail("AVKK_RESPONSIBILITY_TYPE_INSERT_FAILED", error.message, error);
}

export async function selectResponsibilities(subjectRef: string): Promise<AvkkResponsibility[]> {
  const { data, error } = await supabase
    .from("avkk_responsibility")
    .select("*, avkk_responsibility_type(*)")
    .eq("avkk_subject_id", subjectRef);
  if (error) fail("AVKK_RESPONSIBILITY_FETCH_FAILED", error.message, error);

  type Row = {
    id: string;
    avkk_subject_id: string;
    person_id: string;
    role_key_snapshot: string;
    role_label_snapshot: string;
    note: string;
    valid_from: string;
    valid_to: string | null;
    avkk_responsibility_type: {
      type_value_id: string;
      type_key_snapshot: string;
      type_label_snapshot: string;
    }[];
  };

  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    subjectRef: r.avkk_subject_id,
    personId: r.person_id,
    roleKey: r.role_key_snapshot,
    roleLabel: r.role_label_snapshot,
    types: (r.avkk_responsibility_type ?? []).map((t) => ({
      valueId: t.type_value_id,
      key: t.type_key_snapshot,
      label: t.type_label_snapshot,
    })),
    note: r.note,
    validFrom: r.valid_from,
    validTo: r.valid_to,
  }));
}

export async function endResponsibility(id: string, actorId: string): Promise<void> {
  const { error } = await supabase
    .from("avkk_responsibility")
    .update({ valid_to: new Date().toISOString(), updated_by: actorId })
    .eq("id", id);
  if (error) fail("AVKK_RESPONSIBILITY_END_FAILED", error.message, error);
}

/* ------------------------------ Kompetenz ------------------------------ */

export async function supersedeCompetence(
  subjectRef: string,
  dimensionKey: string,
  actorId: string,
): Promise<void> {
  const { error } = await supabase
    .from("avkk_competence")
    .update({ superseded_at: new Date().toISOString(), updated_by: actorId })
    .eq("avkk_subject_id", subjectRef)
    .eq("dimension_key_snapshot", dimensionKey)
    .is("superseded_at", null);
  if (error) fail("AVKK_COMPETENCE_SUPERSEDE_FAILED", error.message, error);
}

export async function insertCompetence(input: {
  subjectRef: string;
  dimensionValueId: string;
  dimensionKey: string;
  dimensionLabel: string;
  ratingValueId: string;
  ratingKey: string;
  ratingLabel: string;
  supportNeeded: boolean;
  note: string;
  actorId: string;
}): Promise<void> {
  const { error } = await supabase.from("avkk_competence").insert({
    avkk_subject_id: input.subjectRef,
    dimension_value_id: input.dimensionValueId,
    dimension_key_snapshot: input.dimensionKey,
    dimension_label_snapshot: input.dimensionLabel,
    rating_value_id: input.ratingValueId,
    rating_key_snapshot: input.ratingKey,
    rating_label_snapshot: input.ratingLabel,
    support_needed: input.supportNeeded,
    note: input.note,
    created_by: input.actorId,
    updated_by: input.actorId,
  });
  if (error) fail("AVKK_COMPETENCE_INSERT_FAILED", error.message, error);
}

export async function selectCompetences(subjectRef: string): Promise<AvkkCompetence[]> {
  const { data, error } = await supabase
    .from("avkk_competence")
    .select("*")
    .eq("avkk_subject_id", subjectRef)
    .order("created_at", { ascending: true });
  if (error) fail("AVKK_COMPETENCE_FETCH_FAILED", error.message, error);

  type Row = {
    id: string;
    avkk_subject_id: string;
    dimension_key_snapshot: string;
    dimension_label_snapshot: string;
    rating_key_snapshot: string;
    rating_label_snapshot: string;
    support_needed: boolean;
    note: string;
    superseded_at: string | null;
    created_at: string;
  };

  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    subjectRef: r.avkk_subject_id,
    dimensionKey: r.dimension_key_snapshot,
    dimensionLabel: r.dimension_label_snapshot,
    ratingKey: r.rating_key_snapshot,
    ratingLabel: r.rating_label_snapshot,
    supportNeeded: r.support_needed,
    note: r.note,
    supersededAt: r.superseded_at,
    createdAt: r.created_at,
  }));
}

/* ------------------------------ Konsequenz ----------------------------- */

export async function insertConsequence(input: {
  subjectRef: string;
  areaValueId: string;
  areaKey: string;
  areaLabel: string;
  severityValueId: string;
  severityKey: string;
  severityLabel: string;
  scheduleImpactValueId: string;
  scheduleImpactKey: string;
  scheduleImpactLabel: string;
  description: string;
  actorId: string;
}): Promise<void> {
  const { error } = await supabase.from("avkk_consequence").insert({
    avkk_subject_id: input.subjectRef,
    area_value_id: input.areaValueId,
    area_key_snapshot: input.areaKey,
    area_label_snapshot: input.areaLabel,
    severity_value_id: input.severityValueId,
    severity_key_snapshot: input.severityKey,
    severity_label_snapshot: input.severityLabel,
    schedule_impact_value_id: input.scheduleImpactValueId,
    schedule_impact_key_snapshot: input.scheduleImpactKey,
    schedule_impact_label_snapshot: input.scheduleImpactLabel,
    description: input.description,
    created_by: input.actorId,
    updated_by: input.actorId,
  });
  if (error) fail("AVKK_CONSEQUENCE_INSERT_FAILED", error.message, error);
}

export async function selectConsequences(subjectRef: string): Promise<AvkkConsequence[]> {
  const { data, error } = await supabase
    .from("avkk_consequence")
    .select("*")
    .eq("avkk_subject_id", subjectRef);
  if (error) fail("AVKK_CONSEQUENCE_FETCH_FAILED", error.message, error);

  type Row = {
    id: string;
    avkk_subject_id: string;
    area_key_snapshot: string;
    area_label_snapshot: string;
    severity_key_snapshot: string;
    severity_label_snapshot: string;
    schedule_impact_key_snapshot: string;
    schedule_impact_label_snapshot: string;
    description: string;
    superseded_at: string | null;
  };

  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    subjectRef: r.avkk_subject_id,
    areaKey: r.area_key_snapshot,
    areaLabel: r.area_label_snapshot,
    severityKey: r.severity_key_snapshot,
    severityLabel: r.severity_label_snapshot,
    scheduleImpactKey: r.schedule_impact_key_snapshot,
    scheduleImpactLabel: r.schedule_impact_label_snapshot,
    description: r.description,
    supersededAt: r.superseded_at,
  }));
}

/* ------------------------------ Schwellwert ---------------------------- */

export async function selectRiskThreshold(): Promise<RiskThreshold> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "avkk.risk_threshold")
    .maybeSingle();
  if (error || !data) return DEFAULT_RISK_THRESHOLD;
  const value = data.value as Partial<RiskThreshold> | null;
  return {
    missingCount: Number(value?.missingCount ?? DEFAULT_RISK_THRESHOLD.missingCount),
    partialCount: Number(value?.partialCount ?? DEFAULT_RISK_THRESHOLD.partialCount),
  };
}

/* ---------------------------- Stilllegung ------------------------------ */

/**
 * Setzt den Status eines Sachverhalts (z. B. auf `closed`).
 * Bewusst kein Löschen: Die AVKK-Tabellen kennen keine DELETE-Regel,
 * Historisierung ist die vorgesehene Rücknahme (ADR-0026).
 */
export async function updateSubjectStatus(
  subjectRef: string,
  status: AvkkSubjectStatus,
  actorId: string,
): Promise<void> {
  const { error } = await supabase
    .from("avkk_subject")
    .update({ status, updated_by: actorId })
    .eq("id", subjectRef);
  if (error) fail("AVKK_SUBJECT_STATUS_FAILED", error.message, error);
}

/** Legt alle aktuellen Kompetenzbewertungen eines Sachverhalts still. */
export async function supersedeAllCompetences(subjectRef: string, actorId: string): Promise<void> {
  const { error } = await supabase
    .from("avkk_competence")
    .update({ superseded_at: new Date().toISOString(), updated_by: actorId })
    .eq("avkk_subject_id", subjectRef)
    .is("superseded_at", null);
  if (error) fail("AVKK_COMPETENCE_SUPERSEDE_FAILED", error.message, error);
}

/** Legt alle aktuellen Konsequenzen eines Sachverhalts still. */
export async function supersedeAllConsequences(subjectRef: string, actorId: string): Promise<void> {
  const { error } = await supabase
    .from("avkk_consequence")
    .update({ superseded_at: new Date().toISOString(), updated_by: actorId })
    .eq("avkk_subject_id", subjectRef)
    .is("superseded_at", null);
  if (error) fail("AVKK_CONSEQUENCE_SUPERSEDE_FAILED", error.message, error);
}
