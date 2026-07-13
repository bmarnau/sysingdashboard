import type { WorkPackage } from "@/lib/dashboard-data";

export function makeWorkPackage(overrides: Partial<WorkPackage> = {}): WorkPackage {
  return {
    id: overrides.id ?? "wp-test-1",
    projectId: overrides.projectId ?? "prj-test-1",
    name: overrides.name ?? "AP Test",
    ...overrides,
  } as WorkPackage;
}

export const testWorkPackages: WorkPackage[] = [
  makeWorkPackage({ id: "wp-test-1" }),
  makeWorkPackage({ id: "wp-test-2", name: "AP Zwei" }),
];
