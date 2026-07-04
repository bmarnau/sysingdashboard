import type { Activity, Project, WorkPackage, Engineer } from "@/lib/dashboard-data";

/**
 * Deterministische Factories – kein Zufall, damit Tests reproduzierbar sind
 * und Feiertags-/Datumsberechnungen stabil bleiben.
 */

let seq = 0;
function nextId(prefix: string) {
  seq += 1;
  return `${prefix}-${seq.toString().padStart(4, "0")}`;
}

export function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: overrides.id ?? nextId("act"),
    title: overrides.title ?? "Tätigkeit",
    workPackageId: overrides.workPackageId ?? null,
    engineerId: overrides.engineerId,
    client: overrides.client,
    date: overrides.date ?? "2025-03-03",
    time: overrides.time,
    duration: overrides.duration ?? 8,
    hourlyRate: overrides.hourlyRate ?? 100,
    billable: overrides.billable ?? true,
    billingStatus: overrides.billingStatus ?? "offen",
    description: overrides.description,
  };
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: overrides.id ?? nextId("prj"),
    name: overrides.name ?? "Projekt",
    client: overrides.client ?? "Kunde A",
    description: overrides.description,
    start: overrides.start,
    deadline: overrides.deadline,
    lead: overrides.lead,
    team: overrides.team,
    budget: overrides.budget,
    status: overrides.status ?? "on_track",
    customerId: overrides.customerId,
  };
}

export function makeWorkPackage(overrides: Partial<WorkPackage> = {}): WorkPackage {
  return {
    id: overrides.id ?? nextId("wp"),
    title: overrides.title ?? "Arbeitspaket",
    projectId: overrides.projectId ?? null,
    client: overrides.client,
    status: overrides.status ?? "offen",
    priority: overrides.priority ?? "mittel",
    due: overrides.due,
    estimated: overrides.estimated,
    assignee: overrides.assignee,
    tags: overrides.tags,
    description: overrides.description,
  };
}

export function makeEngineer(overrides: Partial<Engineer> = {}): Engineer {
  return {
    name: overrides.name ?? "Test User",
    role: overrides.role ?? "Systemingenieur",
    company: overrides.company ?? "Testfirma",
    weeklyTarget: overrides.weeklyTarget ?? 40,
    initials: overrides.initials ?? "TU",
    monthlyTargetHours: overrides.monthlyTargetHours,
    workloadPercent: overrides.workloadPercent,
  };
}
