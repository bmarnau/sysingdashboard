import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SetPasswordDialog } from "@/components/admin/SetPasswordDialog";

describe("<SetPasswordDialog>", () => {
  it("should_rejectMismatchedConfirmation", async () => {
    const onSubmit = vi.fn();
    render(
      <SetPasswordDialog
        open
        email="petra@example.com"
        onOpenChange={() => {}}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.type(screen.getByLabelText(/Neues Passwort/), "geheim12345");
    await userEvent.type(screen.getByLabelText("Passwort bestätigen"), "geheim99999");
    await userEvent.click(screen.getByRole("button", { name: "Passwort setzen" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent("stimmen nicht überein");
  });

  it("should_enforceMinimumLengthFromAuthPolicy", async () => {
    const onSubmit = vi.fn();
    render(
      <SetPasswordDialog open email="petra@example.com" onOpenChange={() => {}} onSubmit={onSubmit} />,
    );
    await userEvent.type(screen.getByLabelText(/Neues Passwort/), "kurz");
    await userEvent.type(screen.getByLabelText("Passwort bestätigen"), "kurz");
    await userEvent.click(screen.getByRole("button", { name: "Passwort setzen" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent("mindestens 8 Zeichen");
  });

  it("should_submitPasswordAndClearFields", async () => {
    const onSubmit = vi.fn(async () => {});
    render(
      <SetPasswordDialog open email="petra@example.com" onOpenChange={() => {}} onSubmit={onSubmit} />,
    );
    await userEvent.type(screen.getByLabelText(/Neues Passwort/), "geheim12345");
    await userEvent.type(screen.getByLabelText("Passwort bestätigen"), "geheim12345");
    await userEvent.click(screen.getByRole("button", { name: "Passwort setzen" }));
    expect(onSubmit).toHaveBeenCalledWith("geheim12345");
    // Passwort verbleibt nach Abschluss nicht im DOM.
    expect(document.body.innerHTML).not.toContain("geheim12345");
  });
});
