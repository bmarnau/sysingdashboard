import data from "@/data/dashboard.json";

export type TaskStatus = "offen" | "in_arbeit" | "wartend" | "erledigt";
export type Priority = "niedrig" | "mittel" | "hoch" | "kritisch";
export type ProjectStatus = "on_track" | "at_risk" | "delayed" | "abgeschlossen";

export interface Task {
  id: string;
  title: string;
  client: string;
  project: string;
  status: TaskStatus;
  priority: Priority;
  due: string;
  estimated: number;
  spent: number;
  ticket: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  budget: number;
  spent: number;
  progress: number;
  status: ProjectStatus;
  team: string[];
  deadline: string;
}

export interface TimeLog {
  time: string;
  task: string;
  duration: number;
  client: string;
}

export interface WeeklyHour {
  day: string;
  hours: number;
  billable: number;
}

export interface Engineer {
  name: string;
  role: string;
  company: string;
  weeklyTarget: number;
  weeklyLogged: number;
  initials: string;
}

export interface DashboardData {
  engineer: Engineer;
  tasks: Task[];
  projects: Project[];
  weeklyHours: WeeklyHour[];
  recentLogs: TimeLog[];
}

export const dashboardData = data as DashboardData;
export const { engineer, tasks, projects, weeklyHours, recentLogs } = dashboardData;
