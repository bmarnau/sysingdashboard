import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardStore } from "@/lib/store/dashboard-store";
import {
  useActivities,
  useDashboardStore,
  useProjects,
} from "@/lib/store/useDashboardStore";

describe("useDashboardStore bindings", () => {
  beforeEach(() => {
    dashboardStore.__resetForTest();
  });

  it("rendert Consumer neu, wenn der beobachtete Slice sich ändert", () => {
    const renders: number[] = [];
    function Counter() {
      const acts = useActivities();
      renders.push(acts.length);
      return <div data-testid="len">{acts.length}</div>;
    }
    render(<Counter />);
    const initial = renders.length;
    act(() => {
      dashboardStore.setActivities([]);
    });
    expect(renders.length).toBeGreaterThan(initial);
    expect(screen.getByTestId("len").textContent).toBe("0");
  });

  it("rendert NICHT neu, wenn ein anderer Slice sich ändert", () => {
    const spy = vi.fn();
    function ProjectsOnly() {
      const p = useProjects();
      spy();
      return <div>{p.length}</div>;
    }
    render(<ProjectsOnly />);
    const before = spy.mock.calls.length;
    act(() => {
      dashboardStore.setActivities([]); // anderer Slice
    });
    // useSyncExternalStore ruft getSnapshot; da Selektorergebnis referenz-identisch ist,
    // erfolgt kein Re-Render.
    expect(spy.mock.calls.length).toBe(before);
  });

  it("Selektor-Overload: identity liefert kompletten State", () => {
    function Full() {
      const s = useDashboardStore();
      return <div data-testid="full">{s.projects.length}</div>;
    }
    render(<Full />);
    expect(screen.getByTestId("full").textContent).toBe(
      String(dashboardStore.getState().projects.length),
    );
  });
});
