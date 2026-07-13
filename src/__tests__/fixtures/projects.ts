import type { Project } from "@/lib/dashboard-data";
import { testIsoNow } from "../env/test-instance";

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: overrides.id ?? "prj-test-1",
    name: overrides.name ?? "Test-Projekt Alpha",
    color: overrides.color ?? "#3B82F6",
    status: overrides.status ?? "active",
    ...overrides,
  } as Project;
}

export const testProjects: Project[] = [
  makeProject({ id: "prj-test-1", name: "Alpha" }),
  makeProject({ id: "prj-test-2", name: "Beta", color: "#10B981" }),
];

// touch: verhindert unused-Import in Konsumenten, die nur den ISO-Wert brauchen.
export const projectsCreatedAt = testIsoNow();
