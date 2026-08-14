import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const navigateMock = vi.fn();
const performLogoutMock = vi.fn(async () => true);

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));
vi.mock("@/lib/session/logout-service", () => ({
  performLogout: (opts: { reason: string; navigate?: (t: string) => void }) => {
    opts.navigate?.("/auth");
    return performLogoutMock();
  },
}));

import { LogoutButton } from "@/components/dashboard/header/LogoutButton";

describe("<LogoutButton>", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    performLogoutMock.mockClear();
  });

  it("should_exposeAccessibleNameAndTooltip", () => {
    render(<LogoutButton />);
    const btn = screen.getByRole("button", { name: "Abmelden" });
    expect(btn).toHaveAttribute("title", "Abmelden");
  });

  it("should_useCentralLogoutAndNavigateToAuth_when_clicked", async () => {
    render(<LogoutButton />);
    await userEvent.click(screen.getByRole("button", { name: "Abmelden" }));
    expect(performLogoutMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith({ to: "/auth", replace: true });
  });

  it("should_beKeyboardOperable", async () => {
    render(<LogoutButton />);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Abmelden" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(performLogoutMock).toHaveBeenCalledTimes(1);
  });
});
