import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { KioskDemoDataSection } from "@/components/kiosk/KioskDemoDataSection";
import { readKioskDemoDataset } from "@/lib/kiosk/kiosk-demo-repository";
import type { UserProfile } from "@/lib/user-management";

function actor(role: UserProfile["role"]): UserProfile {
  return {
    id: `test-${role}`,
    firstName: "Test",
    lastName: role,
    displayName: `Test ${role}`,
    email: `${role}@example.invalid`,
    phone: "",
    role,
    status: "active",
    mfaEnabled: false,
    createdAt: "2026-09-14T00:00:00.000Z",
    updatedAt: "2026-09-14T00:00:00.000Z",
  };
}

function validJson(): string {
  return JSON.stringify({
    schemaVersion: "sysing.kiosk.demo.v1",
    synthetic: true,
    snapshot: {
      mode: "demo",
      datasetVersion: "1.0.0",
      generatedAt: "2026-09-14T08:00:00Z",
      observedAt: "2026-09-14T08:00:00Z",
      domains: [
        {
          id: "projects",
          title: "Projekte",
          level: "ok",
          metrics: [{ value: 8, label: "Aktive Projekte", level: "ok" }],
        },
      ],
    },
  });
}

describe("KioskDemoDataSection", () => {
  beforeEach(() => window.localStorage.clear());

  it("lets an administrator load the canonical kiosk demo dataset", () => {
    render(<KioskDemoDataSection actor={actor("administrator")} />);

    fireEvent.click(screen.getByRole("button", { name: "Beispieldatensatz laden" }));

    expect(readKioskDemoDataset()).not.toBeNull();
    expect(screen.getByText("Kiosk-Demodatensatz geladen.")).toBeVisible();
  });

  it("imports a valid local JSON file and shows the imported dataset version", async () => {
    render(<KioskDemoDataSection actor={actor("administrator")} />);
    const file = new File([validJson()], "kiosk-demo.json", { type: "application/json" });

    fireEvent.change(screen.getByLabelText("Kiosk-Demo-JSON auswählen"), {
      target: { files: [file] },
    });

    await waitFor(() => expect(screen.getByText("Kiosk-Demo-JSON importiert.")).toBeVisible());
    expect(screen.getByText("Version 1.0.0")).toBeVisible();
    expect(readKioskDemoDataset()?.domains[0]?.id).toBe("projects");
  });

  it("keeps write controls disabled for a viewer", () => {
    render(<KioskDemoDataSection actor={actor("viewer")} />);

    expect(screen.getByRole("button", { name: "Beispieldatensatz laden" })).toBeDisabled();
    expect(screen.getByLabelText("Kiosk-Demo-JSON auswählen")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Kiosk-Demodaten entfernen" })).toBeDisabled();
  });
});
