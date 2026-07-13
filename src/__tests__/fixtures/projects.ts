import type { Project, ProjectStatus } from "@/lib/dashboard-data";
import { testIsoNow } from "../env/test-instance";

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: overrides.id ?? "prj-test-1",
    name: overrides.name ?? "Test-Projekt Alpha",
    client: overrides.client ?? "Testkunde AG",
    status: (overrides.status ?? "on_track") as ProjectStatus,
    ...overrides,
  };
}

export const testProjects: Project[] = [
  makeProject({ id: "prj-test-1", name: "Alpha" }),
  makeProject({ id: "prj-test-2", name: "Beta", status: "at_risk" }),
];

export const projectsCreatedAt = testIsoNow();
