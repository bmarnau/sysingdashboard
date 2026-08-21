/**
 * F-18 Restfix — Abrechnung, globale Suche und Dialog-Render-Gates.
 *
 * Nachweis, dass kein UI-Pfad einen Schreibdialog für Rollen ohne die
 * bestehenden `*.edit`-Permissions erreichbar macht.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BillingView } from "@/components/dashboard/views/BillingView";
import { GlobalSearch } from "@/components/dashboard/header/GlobalSearch";
import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";
import { canMutate } from "@/lib/rbac/crud-guards";
import { makeUser } from "../fixtures/users";

const mockUser = vi.hoisted(() => ({ current: null as ReturnType<typeof makeUser> | null }));
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUser.current,
}));

const project: Project = {
  id: "P-1",
  name: "Suchprojekt",
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
  title: "Suchpaket",
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
  title: "Suchtaetigkeit",
  date: "2026-08-01",
  duration: 2,
  workPackageId: "WP-1",
  client: "Kunde",
  billable: true,
  billingStatus: "offen",
  hourlyRate: 100,
};

function renderBilling(canEdit: boolean, onEdit = vi.fn()) {
  render(
    <BillingView
      activities={[activity]}
      workPackages={[wp]}
      projects={[project]}
      buckets={[]}
      chartMax={1}
      viewMode="month"
      onEdit={onEdit}
      canEdit={canEdit}
    />,
  );
  return onEdit;
}

function renderSearch(perms: { p: boolean; w: boolean; a: boolean }) {
  const handlers = {
    setTab: vi.fn(),
    setEditingProject: vi.fn(),
    setEditingWP: vi.fn(),
    setEditingActivity: vi.fn(),
    openManualTopic: vi.fn(),
  };
  render(
    <GlobalSearch
      projects={[project]}
      workPackages={[wp]}
      activities={[activity]}
      setTab={handlers.setTab}
      setEditingProject={handlers.setEditingProject}
      setEditingWP={handlers.setEditingWP}
      setEditingActivity={handlers.setEditingActivity}
      canEditProject={perms.p}
      canEditWP={perms.w}
      canEditActivity={perms.a}
      openManualTopic={handlers.openManualTopic}
    />,
  );
  return handlers;
}

function search(term: string) {
  fireEvent.change(screen.getByLabelText("Globale Suche"), { target: { value: term } });
}

beforeEach(() => {
  mockUser.current = makeUser("viewer");
});

describe("F-18 Restfix — Abrechnungsansicht", () => {
  it("should_hideEditPencil_when_readOnlyRole", () => {
    for (const role of ["viewer", "customer"] as const) {
      expect(canMutate(makeUser(role), "activity")).toBe(false);
    }

    renderBilling(false);

    expect(screen.queryAllByTitle("Bearbeiten")).toHaveLength(0);
    // Abrechnungsdaten bleiben lesbar.
    expect(screen.getAllByText("Suchtaetigkeit").length).toBeGreaterThan(0);
  });

  it("should_showEditPencilAndFireCallback_when_activityEditPermitted", () => {
    const onEdit = renderBilling(true);
    const buttons = screen.getAllByTitle("Bearbeiten");
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]!);
    expect(onEdit).toHaveBeenCalledWith(activity);
  });
});

describe("F-18 Restfix — globale Suche", () => {
  it("should_findObjectsAndNavigateWithoutOpeningEditor_when_readOnlyRole", () => {
    const h = renderSearch({ p: false, w: false, a: false });

    search("Such");

    // Lesende Nutzung bleibt vollständig erhalten.
    expect(screen.getByText("Suchprojekt")).toBeTruthy();
    expect(screen.getByText("Suchpaket")).toBeTruthy();
    expect(screen.getByText("Suchtaetigkeit")).toBeTruthy();

    fireEvent.click(screen.getByText("Suchtaetigkeit"));
    expect(h.setTab).toHaveBeenCalledWith("taetigkeiten");
    expect(h.setEditingActivity).not.toHaveBeenCalled();

    search("Such");
    fireEvent.click(screen.getByText("Suchprojekt"));
    expect(h.setTab).toHaveBeenCalledWith("projekte");
    expect(h.setEditingProject).not.toHaveBeenCalled();

    search("Such");
    fireEvent.click(screen.getByText("Suchpaket"));
    expect(h.setTab).toHaveBeenCalledWith("arbeitspakete");
    expect(h.setEditingWP).not.toHaveBeenCalled();
  });

  it("should_openEditor_when_permittedRole", () => {
    mockUser.current = makeUser("projektmanager");
    const h = renderSearch({ p: true, w: true, a: true });

    search("Such");
    fireEvent.click(screen.getByText("Suchtaetigkeit"));
    expect(h.setEditingActivity).toHaveBeenCalledWith(activity);

    search("Such");
    fireEvent.click(screen.getByText("Suchprojekt"));
    expect(h.setEditingProject).toHaveBeenCalledWith(project);

    search("Such");
    fireEvent.click(screen.getByText("Suchpaket"));
    expect(h.setEditingWP).toHaveBeenCalledWith(wp);
  });

  it("should_keepManualSearch_when_readOnlyRole", () => {
    const h = renderSearch({ p: false, w: false, a: false });
    search("Handbuch");
    const hits = screen.queryAllByText("Handbuch");
    expect(hits.length).toBeGreaterThan(0);
    expect(h.openManualTopic).not.toHaveBeenCalled();
  });
});

describe("F-18 Restfix — zentrale Dialog-Render-Gates", () => {
  // Spiegelt die Render-Bedingung aus dashboard.tsx:
  // `editing<Entity> && canEdit<Entity>`
  const gateOpen = (editing: unknown, canEdit: boolean) => Boolean(editing) && canEdit;

  it("should_notRenderDialogs_when_editingStateSetButPermissionMissing", () => {
    for (const role of ["viewer", "customer"] as const) {
      const user = makeUser(role);
      expect(gateOpen(project, canMutate(user, "project"))).toBe(false);
      expect(gateOpen(wp, canMutate(user, "workpackage"))).toBe(false);
      expect(gateOpen(activity, canMutate(user, "activity"))).toBe(false);
    }
  });

  it("should_renderDialogs_when_editingStateSetAndPermitted", () => {
    const user = makeUser("projektmanager");
    expect(gateOpen(project, canMutate(user, "project"))).toBe(true);
    expect(gateOpen(wp, canMutate(user, "workpackage"))).toBe(true);
    expect(gateOpen(activity, canMutate(user, "activity"))).toBe(true);
  });
});
