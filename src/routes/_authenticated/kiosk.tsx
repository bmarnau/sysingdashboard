import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { KioskView } from "@/components/kiosk/KioskView";
import { useKioskSessionWatchdog } from "@/hooks/useKioskSessionWatchdog";
import { useKioskSnapshot } from "@/hooks/useKioskSnapshot";
import { createDemoKioskDataProvider } from "@/lib/kiosk/demo-kiosk-provider";
import { createInternalReadKioskDataProvider } from "@/lib/kiosk/internal-kiosk-provider";
import { performLogout } from "@/lib/session/logout-service";

const KioskSearchSchema = z.object({
  mode: z.enum(["demo", "internal"]).catch("demo").default("demo"),
  systemhouseId: z.string().uuid().optional().catch(undefined),
  scenario: z
    .enum(["default", "empty", "unknown", "error", "not_loaded"])
    .catch("default")
    .default("default"),
});

export const Route = createFileRoute("/_authenticated/kiosk")({
  validateSearch: KioskSearchSchema,
  component: KioskPage,
});

function KioskPage() {
  const { mode, scenario, systemhouseId } = Route.useSearch();
  const { userId } = Route.useRouteContext();
  const provider = useMemo(
    () =>
      mode === "internal"
        ? createInternalReadKioskDataProvider({ systemhouseId })
        : createDemoKioskDataProvider({ scenario }),
    [mode, scenario, systemhouseId],
  );
  const state = useKioskSnapshot(provider);
  const { status: securityStatus } = useKioskSessionWatchdog({ userId });

  return (
    <KioskView
      state={state}
      securityStatus={securityStatus}
      onLogout={() => void performLogout({ reason: "manual" })}
    />
  );
}
