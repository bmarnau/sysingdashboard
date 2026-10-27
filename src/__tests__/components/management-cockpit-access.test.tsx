import { useEffect } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ManagementCockpitAccess } from "@/components/management-cockpit/ManagementCockpitAccess";
import type { UserRole } from "@/lib/user-management";
import { makeUser } from "../fixtures/users";

vi.mock("@/hooks/useCurrentUser", () => ({ useCurrentUser: vi.fn() }));

import { useCurrentUser } from "@/hooks/useCurrentUser";

const useCurrentUserMock = vi.mocked(useCurrentUser);
const readCockpit = vi.fn();

function ReadProbe() {
  useEffect(() => {
    readCockpit();
  }, []);
  return <p>Management-Cockpit geladen</p>;
}

function renderFor(role: UserRole) {
  useCurrentUserMock.mockReturnValue(makeUser(role));
  render(
    <ManagementCockpitAccess>
      <ReadProbe />
    </ManagementCockpitAccess>,
  );
}

beforeEach(() => {
  useCurrentUserMock.mockReset();
  readCockpit.mockReset();
});

afterEach(cleanup);

describe("L2 P3 — Rollen-Gate des Management-Cockpits", () => {
  for (const role of [
    "systemadministrator",
    "administrator",
    "teamlead",
    "projectmanager",
  ] as const) {
    it(`macht das Cockpit für ${role} sichtbar`, () => {
      renderFor(role);
      expect(screen.getByText("Management-Cockpit geladen")).toBeInTheDocument();
      expect(readCockpit).toHaveBeenCalledTimes(1);
    });
  }

  for (const role of ["viewer", "customer", "kiosk", "engineer"] as const) {
    it(`lädt für ${role} weder Ansicht noch Serverdaten`, () => {
      renderFor(role);
      expect(screen.queryByText("Management-Cockpit geladen")).not.toBeInTheDocument();
      expect(readCockpit).not.toHaveBeenCalled();
    });
  }
});
