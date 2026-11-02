import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/_authenticated/managementcockpit";
import { readManagementCockpitFn } from "@/lib/management-cockpit-runtime/management-cockpit.functions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { CockpitResult } from "@/lib/management-cockpit/types";
import { makeUser } from "../fixtures/users";

vi.mock("@/hooks/useCurrentUser", () => ({ useCurrentUser: vi.fn() }));
vi.mock("@/lib/management-cockpit-runtime/management-cockpit.functions", () => ({
  readManagementCockpitFn: vi.fn(),
}));

const read = vi.mocked(readManagementCockpitFn);
const currentUser = vi.mocked(useCurrentUser);
const emptyResult: CockpitResult = {
  asOfDate: "2026-10-27",
  dataState: "EMPTY",
  sources: { controlling: "EMPTY", avkk: "EMPTY", workPackages: "EMPTY" },
  items: [],
  counters: { attentionItems: 0, reasonsByCode: {} },
};

async function mountPage() {
  const root = createRootRoute();
  const page = createRoute({
    getParentRoute: () => root,
    path: "/managementcockpit",
    component: Route.options.component,
  });
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ["/managementcockpit"] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  vi.resetAllMocks();
  currentUser.mockReturnValue(makeUser("projectmanager"));
});
afterEach(cleanup);

describe("L2 P3 — tatsächlicher Server-Leseweg der Route", () => {
  it.each(["viewer", "customer", "kiosk", "engineer"] as const)(
    "ruft für %s die Serverfunktion nicht auf",
    async (role) => {
      currentUser.mockReturnValue(makeUser(role));
      await mountPage();
      expect(screen.getByRole("alert")).toHaveTextContent("Keine Berechtigung");
      expect(read).not.toHaveBeenCalled();
    },
  );

  it("liest ausschließlich mit leerer Anfrage und zeigt das Ergebnis", async () => {
    read.mockResolvedValue(emptyResult);
    await mountPage();
    expect(await screen.findByRole("heading", { name: "Handlungsbedarf" })).toBeInTheDocument();
    expect(read).toHaveBeenCalledExactlyOnceWith({ data: {} });
    expect(
      screen.getByText("Keine Aufmerksamkeitsgründe in den verfügbaren Quellen."),
    ).toBeInTheDocument();
  });

  it("zeigt beim Lesen einen Status und bei Fehlern keine Rohdetails oder Nullwerte", async () => {
    let reject!: (reason: Error) => void;
    read.mockImplementation(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    await mountPage();
    expect(screen.getByRole("status")).toHaveTextContent("wird geladen");
    await act(async () => reject(new Error("sensitive-provider-detail")));
    expect(screen.getByRole("alert")).toHaveTextContent("Nicht verfügbar");
    expect(screen.queryByText(/sensitive-provider-detail/)).not.toBeInTheDocument();
  });

  it("verwirft eine verspätete Antwort nach Entzug der Berechtigung", async () => {
    let finish!: (data: CockpitResult) => void;
    read.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const view = await mountPage();
    currentUser.mockReturnValue(makeUser("viewer"));
    const Page = Route.options.component!;
    view.rerender(<Page />);
    await act(async () => finish(emptyResult));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Handlungsbedarf" })).not.toBeInTheDocument(),
    );
  });
});
