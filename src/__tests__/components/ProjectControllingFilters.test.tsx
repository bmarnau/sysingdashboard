import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectControllingFilters } from "@/components/project-controlling/ProjectControllingFilters";
import type { ProjectControllingScopeOption } from "@/lib/project-controlling/project-controlling-contract";

const SH = "11111111-1111-4111-8111-111111111111";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";

const scopeOptions: ProjectControllingScopeOption[] = [
  { kind: "systemhouse", label: "Systemhaus Nord", systemhouseId: SH },
  { kind: "customer", label: "Kunde Alpha", systemhouseId: SH, customerId: CUSTOMER },
  {
    kind: "project",
    label: "Projekt Alpha",
    systemhouseId: SH,
    customerId: CUSTOMER,
    projectSourceId: "project-alpha",
  },
  {
    kind: "workPackage",
    label: "Arbeitspaket A",
    systemhouseId: SH,
    customerId: CUSTOMER,
    projectSourceId: "project-alpha",
    workPackageSourceId: "wp-a",
  },
];

describe("BSF-03A ProjectControllingFilters", () => {
  it("aktiviert Arbeitspakete erst im eindeutigen Projektkontext", () => {
    const { rerender } = render(
      <ProjectControllingFilters
        filters={{
          from: "2026-09-01",
          to: "2026-09-05",
          billable: "all",
          systemhouseId: SH,
          customerId: CUSTOMER,
        }}
        scopeOptions={scopeOptions}
      />,
    );

    expect(screen.getByLabelText("Arbeitspaket")).toBeDisabled();

    rerender(
      <ProjectControllingFilters
        filters={{
          from: "2026-09-01",
          to: "2026-09-05",
          billable: "all",
          systemhouseId: SH,
          customerId: CUSTOMER,
          projectSourceId: "project-alpha",
        }}
        scopeOptions={scopeOptions}
      />,
    );

    expect(screen.getByLabelText("Arbeitspaket")).toBeEnabled();
  });
});
