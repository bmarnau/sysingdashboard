/**
 * BSF-03D (#103) — Kategorien-Verwaltung: nur mit `referencedata.manage`,
 * deaktivieren statt löschen, Systemhaus-Scope explizit.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReferenceValue } from "@/lib/reference-data";

const permState = { perms: new Set<string>() };
vi.mock("@/hooks/usePermission", () => ({
  usePermission: (p: string) => permState.perms.has(p),
  useAnyPermission: (ps: string[]) => ps.some((p) => permState.perms.has(p)),
}));
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ id: "u-1", displayName: "Admin", role: "administrator" }),
}));

const createValue = vi.fn(async (..._args: unknown[]) => {});
const deactivateValue = vi.fn(async (..._args: unknown[]) => {});
const updateValue = vi.fn(async (..._args: unknown[]) => {});
vi.mock("@/lib/reference-data", async (orig) => {
  const actual = await orig<typeof import("@/lib/reference-data")>();
  return {
    ...actual,
    listCatalogs: async () => [
      {
        id: "cat-1",
        key: "workpackage.category",
        name: "Arbeitspaket-Kategorien",
        description: "",
        domain: "project",
        isSystem: false,
        isHierarchical: false,
        version: 1,
        scopeType: "systemhouse",
      },
    ],
    createValue: (...a: unknown[]) => createValue(...a),
    deactivateValue: (...a: unknown[]) => deactivateValue(...a),
    updateValue: (...a: unknown[]) => updateValue(...a),
  };
});

const ctxState: {
  status: string;
  values: ReferenceValue[];
  systemhouses: { id: string; name: string }[];
  selectedSystemhouseId: string | null;
} = {
  status: "ready",
  values: [],
  systemhouses: [{ id: "sh-1", name: "Systemhaus A" }],
  selectedSystemhouseId: "sh-1",
};
vi.mock("@/hooks/useWorkPackageCategories", () => ({
  useWorkPackageCategories: () => ({
    ...ctxState,
    allValues: ctxState.values,
    memberships: [],
    onSelectSystemhouse: () => {},
    reload: () => {},
    error: null,
  }),
}));

import { WorkPackageCategoryDialog } from "@/components/admin/WorkPackageCategoryDialog";

function v(key: string, label: string, isActive = true): ReferenceValue {
  return {
    id: `id-${key}`,
    catalogId: "cat-1",
    catalogKey: "workpackage.category",
    key,
    label,
    description: "",
    sortOrder: 1,
    isActive,
    isDefault: false,
    parentValueId: null,
    attributes: {},
    validFrom: "2026-01-01",
    validTo: null,
    systemhouseId: "sh-1",
  };
}

beforeEach(() => {
  permState.perms = new Set(["referencedata.view", "referencedata.manage"]);
  ctxState.values = [v("netzwerk", "Netzwerk"), v("legacy", "Alt", false)];
  createValue.mockClear();
  deactivateValue.mockClear();
});

describe("WorkPackageCategoryDialog", () => {
  it("should_denyWithoutManagePermission", () => {
    permState.perms = new Set(["referencedata.view"]);
    render(<WorkPackageCategoryDialog open onOpenChange={() => {}} />);
    expect(screen.getByText(/keine Berechtigung/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Anlegen/ })).toBeNull();
  });

  it("should_listValues_andOfferDeactivateInsteadOfDelete", () => {
    render(<WorkPackageCategoryDialog open onOpenChange={() => {}} />);
    expect(screen.getByText("Netzwerk")).toBeInTheDocument();
    expect(screen.getByText("Alt")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Löschen/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Deaktivieren: Netzwerk/ })).toBeInTheDocument();
  });

  it("should_createValueWithSystemhouseScope_andStableKey", async () => {
    render(<WorkPackageCategoryDialog open onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText(/^Schlüssel/), { target: { value: "Cloud Services" } });
    fireEvent.change(screen.getByLabelText(/^Bezeichnung/), { target: { value: "Cloud" } });
    fireEvent.click(screen.getByRole("button", { name: /Anlegen/ }));
    await waitFor(() => expect(createValue).toHaveBeenCalled());
    const payload = createValue.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      catalogId: "cat-1",
      key: "cloud_services",
      label: "Cloud",
      systemhouseId: "sh-1",
    });
  });

  it("should_deactivateById", async () => {
    render(<WorkPackageCategoryDialog open onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Deaktivieren: Netzwerk/ }));
    await waitFor(() => expect(deactivateValue).toHaveBeenCalledWith("id-netzwerk", "u-1"));
  });

  it("should_blockCreate_when_noSystemhouseSelected", () => {
    ctxState.status = "select-systemhouse";
    ctxState.selectedSystemhouseId = null;
    render(<WorkPackageCategoryDialog open onOpenChange={() => {}} />);
    expect((screen.getByRole("button", { name: /Anlegen/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    ctxState.status = "ready";
    ctxState.selectedSystemhouseId = "sh-1";
  });

  it("should_haveNoA11yViolations", async () => {
    const { baseElement } = render(<WorkPackageCategoryDialog open onOpenChange={() => {}} />);
    expect(await axe(baseElement)).toHaveNoViolations();
  });
});
