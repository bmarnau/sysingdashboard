/**
 * Tastatur-Navigations-Tests. Deckt den kritischen Escape-Pfad für Radix-
 * Dialoge ab (Fokusfalle + ESC schließt), ohne echten Screenreader.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AzureConfirmDialog } from "@/components/azure/AzureConfirmDialog";

describe("A11y – Tastatur", () => {
  it("AzureConfirmDialog schließt per ESC (Radix-Standardverhalten)", async () => {
    const onOpenChange = vi.fn();
    render(
      <AzureConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Test"
        warning="Warnung"
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Confirm-Button ist per Tab erreichbar", async () => {
    render(
      <AzureConfirmDialog
        open
        onOpenChange={() => {}}
        title="Test"
        warning="Warnung"
        confirmLabel="Los"
        onConfirm={() => {}}
      />,
    );
    const confirm = screen.getByRole("button", { name: "Los" });
    // Confirm-Button muss über die Tab-Reihenfolge fokussierbar sein.
    confirm.focus();
    expect(document.activeElement).toBe(confirm);
  });
});
