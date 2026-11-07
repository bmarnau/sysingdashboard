/**
 * QS-06 (F-QS6-ENG-01, Gate G08): Der Tätigkeitsdialog zeigt Stundensatz und
 * Betrag nur mit `billing.view`. Ohne Recht entfallen beide Felder (nicht 0),
 * und ein vorhandener Stundensatz bleibt beim Speichern erhalten.
 * Ausschließlich synthetische Daten.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ActivityDialog } from "@/components/dashboard/dialogs/ActivityDialog";
import type { Activity } from "@/lib/dashboard-data";
import type { UserRole } from "@/lib/user-management";
import { makeUser } from "../fixtures/users";

const mockUser = vi.hoisted(() => ({ current: null as ReturnType<typeof makeUser> | null }));
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUser.current,
}));

const ALLOW: UserRole[] = ["systemadministrator", "administrator", "teamlead", "projectmanager"];
const DENY: UserRole[] = ["engineer", "viewer", "customer", "kiosk"];

const RATE = 137;

const activity: Activity = {
  id: "A-QS6",
  title: "Synthetische Tätigkeit",
  date: "2026-01-05",
  duration: 2,
  workPackageId: null,
  client: "Kunde Q",
  billable: true,
  billingStatus: "offen",
  hourlyRate: RATE,
};

function renderDialog(role: UserRole, a: Activity = activity) {
  mockUser.current = makeUser(role);
  const onSave = vi.fn();
  render(
    <ActivityDialog
      activity={a}
      workPackages={[]}
      projects={[]}
      onClose={vi.fn()}
      onSave={onSave}
    />,
  );
  return onSave;
}

const save = () => fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
const billableBox = () => screen.getByRole("checkbox", { name: /Abrechenbar/ });

describe("ActivityDialog — QS-06 billing.view", () => {
  it.each(ALLOW)("%s sieht Stundensatz und Betrag", (role) => {
    renderDialog(role);
    expect(screen.getByText("Stundensatz (€)")).toBeInTheDocument();
    expect(screen.getByDisplayValue(String(RATE))).toBeInTheDocument();
    expect(screen.getByText(/Betrag:/)).toBeInTheDocument();
  });

  it.each(DENY)("%s sieht weder Stundensatz noch Betrag", (role) => {
    renderDialog(role);
    expect(screen.queryByText("Stundensatz (€)")).not.toBeInTheDocument();
    expect(screen.queryByText(/Betrag:/)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(String(RATE))).not.toBeInTheDocument();
    // Kein Betrag in Euro-Darstellung (2 h × 137 € = 274 €), auch nicht als 0.
    expect(document.body.textContent ?? "").not.toMatch(/€/);
  });

  it.each(DENY)("%s: Speichern behält den vorhandenen Stundensatz", (role) => {
    const onSave = renderDialog(role);
    save();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ hourlyRate: RATE, billable: true });
  });

  it.each(DENY)("%s: Ab- und Wiederanwählen von „Abrechenbar“ verliert den Satz nicht", (role) => {
    const onSave = renderDialog(role);
    fireEvent.click(billableBox());
    fireEvent.click(billableBox());
    save();
    expect(onSave.mock.calls[0][0]).toMatchObject({ hourlyRate: RATE, billable: true });
  });

  it("engineer: nicht abrechenbar gespeichert ergibt die Invariante 0", () => {
    const onSave = renderDialog("engineer");
    fireEvent.click(billableBox());
    save();
    expect(onSave.mock.calls[0][0]).toMatchObject({
      hourlyRate: 0,
      billable: false,
      billingStatus: "nicht_abrechenbar",
    });
  });

  it("administrator: geänderter Stundensatz wird gespeichert", () => {
    const onSave = renderDialog("administrator");
    fireEvent.change(screen.getByDisplayValue(String(RATE)), { target: { value: "150" } });
    save();
    expect(onSave.mock.calls[0][0]).toMatchObject({ hourlyRate: 150 });
  });
});
