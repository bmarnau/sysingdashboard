import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

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
}));

vi.mock("@/integrations/supabase/config", () => ({
  getAuthConfigurationStatus: () => ({
    status: "configured",
    provider: "supabase",
    missingKeys: [],
  }),
}));

import { BackendAdminDialog } from "@/components/BackendAdminDialog";

describe("<BackendAdminDialog>", () => {
  beforeEach(() => listMock.mockClear());

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
});
