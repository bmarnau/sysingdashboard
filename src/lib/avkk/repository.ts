/**
 * Repository-Schicht AVKK: bündelt Adapterzugriffe zu Aggregaten.
 * Kein Supabase-Import hier, keine Fachregeln.
 */

import * as adapter from "./adapter";
import type { AvkkCompetence, AvkkConsequence, AvkkResponsibility, AvkkSubject } from "./types";

export const subjects = {
  create: adapter.insertSubject,
  list: adapter.selectSubjects,
  find: adapter.selectSubject,
};

export const responsibilities = {
  create: adapter.insertResponsibility,
  addTypes: adapter.insertResponsibilityTypes,
  list: adapter.selectResponsibilities,
  end: adapter.endResponsibility,
};

export const competences = {
  supersede: adapter.supersedeCompetence,
  create: adapter.insertCompetence,
  list: adapter.selectCompetences,
};

export const consequences = {
  create: adapter.insertConsequence,
  list: adapter.selectConsequences,
};

export const settings = {
  riskThreshold: adapter.selectRiskThreshold,
};

export async function loadAggregate(subject: AvkkSubject): Promise<{
  subject: AvkkSubject;
  responsibilities: AvkkResponsibility[];
  competences: AvkkCompetence[];
  consequences: AvkkConsequence[];
}> {
  const [r, k, c] = await Promise.all([
    adapter.selectResponsibilities(subject.id),
    adapter.selectCompetences(subject.id),
    adapter.selectConsequences(subject.id),
  ]);
  return { subject, responsibilities: r, competences: k, consequences: c };
}
