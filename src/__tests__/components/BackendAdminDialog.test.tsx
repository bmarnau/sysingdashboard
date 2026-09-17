import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const resetMock = vi.fn(async (_args: { data: { userId: string } }) => ({
  ok: true as const,
  email: "demo@example.com",
}));
const createKioskMock = vi.fn(
  async (_args: { data: { email: string; password: string; displayName: string } }) => ({
    ok: true as const,
    userId: "22222222-2222-2222-2222-222222222222",
  }),
);
const listMock = vi.fn(async () => [
  {
    id: "11111111-1111-1111-1111-111111111111",
    email: "demo@example.com",
    confirmed: false,
    createdAt: "2026-08-01T10:00:00.000Z",
    lastSignInAt: null,
    hasProfile: true,
    role: "viewer",
  },
]);

vi.mock("@/lib/admin/auth-accounts.functions", () => ({
  listAuthAccounts: () => listMock(),
  confirmAuthAccount: vi.fn(async () => ({ ok: true })),
  resendConfirmation: vi.fn(async () => ({ ok: true })),
  deleteAuthAccount: vi.fn(async () => ({ ok: true })),
  requestPasswordReset: (args: { data: { userId: string } }) => resetMock(args),
  setAccountPassword: vi.fn(async () => ({ ok: true })),
  createKioskAuthAccount: (args: {
    data: { email: string; password: string; displayName: string };
  }) => createKioskMock(args),
}));

vi.mock("@/integrations/supabase/config", () => ({
  getAuthConfigurationStatus: () => ({
    status: "configured",
    provider: "supabase",
    missingKeys: [],
  }),
}));

import userEvent from "@testing-library/user-event";

import { BackendAdminDialog } from "@/components/BackendAdminDialog";

describe("<BackendAdminDialog>", () => {
  beforeEach(() => {
    listMock.mockClear();
    resetMock.mockClear();
    createKioskMock.mockClear();
  });

  it("should_showAccountsAndStatus_when_opened", async () => {
    render(<BackendAdminDialog open onOpenChange={() => {}} />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(await screen.findByText("demo@example.com")).toBeInTheDocument();
    expect(screen.getByText("Vollständig konfiguriert")).toBeInTheDocument();
    expect(screen.getByText("Unbestätigt")).toBeInTheDocument();
  });

  it("should_notExposeSecretsOrProjectIdentifiers", async () => {
    const { container } = render(<BackendAdminDialog open onOpenChange={() => {}} />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    const html = document.body.innerHTML + container.innerHTML;
    expect(html).not.toMatch(/sb_secret_|service_role|supabase\.co|SUPABASE_URL/i);
  });

  it("should_triggerRecoveryMailAfterConfirmation_and_showStatus", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<BackendAdminDialog open onOpenChange={() => {}} />);
    const btn = await screen.findByRole("button", {
      name: "Passwort-Reset-Mail an demo@example.com senden",
    });
    expect(btn).toHaveAttribute("title", "Passwort-Reset-Mail senden");
    await userEvent.click(btn);
    expect(confirmSpy).toHaveBeenCalledWith("Passwort-Reset-Mail an demo@example.com senden?");
    await waitFor(() => expect(resetMock).toHaveBeenCalledTimes(1));
    confirmSpy.mockRestore();
  });

  it("should_notSendRecoveryMail_when_confirmationCancelled", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<BackendAdminDialog open onOpenChange={() => {}} />);
    const btn = await screen.findByRole("button", {
      name: "Passwort-Reset-Mail an demo@example.com senden",
    });
    await userEvent.click(btn);
    expect(resetMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("should_createDedicatedKioskAccount_when_formSubmitted", async () => {
    render(<BackendAdminDialog open onOpenChange={() => {}} />);
    await screen.findByText("demo@example.com");

    await userEvent.click(screen.getByRole("button", { name: "Kiosk-Konto anlegen" }));
    await userEvent.clear(screen.getByLabelText("Anzeigename"));
    await userEvent.type(screen.getByLabelText("Anzeigename"), "Info-Kiosk Empfang");
    await userEvent.type(screen.getByLabelText("Kiosk-E-Mail"), "kiosk@example.invalid");
    await userEvent.type(screen.getByLabelText("Kiosk-Passwort"), "DemoPasswort-123!");
    await userEvent.type(screen.getByLabelText("Passwort bestätigen"), "DemoPasswort-123!");
    await userEvent.click(screen.getByRole("button", { name: "Kiosk-Konto erstellen" }));

    await waitFor(() =>
      expect(createKioskMock).toHaveBeenCalledWith({
        data: {
          email: "kiosk@example.invalid",
          password: "DemoPasswort-123!",
          displayName: "Info-Kiosk Empfang",
        },
      }),
    );
  });

  it("should_notCreateKioskAccount_when_passwordConfirmationDiffers", async () => {
    render(<BackendAdminDialog open onOpenChange={() => {}} />);
    await screen.findByText("demo@example.com");

    await userEvent.click(screen.getByRole("button", { name: "Kiosk-Konto anlegen" }));
    await userEvent.type(screen.getByLabelText("Kiosk-E-Mail"), "kiosk@example.invalid");
    await userEvent.type(screen.getByLabelText("Kiosk-Passwort"), "DemoPasswort-123!");
    await userEvent.type(screen.getByLabelText("Passwort bestätigen"), "anderes-passwort");
    await userEvent.click(screen.getByRole("button", { name: "Kiosk-Konto erstellen" }));

    expect(createKioskMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Passwörter stimmen nicht überein.");
  });
});
