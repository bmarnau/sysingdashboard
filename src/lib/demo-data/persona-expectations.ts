/**
 * Abnahmereferenz je Demo-Persona (Sprint 09C, F-11).
 *
 * Die Werte werden aus dem Datensatz abgeleitet, nicht gepflegt — damit
 * können Checkliste und Datensatz nicht auseinanderlaufen. Terminabhängige
 * Aussagen entstehen über den Stichtag (`setDemoBaseDate`) und stehen
 * bewusst nicht als feste Datumswerte in der Abnahme.
 */

import { buildDemoDataset } from "./dataset";
import { demoAvkkCases } from "./avkk-dataset";
import type { DemoAvkkCaseId } from "./avkk-dataset";
import { DEMO_PERSONAS, personaOfSubject } from "./personas";
import type { DemoPersonaId } from "./personas";

export interface DemoPersonaExpectation {
  personaId: DemoPersonaId;
  displayName: string;
  functionLabel: string;
  /** AVKK-Fälle, für die diese Person verantwortlich ist. */
  caseIds: DemoAvkkCaseId[];
  cases: number;
  atRisk: number;
  criticalConsequences: number;
  missingCompetence: number;
  supportNeeded: number;
  /** Lokaler Bestand: Projekte als Projektleitung, Arbeitspakete als Bearbeitung. */
  projectsLed: number;
  workPackagesAssigned: number;
}

export function buildPersonaExpectations(): DemoPersonaExpectation[] {
  const dataset = buildDemoDataset();

  return DEMO_PERSONAS.map((persona) => {
    const cases = demoAvkkCases.filter((c) => personaOfSubject(c.subjectId) === persona.id);
    return {
      personaId: persona.id,
      displayName: persona.displayName,
      functionLabel: persona.functionLabel,
      caseIds: cases.map((c) => c.caseId),
      cases: cases.length,
      atRisk: cases.filter((c) => c.expectedAtRisk).length,
      criticalConsequences: cases.filter((c) =>
        c.consequences.some((k) => k.severityKey === "critical"),
      ).length,
      missingCompetence: cases.filter((c) => c.competences.some((k) => k.ratingKey === "missing"))
        .length,
      supportNeeded: cases.filter((c) => c.competences.some((k) => k.supportNeeded)).length,
      projectsLed: dataset.projects.filter((p) => p.lead === persona.displayName).length,
      workPackagesAssigned: dataset.workPackages.filter((w) => w.assignee === persona.displayName)
        .length,
    };
  });
}

export function personaExpectation(id: DemoPersonaId): DemoPersonaExpectation {
  const found = buildPersonaExpectations().find((e) => e.personaId === id);
  if (!found) throw new Error(`Keine Abnahmereferenz für Persona ${id}`);
  return found;
}
