import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishToTeamDialog } from "@/components/dashboard/dialogs/PublishToTeamDialog";
import { WorkPackagesView } from "@/components/dashboard/views/WorkPackagesView";
import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";
import type { MyCustomerSummary } from "@/lib/customer-data/my-customers";
import type {
  SharedCustomerProjectionSnapshot,
  SharedProjectionPublishResult,
} from "@/lib/customer-data/shared-projection-runtime";

const SYSTEMHOUSE = "11111111-1111-4111-8111-111111111111";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";
const ME = "33333333-3333-4333-8333-333333333333";

const project: Project = {
  id: "P-1",
  name: "Cloud Identity 2026",
  client: "Brunner Logistik AG",
  status: "on_track",
};
const workPackage: WorkPackage = {
  id: "WP-2041",
  title: "Active Directory Migration zu Entra ID",
  projectId: "P-1",
  client: "Brunner Logistik AG",
  status: "in_arbeit",
  priority: "hoch",
  due: "2026-11-30",
};
const snapshot = {
  projects: [project],
  workPackages: [workPackage],
  activities: [] as Activity[],
};

const writeCustomer: MyCustomerSummary = {
  systemhouseId: SYSTEMHOUSE,
  customerId: CUSTOMER,
  name: "Brunner Logistik AG",
  status: "active",
  responsibilityStatus: "active",
  responsibleSince: "2026-01-01T00:00:00Z",
  accessLevel: "write",
};

const emptyProjection = (
  overrides: Partial<SharedCustomerProjectionSnapshot> = {},
): SharedCustomerProjectionSnapshot => ({
  systemhouseId: SYSTEMHOUSE,
  customerId: CUSTOMER,
  projects: [],
  workPackages: [],
  activities: [],
  ...overrides,
});

const okResult: SharedProjectionPublishResult = {
  upsertedProjects: 1,
  upsertedWorkPackages: 1,
  upsertedActivities: 0,
  withdrawnProjects: 0,
  withdrawnWorkPackages: 0,
  withdrawnActivities: 0,
  skipped: [],
  unresolved: [],
};

function setup(
  overrides: Partial<{
    customers: MyCustomerSummary[];
    projection: SharedCustomerProjectionSnapshot;
    readError: boolean;
    publishError: boolean;
  }> = {},
) {
  const publish = vi.fn(async () => {
    if (overrides.publishError) throw new Error("denied");
    return okResult;
  });
  const readProjection = vi.fn(async () => {
    if (overrides.readError) throw new Error("denied");
    return overrides.projection ?? emptyProjection();
  });
  const listCustomers = vi.fn(async () => overrides.customers ?? [writeCustomer]);
  const onClose = vi.fn();
  render(
    <PublishToTeamDialog
      snapshot={snapshot}
      publisherUserId={ME}
      onClose={onClose}
      listCustomers={listCustomers}
      readProjection={readProjection}
      publish={publish}
    />,
  );
  return { publish, readProjection, listCustomers, onClose };
}

async function chooseCustomer() {
  const select = await screen.findByLabelText("Zielkunde");
  fireEvent.change(select, { target: { value: `${SYSTEMHOUSE}::${CUSTOMER}` } });
}

describe("PublishToTeamDialog", () => {
  beforeEach(() => window.localStorage.clear());

  it("explains the missing prerequisites when no customer has write access", async () => {
    setup({ customers: [{ ...writeCustomer, accessLevel: "read" }] });

    expect(await screen.findByText(/kein Kunde mit Schreibrecht/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jetzt veröffentlichen" })).toBeDisabled();
  });

  it("preselects an exactly matching local customer name, previews and publishes the due date", async () => {
    const { publish } = setup();
    await chooseCustomer();

    expect(
      await screen.findByText(/Wird veröffentlicht: 1 Projekte, 1 Arbeitspakete/),
    ).toBeInTheDocument();
    const publishButton = screen.getByRole("button", { name: "Jetzt veröffentlichen" });
    await waitFor(() => expect(publishButton).toBeEnabled());

    fireEvent.click(publishButton);

    await screen.findByRole("status", { name: "Ergebnis" });
    expect(publish).toHaveBeenCalledTimes(1);
    const payload = (publish.mock.calls[0] as unknown[])[0] as {
      customerId: string;
      snapshotComplete: boolean;
      customerMappings: unknown[];
      workPackages: Array<{ id: string; due?: string }>;
    };
    expect(payload.customerId).toBe(CUSTOMER);
    expect(payload.snapshotComplete).toBe(true);
    expect(payload.customerMappings).toEqual([
      { legacyName: "Brunner Logistik AG", customerId: CUSTOMER },
    ]);
    expect(payload.workPackages[0]).toMatchObject({ id: "WP-2041", due: "2026-11-30" });
    expect(screen.getByText(/Veröffentlicht: 1 Projekte, 1 Arbeitspakete/)).toBeInTheDocument();
  });

  it("does not publish anything while the local customer name is not assigned", async () => {
    setup();
    await chooseCustomer();
    const checkbox = await screen.findByRole("checkbox", { name: "Brunner Logistik AG" });

    fireEvent.click(checkbox);

    expect(screen.getByRole("button", { name: "Jetzt veröffentlichen" })).toBeDisabled();
    expect(screen.getByText(/Nicht diesem Kunden zugeordnet/)).toBeInTheDocument();
  });

  it("requires a confirmation before objects are withdrawn", async () => {
    const withdrawn = {
      sourceId: "WP-OLD",
      publishedBy: ME,
    } as unknown as SharedCustomerProjectionSnapshot["workPackages"][number];
    const { publish } = setup({ projection: emptyProjection({ workPackages: [withdrawn] }) });
    await chooseCustomer();

    expect(
      await screen.findByText(/Voraussichtlich zurückgezogen: 0 Projekte, 1 Arbeitspakete/),
    ).toBeInTheDocument();
    const publishButton = screen.getByRole("button", { name: "Jetzt veröffentlichen" });
    expect(publishButton).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: "Ich bestätige das Zurückziehen." }));
    expect(publishButton).toBeEnabled();
    fireEvent.click(publishButton);

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
  });

  it("locks publishing when the current team state cannot be read", async () => {
    setup({ readError: true });
    await chooseCustomer();

    expect(await screen.findByText(/Teamstand konnte nicht gelesen werden/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jetzt veröffentlichen" })).toBeDisabled();
  });

  it("shows a failure without claiming success", async () => {
    setup({ publishError: true });
    await chooseCustomer();
    const publishButton = await screen.findByRole("button", { name: "Jetzt veröffentlichen" });
    await waitFor(() => expect(publishButton).toBeEnabled());

    fireEvent.click(publishButton);

    expect(await screen.findByText(/Das Veröffentlichen ist fehlgeschlagen/)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Ergebnis" })).not.toBeInTheDocument();
  });
});

describe("WorkPackagesView publish action", () => {
  const props = {
    workPackages: [workPackage],
    projects: [project],
    spentByWP: new Map<string, number>(),
    periodWpIds: new Set<string>(),
    periodLabel: "Oktober",
    onNew: () => undefined,
    onEdit: () => undefined,
    onDelete: () => undefined,
    canEdit: true,
  };

  it("offers the action only when a handler is provided", () => {
    const { rerender } = render(<WorkPackagesView {...props} />);
    expect(
      screen.queryByRole("button", { name: "An Team veröffentlichen" }),
    ).not.toBeInTheDocument();

    const onPublish = vi.fn();
    rerender(<WorkPackagesView {...props} onPublish={onPublish} />);
    fireEvent.click(screen.getByRole("button", { name: "An Team veröffentlichen" }));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });
});
