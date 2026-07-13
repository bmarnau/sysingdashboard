import type { WorkPackage } from "@/lib/dashboard-data";

export function makeWorkPackage(overrides: Partial<WorkPackage> = {}): WorkPackage {
  return {
    id: overrides.id ?? "wp-test-1",
    title: overrides.title ?? "AP Test",
    projectId: overrides.projectId ?? "prj-test-1",
    status: overrides.status ?? "offen",
    priority: overrides.priority ?? "mittel",
    ...overrides,
  };
}

export const testWorkPackages: WorkPackage[] = [
  makeWorkPackage({ id: "wp-test-1" }),
  makeWorkPackage({ id: "wp-test-2", title: "AP Zwei" }),
];
