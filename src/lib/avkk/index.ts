/**
 * Fassade des AVKK-Fachmoduls. UI und Hooks importieren nur von hier.
 */
export { AvkkService } from "./service";
export {
  registerSubjectResolver,
  createSubject,
  listSubjects,
  assignResponsibility,
  rateCompetence,
  addConsequence,
  getDossier,
  findOrphanSubjects,
} from "./service";
export { evaluateRisk } from "./indicators";
export { SUBJECT_TYPES, SUBJECT_STATUS, DEFAULT_RISK_THRESHOLD } from "./types";
export type {
  AvkkCompetence,
  AvkkConsequence,
  AvkkDossier,
  AvkkResponsibility,
  AvkkSubject,
  AvkkSubjectStatus,
  AvkkSubjectType,
  RiskThreshold,
} from "./types";
