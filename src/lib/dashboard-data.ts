export type TaskStatus = "offen" | "in_arbeit" | "wartend" | "erledigt";
export type Priority = "niedrig" | "mittel" | "hoch" | "kritisch";

export interface Task {
  id: string;
  title: string;
  client: string;
  project: string;
  status: TaskStatus;
  priority: Priority;
  due: string;
  estimated: number; // hours
  spent: number; // hours
  ticket: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  budget: number; // hours
  spent: number; // hours
  progress: number; // %
  status: "on_track" | "at_risk" | "delayed" | "abgeschlossen";
  team: string[];
  deadline: string;
}

export const engineer = {
  name: "Markus Hartmann",
  role: "Senior Systems Engineer",
  company: "NorthBit IT-Systemhaus GmbH",
  weeklyTarget: 40,
  weeklyLogged: 31.5,
  initials: "MH",
};

export const tasks: Task[] = [
  { id: "T-2041", title: "Active Directory Migration zu Entra ID", client: "Brunner Logistik AG", project: "Cloud Identity 2026", status: "in_arbeit", priority: "hoch", due: "2026-05-12", estimated: 24, spent: 18.5, ticket: "INC-88421" },
  { id: "T-2042", title: "Hyper-V Cluster Patchday + Reboot-Plan", client: "Stadtwerke Lindau", project: "Infrastruktur Wartung Q2", status: "offen", priority: "kritisch", due: "2026-05-09", estimated: 6, spent: 0, ticket: "CHG-10233" },
  { id: "T-2043", title: "Veeam Backup Job-Fehler analysieren", client: "Krause Maschinenbau", project: "Backup & DR Refresh", status: "wartend", priority: "mittel", due: "2026-05-14", estimated: 4, spent: 2.25, ticket: "INC-88517" },
  { id: "T-2044", title: "FortiGate 200F Firmware-Upgrade", client: "Brunner Logistik AG", project: "Network Hardening", status: "in_arbeit", priority: "hoch", due: "2026-05-11", estimated: 5, spent: 3, ticket: "CHG-10240" },
  { id: "T-2045", title: "Microsoft 365 Tenant Hardening (CIS L1)", client: "Praxis Dr. Henning", project: "Security Baseline", status: "in_arbeit", priority: "mittel", due: "2026-05-18", estimated: 12, spent: 7.75, ticket: "PRJ-441" },
  { id: "T-2046", title: "VPN Site-to-Site Tunnel zu AWS einrichten", client: "Krause Maschinenbau", project: "Hybrid Cloud Anbindung", status: "offen", priority: "mittel", due: "2026-05-20", estimated: 8, spent: 0, ticket: "PRJ-462" },
  { id: "T-2047", title: "Onboarding Doku Junior Engineer", client: "Intern", project: "Internal Ops", status: "in_arbeit", priority: "niedrig", due: "2026-05-22", estimated: 4, spent: 1.5, ticket: "INT-019" },
  { id: "T-2048", title: "Exchange Hybrid Connector Troubleshooting", client: "Stadtwerke Lindau", project: "Mailflow Stabilisierung", status: "erledigt", priority: "hoch", due: "2026-05-06", estimated: 6, spent: 7.5, ticket: "INC-88376" },
];

export const projects: Project[] = [
  { id: "P-101", name: "Cloud Identity 2026", client: "Brunner Logistik AG", budget: 120, spent: 78.5, progress: 65, status: "on_track", team: ["MH", "AS", "TK"], deadline: "2026-06-30" },
  { id: "P-102", name: "Infrastruktur Wartung Q2", client: "Stadtwerke Lindau", budget: 60, spent: 41, progress: 70, status: "at_risk", team: ["MH", "RB"], deadline: "2026-05-31" },
  { id: "P-103", name: "Backup & DR Refresh", client: "Krause Maschinenbau", budget: 80, spent: 32, progress: 38, status: "on_track", team: ["MH", "AS"], deadline: "2026-07-15" },
  { id: "P-104", name: "Security Baseline", client: "Praxis Dr. Henning", budget: 40, spent: 36, progress: 90, status: "at_risk", team: ["MH"], deadline: "2026-05-25" },
  { id: "P-105", name: "Hybrid Cloud Anbindung", client: "Krause Maschinenbau", budget: 50, spent: 12, progress: 22, status: "on_track", team: ["MH", "TK"], deadline: "2026-08-10" },
  { id: "P-106", name: "Network Hardening", client: "Brunner Logistik AG", budget: 35, spent: 38, progress: 95, status: "delayed", team: ["MH", "RB"], deadline: "2026-05-15" },
];

export const weeklyHours = [
  { day: "Mo", hours: 7.5, billable: 6.5 },
  { day: "Di", hours: 8.25, billable: 7.0 },
  { day: "Mi", hours: 6.0, billable: 5.0 },
  { day: "Do", hours: 9.75, billable: 8.5 },
  { day: "Fr", hours: 0, billable: 0 },
];

export const recentLogs = [
  { time: "08:42", task: "Active Directory Migration zu Entra ID", duration: 2.5, client: "Brunner Logistik AG" },
  { time: "11:15", task: "FortiGate 200F Firmware-Upgrade", duration: 1.25, client: "Brunner Logistik AG" },
  { time: "13:30", task: "M365 Tenant Hardening (CIS L1)", duration: 1.75, client: "Praxis Dr. Henning" },
  { time: "15:10", task: "Veeam Backup Job-Analyse", duration: 0.75, client: "Krause Maschinenbau" },
];
