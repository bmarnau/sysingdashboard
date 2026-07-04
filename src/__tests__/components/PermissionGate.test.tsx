import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PermissionGate } from "@/components/PermissionGate";
import { makeUser } from "../fixtures/users";

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: vi.fn(),
}));

import { useCurrentUser } from "@/hooks/useCurrentUser";

const useCurrentUserMock = vi.mocked(useCurrentUser);

beforeEach(() => {
  useCurrentUserMock.mockReset();
});

describe("<PermissionGate>", () => {
  it("should_renderChildren_when_userHasPermission", () => {
    // Arrange
    useCurrentUserMock.mockReturnValue(makeUser("systemadministrator"));

    // Act
    render(
      <PermissionGate permission="azure.database.build">
        <span>secret</span>
      </PermissionGate>,
    );

    // Assert
    expect(screen.getByText("secret")).toBeInTheDocument();
  });

  it("should_renderFallback_when_userLacksPermission", () => {
    useCurrentUserMock.mockReturnValue(makeUser("viewer"));
    render(
      <PermissionGate permission="azure.database.build" fallback={<span>denied</span>}>
        <span>secret</span>
      </PermissionGate>,
    );
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(screen.getByText("denied")).toBeInTheDocument();
  });

  it("should_grantAccess_when_anyPermissionMatchesInArray", () => {
    useCurrentUserMock.mockReturnValue(makeUser("engineer"));
    render(
      <PermissionGate permission={["users.manage", "activity.edit"]}>
        <span>ok</span>
      </PermissionGate>,
    );
    expect(screen.getByText("ok")).toBeInTheDocument();
  });

  it("should_renderNothing_when_noUser", () => {
    useCurrentUserMock.mockReturnValue(null);
    const { container } = render(
      <PermissionGate permission="dashboard.view">
        <span>x</span>
      </PermissionGate>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
