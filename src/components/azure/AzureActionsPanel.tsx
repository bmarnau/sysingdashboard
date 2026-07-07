import { useState } from "react";
import { Database, DownloadCloud, PlugZap, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/PermissionGate";
import type { Permission } from "@/lib/rbac/permissions";
import { azureService } from "@/lib/azure/azure-service";
import { AzureHistoryStore } from "@/lib/azure/azure-history-store";
import type { AzureActionResult } from "@/lib/azure/types";
import { AzureConfirmDialog } from "./AzureConfirmDialog";
import { AzureImportPreviewDialog } from "./AzureImportPreviewDialog";
import { useSystemStatusHealth } from "@/hooks/useSystemStatusHealth";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * AzureActionsPanel — alle Azure-Aktionen als manuell auszulösende Buttons.
 *
 * Regeln:
 * - Ohne RBAC-Permission ist der Button gar nicht sichtbar (`PermissionGate`).
 * - Kritische Aktionen laufen erst nach expliziter Bestätigung.
 * - Import: erst Vorschau, dann Pflicht-Backup, dann zweite Bestätigung.
 * - Bei nicht erlaubter Azure-Umgebung (DEV / fehlende ENV) sind
 *   ausführende Buttons sichtbar, aber deaktiviert.
 */
export function AzureActionsPanel() {
  const user = useCurrentUser();
  const actor = user?.displayName ?? user?.role ?? "unknown";
  const health = useSystemStatusHealth();
  const azureAllowed = health.payload?.azure?.allowed === true;
  const disabledReason = azureAllowed
    ? undefined
    : "Azure ist in diesem Modus nicht verfügbar – siehe Status.";

  const [lastResult, setLastResult] = useState<AzureActionResult | null>(null);
  const [busyKind, setBusyKind] = useState<string | null>(null);

  const [confirmBuild, setConfirmBuild] = useState(false);
  const [confirmExport, setConfirmExport] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [pendingBackupId, setPendingBackupId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  async function run(kind: string, fn: () => Promise<AzureActionResult>) {
    setBusyKind(kind);
    try {
      const res = await fn();
      setLastResult(res);
    } finally {
      setBusyKind(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Azure Aktionen</h3>
        <p className="text-xs text-muted-foreground">
          Alle Aktionen werden ausschließlich per Klick gestartet. Kein Auto-Sync, kein Polling.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <PermissionGate permission={"azure.connection.test" satisfies Permission}>
          <ActionButton
            icon={<PlugZap className="size-4" />}
            label="Verbindung testen"
            busy={busyKind === "connection-test"}
            disabled={!azureAllowed}
            title={disabledReason}
            onClick={() => run("connection-test", () => azureService.testConnection(actor))}
          />
        </PermissionGate>

        <PermissionGate permission={"azure.database.build" satisfies Permission}>
          <ActionButton
            icon={<Database className="size-4" />}
            label="Datenbank aufbauen"
            variant="destructive"
            busy={busyKind === "database-build"}
            disabled={!azureAllowed}
            title={disabledReason}
            onClick={() => setConfirmBuild(true)}
          />
        </PermissionGate>

        <PermissionGate permission={"azure.export" satisfies Permission}>
          <ActionButton
            icon={<UploadCloud className="size-4" />}
            label="Nach Azure exportieren"
            busy={busyKind === "export"}
            disabled={!azureAllowed}
            title={disabledReason}
            onClick={() => setConfirmExport(true)}
          />
        </PermissionGate>

        <PermissionGate
          permission={["azure.import", "backup.restore"] satisfies readonly Permission[]}
        >
          <ActionButton
            icon={<DownloadCloud className="size-4" />}
            label="Aus Azure importieren"
            variant="destructive"
            busy={busyKind === "import"}
            disabled={!azureAllowed}
            title={disabledReason}
            onClick={() => setShowPreview(true)}
          />
        </PermissionGate>

        <PermissionGate permission={"azure.connection.test" satisfies Permission}>
          <ActionButton
            icon={<Trash2 className="size-4" />}
            label="Lokale Historie leeren"
            variant="outline"
            onClick={() => setConfirmClear(true)}
          />
        </PermissionGate>
      </div>

      {lastResult ? (
        <div
          className={`rounded-md border p-3 text-sm ${
            lastResult.ok
              ? "border-success/40 bg-success/10 text-success"
              : "border-warning/40 bg-warning/10 text-warning"
          }`}
        >
          <p className="font-semibold">
            {lastResult.ok ? "Aktion erfolgreich" : "Aktion nicht ausgeführt"}
          </p>
          <p className="text-xs">{lastResult.message}</p>
        </div>
      ) : null}

      <AzureConfirmDialog
        open={confirmBuild}
        onOpenChange={setConfirmBuild}
        title="Azure-Datenbank aufbauen"
        warning="Diese Aktion legt Schema-Strukturen an oder verändert sie. Vor dem Ausführen sollte ein Backup erstellt werden."
        requireText="AUFBAUEN"
        confirmLabel="Datenbank jetzt aufbauen"
        onConfirm={() => run("database-build", () => azureService.buildDatabase(actor))}
      />

      <AzureConfirmDialog
        open={confirmExport}
        onOpenChange={setConfirmExport}
        title="Nach Azure exportieren"
        warning="Der Export überschreibt Daten in der Azure-Zielumgebung. Fortfahren?"
        confirmLabel="Export jetzt starten"
        onConfirm={() => run("export", () => azureService.runExport(actor))}
      />

      <AzureImportPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        onProceed={(backupId) => {
          setPendingBackupId(backupId);
          setConfirmImport(true);
        }}
      />

      <AzureConfirmDialog
        open={confirmImport}
        onOpenChange={setConfirmImport}
        title="Import endgültig ausführen"
        warning="Der Import überschreibt lokale Daten gemäß der gewählten Konfliktstrategie. Ein Backup wurde erstellt."
        requireText="IMPORTIEREN"
        confirmLabel="Import jetzt ausführen"
        onConfirm={() => {
          const backupId = pendingBackupId;
          setPendingBackupId(null);
          if (!backupId) return;
          void run("import", () => azureService.runImport(actor, { backupId }));
        }}
      />

      <AzureConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Lokale Azure-Historie leeren"
        warning="Löscht nur die im Browser gespeicherte Anzeige-Historie. Azure-Daten sind nicht betroffen."
        confirmLabel="Historie leeren"
        onConfirm={() => AzureHistoryStore.clear()}
      />
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  busy,
  disabled,
  title,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  title?: string;
  variant?: "default" | "destructive" | "outline";
}) {
  return (
    <Button
      variant={variant}
      className="justify-start"
      onClick={onClick}
      disabled={disabled || busy}
      title={title}
    >
      {icon}
      <span>{busy ? "läuft…" : label}</span>
    </Button>
  );
}
