/**
 * A11y-Smoke-Tests mit vitest-axe.
 *
 * Bewusst isoliert pro Komponente (kein `<Dashboard />` als Ganzes),
 * damit gefundene Violations lokalisierbar bleiben und die Testlaufzeit
 * beherrschbar ist. Detaillierte Begründung: siehe `.lovable/plan.md`.
 */
/// <reference types="vitest-axe/extend-expect" />
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";

import { PermissionGate } from "@/components/PermissionGate";
import { AzureConfirmDialog } from "@/components/azure/AzureConfirmDialog";

describe("A11y – Smoke", () => {
  it("PermissionGate mit Fallback: keine Violations", async () => {
    const { container } = render(
      <PermissionGate
        permission="roles.manage"
        fallback={<p>Nicht berechtigt.</p>}
      >
        <p>Inhalt</p>
      </PermissionGate>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("AzureConfirmDialog (offen, mit Token): keine Violations", async () => {
    const { baseElement } = render(
      <AzureConfirmDialog
        open
        onOpenChange={() => {}}
        title="Aktion bestätigen"
        warning="Achtung: unwiderrufliche Aktion."
        requireText="LÖSCHEN"
        confirmLabel="Löschen"
        onConfirm={() => {}}
      />,
    );
    // Radix portal-mountet in document.body → baseElement statt container.
    expect(await axe(baseElement)).toHaveNoViolations();
  });
});
