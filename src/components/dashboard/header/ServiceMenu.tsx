/**
 * Servicemenü im Dashboard-Header (Einstellungen, Exporte, Systemdienste).
 * Verhaltensneutral aus dashboard.tsx extrahiert (Sprint 05).
 */
import { useState } from "react";
import {
  BookMarked,
  BookOpen,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileJson,
  Gauge,
  HardDrive,
  Printer,
  ScrollText,
  Server,
  Settings,
  Timer,
  LogOut,
  Trash2,
} from "lucide-react";
import { can } from "@/lib/rbac/permissions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { SessionSettingsDialog } from "@/components/session/SessionSettingsDialog";
import { performLogout } from "@/lib/session/logout-service";
import { useNavigate } from "@tanstack/react-router";

interface ServiceMenuProps {
  showPerfReport: boolean;
  setShowPerfReport: (updater: (v: boolean) => boolean) => void;
  resetData: () => void;
  setShowEngineer: (v: boolean) => void;
  setShowWorkingTimeDialog: (v: boolean) => void;
  setShowUserDialog: (v: boolean) => void;
  setShowManual: (v: boolean) => void;
  setShowBackupDialog: (v: boolean) => void;
  setShowSystemStatus: (v: boolean) => void;
  setShowTechnicalReport: (v: boolean) => void;
  setShowDownloads: (v: boolean) => void;
  setShowImportExport: (v: boolean) => void;
  setShowAzureData: (v: boolean) => void;
  setShowLogViewer: (v: boolean) => void;
  setShowExportDialog: (v: boolean) => void;
  setShowDevDiary: (v: boolean) => void;
}

export function ServiceMenu({
  showPerfReport,
  setShowPerfReport,
  resetData,
  setShowEngineer,
  setShowWorkingTimeDialog,
  setShowUserDialog,
  setShowManual,
  setShowBackupDialog,
  setShowSystemStatus,
  setShowTechnicalReport,
  setShowDownloads,
  setShowImportExport,
  setShowAzureData,
  setShowLogViewer,
  setShowExportDialog,
  setShowDevDiary,
}: ServiceMenuProps) {
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const [showServiceMenu, setShowServiceMenu] = useState(false);
  const [showSessionSettings, setShowSessionSettings] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowServiceMenu((v) => !v)}
        aria-label="Einstellungen und Services"
        aria-expanded={showServiceMenu}
        title="Einstellungen"
        suppressHydrationWarning
        className="relative grid size-10 place-items-center rounded-lg border border-border bg-secondary/40 transition hover:bg-secondary"
      >
        <Settings className="size-4" aria-hidden="true" />
      </button>
      {showServiceMenu && (
        <>
          <button
            aria-label="Menü schließen"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setShowServiceMenu(false)}
          />
          <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-background shadow-[var(--shadow-elevated)]">
            <button
              onClick={() => {
                setShowServiceMenu(false);
                setShowExportDialog(true);
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
            >
              <Download className="size-4 opacity-70" /> Export…
            </button>
            <button
              onClick={() => {
                setShowServiceMenu(false);
                setShowPerfReport((v) => !v);
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
            >
              {showPerfReport ? (
                <>
                  <EyeOff className="size-4 opacity-70" /> Leistungsreport ausblenden
                </>
              ) : (
                <>
                  <Eye className="size-4 opacity-70" /> Leistungsreport anzeigen
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowServiceMenu(false);
                setShowUserDialog(true);
              }}
              className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
            >
              <Server className="size-4 opacity-70" /> Benutzer & Profile…
            </button>
            <button
              onClick={() => {
                setShowServiceMenu(false);
                setShowEngineer(true);
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
            >
              <Server className="size-4 opacity-70" /> Engineer-Stammdaten…
            </button>
            <button
              onClick={() => {
                setShowServiceMenu(false);
                setShowWorkingTimeDialog(true);
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
            >
              <Clock className="size-4 opacity-70" /> Arbeitszeitmodell…
            </button>
            <button
              onClick={() => {
                setShowServiceMenu(false);
                setShowDownloads(true);
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
            >
              <Download className="size-4 opacity-70" /> Downloads…
            </button>
            {can(currentUser, "backup.restore") && (
              <button
                onClick={() => {
                  setShowServiceMenu(false);
                  setShowBackupDialog(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
              >
                <HardDrive className="size-4 opacity-70" /> Backup…
              </button>
            )}
            <button
              onClick={() => {
                setShowServiceMenu(false);
                setShowLogViewer(true);
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
            >
              <ScrollText className="size-4 opacity-70" /> Log Viewer…
            </button>
            {can(currentUser, "azure.export") && (
              <button
                onClick={() => {
                  setShowServiceMenu(false);
                  setShowImportExport(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
              >
                <FileJson className="size-4 opacity-70" /> Import / Export…
              </button>
            )}
            {can(currentUser, "systemstatus.view") && (
              <button
                onClick={() => {
                  setShowServiceMenu(false);
                  setShowAzureData(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
              >
                <HardDrive className="size-4 opacity-70" /> Azure Daten…
              </button>
            )}
            {can(currentUser, "systemstatus.view") && (
              <button
                onClick={() => {
                  setShowServiceMenu(false);
                  setShowSystemStatus(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
              >
                <Gauge className="size-4 opacity-70" /> Systemstatus…
              </button>
            )}
            {can(currentUser, "systemstatus.view") && (
              <button
                onClick={() => {
                  setShowServiceMenu(false);
                  setShowTechnicalReport(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
              >
                <ScrollText className="size-4 opacity-70" /> Technischer Prüfbericht…
              </button>
            )}
            <button
              onClick={() => {
                setShowServiceMenu(false);
                window.print();
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
            >
              <Printer className="size-4 opacity-70" /> PDF Drucken
            </button>
            <button
              onClick={() => {
                setShowServiceMenu(false);
                setShowManual(true);
              }}
              className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
            >
              <BookOpen className="size-4 opacity-70" /> Handbuch…
            </button>
            {can(currentUser, "documentation.view") && (
              <button
                onClick={() => {
                  setShowServiceMenu(false);
                  setShowDevDiary(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
              >
                <BookMarked className="size-4 opacity-70" /> Entwicklungstagebuch…
              </button>
            )}
            <button
              onClick={() => {
                setShowServiceMenu(false);
                setShowSessionSettings(true);
              }}
              className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
            >
              <Timer className="size-4 opacity-70" /> Automatische Abmeldung…
            </button>
            <button
              onClick={() => {
                setShowServiceMenu(false);
                void performLogout({
                  reason: "manual",
                  navigate: (target) => {
                    void navigate({ to: target, replace: true });
                  },
                });
              }}
              className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
            >
              <LogOut className="size-4 opacity-70" /> Abmelden
            </button>
            <button
              onClick={() => {
                setShowServiceMenu(false);
                resetData();
              }}
              className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4 opacity-70" /> Reset
            </button>
          </div>
        </>
      )}
      <SessionSettingsDialog open={showSessionSettings} onOpenChange={setShowSessionSettings} />
    </div>
  );
}
