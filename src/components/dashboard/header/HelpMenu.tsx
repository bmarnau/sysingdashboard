/**
 * Hilfe-Menü im Dashboard-Header (Handbuch-Schnellzugriffe).
 * Verhaltensneutral aus dashboard.tsx extrahiert (Sprint 05).
 */
import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { registerDashboardNavigationHelp } from "@/lib/help-navigation-topics";

registerDashboardNavigationHelp();

const HELP_QUICKLINKS: { id: string; label: string }[] = [
  { id: "navigation-ansichten", label: "Navigation & Ansichten" },
  { id: "projects", label: "Projekte & Projektdetail" },
  { id: "local-operation", label: "Lokaler Betrieb ohne Azure" },
  { id: "azure-service-area", label: "Azure Servicebereich" },
  { id: "azure-database-build", label: "Azure Datenbank aufbauen" },
  { id: "azure-connection-test", label: "Azure Verbindung testen" },
  { id: "azure-export", label: "Nach Azure exportieren" },
  { id: "azure-import", label: "Aus Azure importieren" },
  { id: "azure-conflict-handling", label: "Konflikthandling" },
  { id: "backup-before-import", label: "Backup vor Import" },
  { id: "rbac-rollen-berechtigungen", label: "Rollen & Berechtigungen" },
  { id: "system-status", label: "Systemstatus" },
  { id: "env-validation", label: "ENV-Validierung" },
  { id: "security-principles", label: "Sicherheitsprinzipien" },
  { id: "azure-outage", label: "Was bei Azure-Ausfall passiert" },
  { id: "test-instance", label: "Testinstanz und Qualitätssicherung" },
  { id: "tech-debt", label: "Technical-Debt-Analyse" },
  { id: "api-endpoint-tests", label: "API- und Endpoint-Tests" },
];

interface HelpMenuProps {
  openManualTopic: (topicId?: string, q?: string) => void;
}

export function HelpMenu({ openManualTopic }: HelpMenuProps) {
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const openTopic = (topicId?: string) => {
    setShowHelpMenu(false);
    openManualTopic(topicId);
  };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowHelpMenu((v) => !v)}
        title="Hilfe zu dieser Seite"
        aria-label="Hilfe zu dieser Seite"
        aria-expanded={showHelpMenu}
        suppressHydrationWarning
        className="relative grid size-10 place-items-center rounded-lg border border-border bg-secondary/40 transition hover:bg-secondary"
      >
        <HelpCircle className="size-4" aria-hidden="true" />
      </button>
      {showHelpMenu && (
        <>
          <button
            aria-label="Hilfe-Menü schließen"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setShowHelpMenu(false)}
          />
          <div className="absolute right-0 z-40 mt-2 max-h-[70vh] w-72 overflow-y-auto rounded-lg border border-border bg-background shadow-[var(--shadow-elevated)]">
            <button
              onClick={() => openTopic(undefined)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium hover:bg-secondary/60"
            >
              Handbuch öffnen
            </button>
            <div className="border-t border-border px-4 pb-1 pt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              Kapitel direkt öffnen
            </div>
            {HELP_QUICKLINKS.map((q) => (
              <button
                key={q.id}
                onClick={() => openTopic(q.id)}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-secondary/60"
              >
                {q.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
