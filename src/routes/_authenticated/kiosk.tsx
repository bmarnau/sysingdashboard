import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { KioskView } from "@/components/kiosk/KioskView";
import { useKioskSessionWatchdog } from "@/hooks/useKioskSessionWatchdog";
import { useKioskSnapshot } from "@/hooks/useKioskSnapshot";
import { createDemoKioskDataProvider } from "@/lib/kiosk/demo-kiosk-provider";
import { performLogout } from "@/lib/session/logout-service";

const KioskSearchSchema = z.object({
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
  const { scenario } = Route.useSearch();
  const { userId } = Route.useRouteContext();
  const provider = useMemo(() => createDemoKioskDataProvider({ scenario }), [scenario]);
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
