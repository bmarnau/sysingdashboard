import type { RiskThreshold } from "@/lib/avkk/types";

export type ResponsibilityPersonViewRole = "owner" | "deputy";
export type ResponsibilityPersonViewSubjectType = "project" | "workpackage";

export interface ResponsibilityPersonViewSourceRow {
  responsibilityId: string;
  subjectRef: string;
  personId: string;
  displayName: string;
  role: ResponsibilityPersonViewRole;
  subjectType: ResponsibilityPersonViewSubjectType;
  subjectId: string;
  title: string;
  systemhouseId: string;
  customerId: string;
  customerName: string;
  status: string;
  due: string | null;
  missingCount: number;
  partialCount: number;
  supportNeeded: boolean;
  validFrom: string;
  validTo: string | null;
}

export interface ResponsibilityPersonViewRow {
  responsibilityId: string;
  personId: string;
  displayName: string;
  role: ResponsibilityPersonViewRole;
  subjectType: ResponsibilityPersonViewSubjectType;
  subjectId: string;
  title: string;
  systemhouseId: string;
  customerId: string;
  customerName: string;
  status: string;
  due: string | null;
  atRisk: boolean;
  riskReasons: string[];
  validFrom: string;
  validTo: string | null;
}

export interface ResponsibilityPersonViewRepository {
  listByPerson(personId: string): Promise<readonly ResponsibilityPersonViewSourceRow[]>;
  readRiskThreshold(): Promise<RiskThreshold>;
}
