/**
 * Standard-Refresh-Schritte des Dashboards.
 *
 * Jeder Schritt ruft ausschließlich eine bestehende Lesefassade auf:
 * - Kataloge: `@/lib/reference-data` (Read-Through-Cache neu befüllen)
 * - lokaler Workspace: Store-Rehydration aus dem Browser-Bestand
 *
 * AVKK-Sachverhalte, Verantwortungen, Kompetenzen, Konsequenzen,
 * Management-Aggregate sowie Profil/Rolle werden von den jeweiligen Hooks
 * über die Refresh-Generation neu geladen — bewusst ohne zweite Ladelogik.
 */
import { refresh as refreshReferenceData } from "@/lib/reference-data";
import { rehydrateDashboardStore } from "@/lib/store/dashboard-persistence";
import { registerRefreshStep } from "./refresh-coordinator";

let registered = false;

/** Idempotent: registriert die Standardschritte genau einmal. */
export function registerDefaultRefreshSteps(): void {
  if (registered) return;
  registered = true;

  registerRefreshStep({
    id: "reference-data",
    label: "Kataloge",
    stage: 0,
    run: async () => {
      await refreshReferenceData();
    },
  });

  registerRefreshStep({
    id: "local-workspace",
    label: "Lokaler Arbeitsbestand",
    stage: 0,
    run: () => {
      // Liest den vorhandenen lokalen Stand erneut ein (Local-First).
      // Es findet KEINE Synchronisation mit einer zentralen Datenbank statt.
      rehydrateDashboardStore();
    },
  });
}

/** Nur für Tests. */
export function __resetDefaultStepsForTest(): void {
  registered = false;
}
