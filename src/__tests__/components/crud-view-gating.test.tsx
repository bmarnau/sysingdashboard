import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectsView } from "@/components/dashboard/views/ProjectsView";
import { WorkPackagesView } from "@/components/dashboard/views/WorkPackagesView";
import { ActivitiesView } from "@/components/dashboard/views/ActivitiesView";
import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";
import { canMutate } from "@/lib/rbac/crud-guards";
import { makeUser } from "../fixtures/users";

const project: Project = {
  id: "P-1",
  name: "Testprojekt",
  client: "Kunde",
  status: "on_track",
  deadline: "2026-12-31",
  budget: 100,
  team: [],
  lead: "AM",
  description: "",
};

const wp: WorkPackage = {
  id: "WP-1",
  title: "Testpaket",
  projectId: "P-1",
  client: "Kunde",
  status: "in_arbeit",
  priority: "mittel",
  estimated: 10,
  due: "2026-12-31",
  assignee: "AM",
  tags: [],
};

const activity: Activity = {
  id: "A-1",
  title: "Testtätigkeit",
  date: "2026-08-01",
  duration: 2,
  workPackageId: "WP-1",
  billable: true,
  billingStatus: "offen",
  hourlyRate: 100,
};

function renderAll(canEdit: boolean) {
  const noop = vi.fn();
  render(
    <>
      <ProjectsView
        projects={[project]}
        workPackages={[wp]}
        spentByProject={new Map()}
        periodProjectIds={new Set()}
        periodLabel=""
        onNew={noop}
        onEdit={noop}
        onDelete={noop}
        canEdit={canEdit}
      />
      <WorkPackagesView
        workPackages={[wp]}
        projects={[project]}
        spentByWP={new Map()}
        periodWpIds={new Set()}
        periodLabel=""
        onNew={noop}
        onEdit={noop}
        onDelete={noop}
        canEdit={canEdit}
      />
      <ActivitiesView
        activities={[activity]}
        periodActivities={[activity]}
        periodLabel=""
        workPackages={[wp]}
        projects={[project]}
        onNew={noop}
        onEdit={noop}
        onDelete={noop}
        canEdit={canEdit}
      />
    </>,
  );
}

describe("F-18 UI-Gating der Fachobjektansichten", () => {
  it("should_hideNewEditDelete_when_readOnlyRole", () => {
    // Arrange: viewer/customer besitzen laut Matrix keine *.edit Permission.
    for (const role of ["viewer", "customer"] as const) {
      const user = makeUser(role);
      expect(canMutate(user, "project")).toBe(false);
      expect(canMutate(user, "workpackage")).toBe(false);
      expect(canMutate(user, "activity")).toBe(false);
    }

    // Act
    renderAll(false);

    // Assert
    expect(screen.queryAllByRole("button", { name: /^Neu$/ })).toHaveLength(0);
    expect(screen.queryAllByTitle("Bearbeiten")).toHaveLength(0);
    expect(screen.queryAllByTitle("Löschen")).toHaveLength(0);
    expect(screen.getAllByText("Testprojekt").length).toBeGreaterThan(0);
  });

  it("should_showNewEditDelete_when_permittedRole", () => {
    renderAll(true);
    expect(screen.queryAllByRole("button", { name: /^Neu$/ }).length).toBeGreaterThanOrEqual(3);
    expect(screen.queryAllByTitle("Bearbeiten").length).toBeGreaterThanOrEqual(3);
    expect(screen.queryAllByTitle("Löschen").length).toBeGreaterThanOrEqual(3);
  });
});
