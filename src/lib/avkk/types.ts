/** Domänentypen des AVKK-Fachmodells (Sprint 07B). */

export const SUBJECT_TYPES = ["project", "workpackage", "activity", "measure"] as const;
export type AvkkSubjectType = (typeof SUBJECT_TYPES)[number];

export const SUBJECT_STATUS = ["draft", "active", "closed"] as const;
export type AvkkSubjectStatus = (typeof SUBJECT_STATUS)[number];

export interface AvkkSubject {
  id: string;
  subjectType: AvkkSubjectType;
  subjectId: string;
  subjectTitleSnapshot: string;
  status: AvkkSubjectStatus;
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvkkResponsibility {
  id: string;
  subjectRef: string;
  personId: string;
  roleKey: string;
  roleLabel: string;
  types: { valueId: string; key: string; label: string }[];
  note: string;
  validFrom: string;
  validTo: string | null;
}

export interface AvkkCompetence {
  id: string;
  subjectRef: string;
  dimensionKey: string;
  dimensionLabel: string;
  ratingKey: string;
  ratingLabel: string;
  supportNeeded: boolean;
  note: string;
  supersededAt: string | null;
  createdAt: string;
}

export interface AvkkConsequence {
  id: string;
  subjectRef: string;
  areaKey: string;
  areaLabel: string;
  severityKey: string;
  severityLabel: string;
  scheduleImpactKey: string;
  scheduleImpactLabel: string;
  description: string;
  supersededAt: string | null;
}

export interface AvkkDossier {
  subject: AvkkSubject;
  responsibilities: AvkkResponsibility[];
  competences: AvkkCompetence[];
  consequences: AvkkConsequence[];
  /** Abgeleitet, nicht persistiert. */
  atRisk: boolean;
  riskReasons: string[];
}

/** Schwellwerte des Frühindikators (Quelle: app_settings `avkk.risk_threshold`). */
export interface RiskThreshold {
  missingCount: number;
  partialCount: number;
}

export const DEFAULT_RISK_THRESHOLD: RiskThreshold = { missingCount: 1, partialCount: 2 };
