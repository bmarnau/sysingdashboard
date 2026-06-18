import data from "@/data/dashboard.json";

export type WorkPackageStatus = "offen" | "in_arbeit" | "wartend" | "erledigt";
export type Priority = "niedrig" | "mittel" | "hoch" | "kritisch";
export type ProjectStatus = "on_track" | "at_risk" | "delayed" | "abgeschlossen";
export type BillingStatus = "offen" | "abgerechnet" | "nicht_abrechenbar";

export interface Project {
  id: string;
  name: string;
  client: string;
  /**
   * Brückenfeld für den JSON-Export (Schema v1): synthetische Kunden-ID,
   * abgeleitet aus `client`. Wird ausschließlich vom Import/Export-Layer
   * gesetzt; bestehendes UI ignoriert das Feld.
   */
  customerId?: string;
  description?: string;
  start?: string;
  deadline?: string;
  lead?: string;
  team?: string[];
  budget?: number;
  status: ProjectStatus;
}

export interface WorkPackage {
  id: string;
  title: string;
  projectId?: string | null; // optional: kann ohne Projekt existieren
  client?: string;
  status: WorkPackageStatus;
  priority: Priority;
  due?: string;
  estimated?: number;
  assignee?: string;
  tags?: string[];
  description?: string;
}

export interface Activity {
  id: string;
  title: string;
  workPackageId?: string | null; // optional: kann ohne Arbeitspaket existieren
  /**
   * Brückenfeld für den JSON-Export (Schema v1): Zuordnung zu einem
   * UserProfile. Heute optional und kosmetisch; Single-Engineer-Modus.
   */
  engineerId?: string;
  client?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  duration: number; // Stunden
  hourlyRate: number; // €/h
  billable: boolean;
  billingStatus: BillingStatus;
  description?: string;
}

export interface Engineer {
  name: string;
  role: string;
  company: string;
  weeklyTarget: number;
  initials: string;
  /** Vollzeit-Monatssollstunden (führende Vorgabe, Default 168). */
  monthlyTargetHours?: number;
  /** Arbeitszeitmodell in % (100, 80, 75, 50, ...). Default 100. */
  workloadPercent?: number;
}

export interface DashboardData {
  engineer: Engineer;
  projects: Project[];
  workPackages: WorkPackage[];
  activities: Activity[];
}

export const dashboardData = data as DashboardData;
export const { engineer, projects, workPackages, activities } = dashboardData;
