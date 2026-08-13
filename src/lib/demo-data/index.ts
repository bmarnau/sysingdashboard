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

export { seedAvkkDemoData, retireAvkkDemoData, listDemoDossiers } from "./avkk-seed";
export type { AvkkSeedResult, AvkkCleanupResult } from "./avkk-seed";
