/** Öffentliche API des Systemhaus-Demo-Datensatzes. */

export {
  DEMO_PREFIX,
  DEMO_DATASET_VERSION,
  buildDemoDataset,
  getDemoBaseDate,
  setDemoBaseDate,
  isDemoId,
} from "./dataset";
export type { DemoDataset } from "./dataset";

export { hasDemoData, seedDemoData, removeDemoData } from "./seed";
export type { DemoSeedResult } from "./seed";

export { DEMO_AVKK_VERSION, DEMO_AVKK_EXPECTATIONS, demoAvkkCases } from "./avkk-dataset";
export type { DemoAvkkCase, DemoAvkkCaseId } from "./avkk-dataset";

export {
  DEMO_PERSONAS,
  DEMO_PERSONA_IDS,
  DEMO_SUBJECT_PERSONA,
  getPersona,
  personaOfSubject,
  resolvePersonId,
} from "./personas";
export type { DemoPersona, DemoPersonaId, DemoPersonaAccounts } from "./personas";

export { buildPersonaExpectations, personaExpectation } from "./persona-expectations";
export type { DemoPersonaExpectation } from "./persona-expectations";

export { seedAvkkDemoData, retireAvkkDemoData, listDemoDossiers } from "./avkk-seed";
export type { AvkkSeedResult, AvkkCleanupResult } from "./avkk-seed";
