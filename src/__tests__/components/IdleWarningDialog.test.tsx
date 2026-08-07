import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IdleWarningDialog } from "@/components/session/IdleWarningDialog";

describe("<IdleWarningDialog>", () => {
  const onStay = vi.fn();
  const onLogout = vi.fn();

  beforeEach(() => {
    onStay.mockReset();
    onLogout.mockReset();
  });

  it("should_renderNothing_when_closed", () => {
    render(
      <IdleWarningDialog open={false} secondsRemaining={30} onStay={onStay} onLogout={onLogout} />,
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("should_showCountdownAndActions", () => {
    render(<IdleWarningDialog open secondsRemaining={45} onStay={onStay} onLogout={onLogout} />);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByTestId("idle-countdown")).toHaveTextContent("45 Sekunden");
    expect(screen.getByRole("button", { name: "Angemeldet bleiben" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jetzt abmelden" })).toBeInTheDocument();
  });

  it("should_focusStaySignedInOnOpen", () => {
    render(<IdleWarningDialog open secondsRemaining={20} onStay={onStay} onLogout={onLogout} />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Angemeldet bleiben" }));
  });

  it("should_callStay_when_stayClicked", async () => {
    const user = userEvent.setup();
    render(<IdleWarningDialog open secondsRemaining={20} onStay={onStay} onLogout={onLogout} />);
    await user.click(screen.getByRole("button", { name: "Angemeldet bleiben" }));
    expect(onStay).toHaveBeenCalledTimes(1);
    expect(onLogout).not.toHaveBeenCalled();
  });

  it("should_callLogout_when_logoutClicked", async () => {
    const user = userEvent.setup();
    render(<IdleWarningDialog open secondsRemaining={20} onStay={onStay} onLogout={onLogout} />);
    await user.click(screen.getByRole("button", { name: "Jetzt abmelden" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("should_notCloseOnEscapeOrOverlayClick", async () => {
    const user = userEvent.setup();
    render(<IdleWarningDialog open secondsRemaining={20} onStay={onStay} onLogout={onLogout} />);
    await user.keyboard("{Escape}");
    await user.click(screen.getByTestId("idle-warning-overlay"));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(onStay).not.toHaveBeenCalled();
  });

  it("should_formatMinutesForLongerCountdown", () => {
    render(<IdleWarningDialog open secondsRemaining={95} onStay={onStay} onLogout={onLogout} />);
    expect(screen.getByTestId("idle-countdown")).toHaveTextContent("1:35 Minuten");
  });
});
