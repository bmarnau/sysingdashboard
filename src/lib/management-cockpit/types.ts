/**
 * L2 / P1 — Vertragstypen des Management-Cockpits (reine Domäne).
 *
 * Keine React-, Supabase- oder Zeitabhängigkeit. Der Stichtag ist Parameter.
 * Siehe docs/L2-COCKPIT-SCHNITT-KONZEPT.md und docs/BSF-07-MANAGEMENT-COCKPIT-DESIGN.md.
 */
import type { ProjectControllingRow } from "@/lib/project-controlling/project-controlling-contract";
import type { WorkPackageWorkViewRow } from "@/lib/avkk/work-package-work-view.types";

/** Datenzustand eines Werts oder einer Quelle (BSF-07 §7). Fehlende Werte sind nie 0. */
export type CockpitDataState =
  | "AVAILABLE"
  | "EMPTY"
  | "PARTIAL"
  | "UNKNOWN"
  | "UNAVAILABLE"
  | "DENIED";

export type CockpitSourceKey = "controlling" | "workPackages" | "avkk";

/** Ergebnis einer Quelle, wie es der Server (P2) nach Autorisierung liefert. */
export type SourceResult<T> =
  | { state: "AVAILABLE" | "EMPTY" | "PARTIAL"; value: T }
  | { state: "UNKNOWN" | "UNAVAILABLE" | "DENIED" };

/** AVKK-Befunde je Kunde, bereits aus `buildManagementSummary` abgeleitet (keine zweite Fachlogik). */
export interface AvkkCustomerSignal {
  systemhouseId: string;
  customerId: string;
  /** Aufgaben mit Schwere hoch oder kritisch (`ManagementSummary.highConsequence`). */
  highOrCritical: number;
}

export type CockpitReasonCode =
  | "WP_OVERDUE"
  | "WP_UNASSIGNED"
  | "AVKK_HIGH_OR_CRITICAL"
  | "CONTROLLING_GAP"
  | "DATA_STALE";

export type DrilldownTarget = "WORK_VIEW" | "AVKK_MANAGEMENT" | "PROJECT_CONTROLLING";

export interface CockpitDrilldown {
  target: DrilldownTarget;
  systemhouseId: string;
  customerId: string;
  projectKey: string | null;
}

export interface CockpitReason {
  code: CockpitReasonCode;
  /** Anzahl betroffener Objekte; `null`, wenn der Wert nicht ermittelbar ist (nie 0 statt unbekannt). */
  count: number | null;
  dataState: CockpitDataState;
  drilldown: CockpitDrilldown;
}

export interface AttentionItem {
  /** `systemhouseId:customerId` bzw. `systemhouseId:customerId:projectKey`. */
  key: string;
  systemhouseId: string;
  customerId: string;
  customerName: string;
  projectKey: string | null;
  projectName: string | null;
  reasons: readonly CockpitReason[];
  /** Schlechtester Zustand der beteiligten Quellen. */
  dataState: CockpitDataState;
}

export interface CockpitCapabilities {
  /** `project.controlling.view` */
  controlling: boolean;
  /** `avkk.management.view` */
  avkkManagement: boolean;
  /** Arbeitssicht (Customer-Portfolio / `avkk.view`) */
  workView: boolean;
}

export interface CockpitInput {
  /** Stichtag `YYYY-MM-DD` (Europe/Berlin), vom Aufrufer gesetzt. */
  asOfDate: string;
  capabilities: CockpitCapabilities;
  /** Autorisierter Kundenkreis als `systemhouseId:customerId` (aus `myCustomerScopeKey`). */
  authorizedCustomers: ReadonlySet<string>;
  controlling: SourceResult<readonly ProjectControllingRow[]>;
  workPackages: SourceResult<readonly WorkPackageWorkViewRow[]>;
  avkk: SourceResult<readonly AvkkCustomerSignal[]>;
  /** Schwelle für `DATA_STALE` in Tagen (Standard 7). */
  staleAfterDays?: number;
}

export interface CockpitCounters {
  /** `null`, wenn der Gesamtzustand nicht AVAILABLE/PARTIAL/EMPTY ist. */
  attentionItems: number | null;
  reasonsByCode: Readonly<Partial<Record<CockpitReasonCode, number>>> | null;
}

export interface CockpitResult {
  asOfDate: string;
  /** Gesamtzustand; DENIED nur, wenn keine Quelle zugänglich ist. */
  dataState: CockpitDataState;
  sources: Readonly<Record<CockpitSourceKey, CockpitDataState>>;
  /** Handlungsbedarf zuerst (L2-09), absteigend nach Zahl der Gründe, dann nach Name. */
  items: readonly AttentionItem[];
  counters: CockpitCounters;
}
