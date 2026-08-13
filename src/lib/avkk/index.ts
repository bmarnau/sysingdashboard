/**
 * Fassade des AVKK-Fachmoduls. UI und Hooks importieren nur von hier.
 */
export { AvkkService } from "./service";
export {
  registerSubjectResolver,
  createSubject,
  listSubjects,
  listDossiers,
  assignResponsibility,
  rateCompetence,
  addConsequence,
  getDossier,
  findOrphanSubjects,
} from "./service";
export { evaluateRisk } from "./indicators";
export {
  AVKK_FILTERS,
  AVKK_FILTER_LABELS,
  buildRows,
  dueState,
  filterRows,
  sortRows,
  summarize,
  taskKey,
  tasksFromLocalData,
} from "./workspace";
export type {
  AvkkDueState,
  AvkkFilter,
  AvkkRow,
  AvkkSort,
  AvkkSummary,
  AvkkTask,
} from "./workspace";
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

export {
  ACTION_CATEGORIES,
  ACTION_LABELS,
  ACTION_RULES,
  CRITICAL_SEVERITY_RANK,
  HIGH_SEVERITY_RANK,
  MANAGEMENT_SNAPSHOT_VERSION,
  PRIORITY_RULE,
  aggregateCompetenceGaps,
  aggregateConsequences,
  aggregateResponsibility,
  buildActionGroups,
  buildManagementSnapshot,
  buildManagementSummary,
  filterManagementRows,
  matchesAction,
  prioritize,
  riskDistribution,
  severityDistribution,
} from "./management";
export type {
  ActionCategory,
  ActionGroup,
  CompetenceGap,
  ConsequenceGroup,
  ManagementFilter,
  ManagementSnapshot,
  ManagementSummary,
  ResponsibilityOverview,
} from "./management";
