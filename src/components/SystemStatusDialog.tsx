import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Activity,
  CheckCircle2,
  Cloud,
  ExternalLink,
  GitBranch,
  GitCommit,
  Github,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react";
import { BUILD_INFO, commitUrl, hasBuildCommit, repoLabel } from "@/lib/build-info";
import { PROJECT_INFO } from "@/lib/project-info";
import {
  DASHBOARD_VERSION,
  DOCUMENTATION_VERSION,
  HelpDocumentationService,
} from "@/lib/help-documentation";
import { BackupService } from "@/lib/backup-service";
import { useSystemStatusHealth } from "@/hooks/useSystemStatusHealth";

interface SystemStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Row({
  label,
  value,
  ok,
  href,
}: {
  label: string;
  value: React.ReactNode;
  ok?: boolean;
  href?: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 text-right text-sm">
        {ok === true && <CheckCircle2 className="size-4 text-success" />}
        {ok === false && <XCircle className="size-4 text-destructive" />}
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
          >
            {value} <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="font-mono">{value}</span>
        )}
      </span>
    </div>
  );
}

export function SystemStatusDialog({ open, onOpenChange }: SystemStatusDialogProps) {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const health = useSystemStatusHealth();

  useEffect(() => {
    if (!open) return;
    setLastBackup(BackupService.lastAuto());
  }, [open]);

  const repo = repoLabel();
  const builtAt = new Date(BUILD_INFO.builtAt);
  const lastUpdated = HelpDocumentationService.getLastUpdated();
  const commitOk = hasBuildCommit();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="size-5" /> Systemstatus
          </DialogTitle>
          <DialogDescription>
            Repository, Lovable-Deployment, Versionen und Laufzeitprüfung auf einen Blick.
          </DialogDescription>
        </DialogHeader>

        <section className="rounded-md border border-border p-3">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Github className="size-4" /> GitHub
          </h3>
          <Row label="Repository" ok value={repo} href={PROJECT_INFO.github.url} />
          <Row
            label="Branch"
            value={
              <span className="inline-flex items-center gap-1">
                <GitBranch className="size-3" /> {BUILD_INFO.branch}
              </span>
            }
          />
          <Row
            label="Letzter Commit"
            ok={commitOk}
            value={
              commitOk ? (
                <span className="inline-flex items-center gap-1">
                  <GitCommit className="size-3" /> {BUILD_INFO.commit}
                  {BUILD_INFO.dirty && (
                    <span className="ml-1 text-warning">(uncommitted)</span>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">nicht im Build verfügbar</span>
              )
            }
            href={commitOk ? commitUrl() : null}
          />
          <Row label="Build-Zeit" value={builtAt.toLocaleString("de-DE")} />
        </section>

        <section className="rounded-md border border-border p-3">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Cloud className="size-4" /> Lovable-Deployment
          </h3>
          <Row
            label="Published URL"
            ok
            value={PROJECT_INFO.lovable.publishedUrl.replace(/^https?:\/\//, "")}
            href={PROJECT_INFO.lovable.publishedUrl}
          />
          <Row
            label="Preview (stabil)"
            value={PROJECT_INFO.lovable.stablePreviewUrl.replace(/^https?:\/\//, "")}
            href={PROJECT_INFO.lovable.stablePreviewUrl}
          />
          <Row
            label="Editor"
            value="lovable.dev"
            href={PROJECT_INFO.lovable.editorUrl}
          />
          <Row label="Projekt-ID" value={PROJECT_INFO.lovable.projectId} />
        </section>

        <section className="rounded-md border border-border p-3">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Server className="size-4" /> Versionen & Backend
          </h3>
          <Row label="Dashboard-Version" value={DASHBOARD_VERSION} />
          <Row label="Handbuch-Version" value={DOCUMENTATION_VERSION} />
          <Row label="Paketversion" value={BUILD_INFO.packageVersion} />
          <Row label="Letzte Handbuch-Aktualisierung" value={lastUpdated} />
          <Row
            label="Letztes automatisches Backup"
            value={lastBackup ? new Date(lastBackup).toLocaleString("de-DE") : "—"}
          />
          <Row
            label="Backend /api/status"
            ok={health.apiReachable ?? undefined}
            value={
              health.inFlight
                ? "prüfe…"
                : health.apiReachable
                  ? `erreichbar (${health.mode ?? "?"})`
                  : health.apiReachable === false
                    ? "nicht erreichbar"
                    : "—"
            }
          />
          <Row
            label="Azure-Zugriff erlaubt"
            ok={health.azureAllowed ?? undefined}
            value={
              health.azureAllowed === null
                ? "—"
                : health.azureAllowed
                  ? "ja (production)"
                  : "nein (development)"
            }
          />
          <Row
            label="Zuletzt geprüft"
            value={
              health.checkedAt
                ? new Date(health.checkedAt).toLocaleString("de-DE")
                : "—"
            }
          />
          {health.lastError && (
            <p className="mt-2 text-xs text-destructive">Fehler: {health.lastError}</p>
          )}
        </section>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={health.refresh}
            disabled={health.inFlight}
          >
            <RefreshCw className={`mr-2 size-4 ${health.inFlight ? "animate-spin" : ""}`} />
            Jetzt prüfen
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
