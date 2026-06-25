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
  Maximize2,
  Minimize2,
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
  mono = true,
}: {
  label: string;
  value: React.ReactNode;
  ok?: boolean;
  href?: string | null;
  mono?: boolean;
}) {
  const valueClass = `min-w-0 ${mono ? "font-mono text-xs sm:text-sm" : "text-sm"} [overflow-wrap:anywhere] break-words`;
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-1 border-b border-border py-2 last:border-0 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:items-start">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-start gap-2">
        {ok === true && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />}
        {ok === false && <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`${valueClass} inline-flex items-start gap-1 text-primary hover:underline`}
          >
            <span className="min-w-0 break-all">{value}</span>
            <ExternalLink className="mt-0.5 size-3 shrink-0" />
          </a>
        ) : (
          <span className={valueClass}>{value}</span>
        )}
      </div>
    </div>
  );
}

export function SystemStatusDialog({ open, onOpenChange }: SystemStatusDialogProps) {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const health = useSystemStatusHealth();

  useEffect(() => {
    if (!open) return;
    setLastBackup(BackupService.lastAuto());
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setExpanded(false);
    onOpenChange(next);
  };

  const repo = repoLabel();
  const builtAt = new Date(BUILD_INFO.builtAt);
  const lastUpdated = HelpDocumentationService.getLastUpdated();
  const commitOk = hasBuildCommit();

  const contentClass = expanded
    ? "max-w-[100vw] sm:max-w-[100vw] w-screen h-[100dvh] max-h-[100dvh] rounded-none overflow-y-auto overflow-x-hidden p-4 sm:p-6"
    : "max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden";

  const sectionsWrapper = expanded ? "grid gap-3 lg:grid-cols-2" : "flex flex-col gap-3";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={contentClass}>
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <Activity className="size-5 shrink-0" /> Systemstatus
              </DialogTitle>
              <DialogDescription className="mt-1">
                Repository, Lovable-Deployment, Versionen und Laufzeitprüfung auf einen Blick.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Minimieren" : "Maximieren"}
              title={expanded ? "Minimieren" : "Maximieren"}
            >
              {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </div>
        </DialogHeader>

        <div className={sectionsWrapper}>
          <section className="min-w-0 rounded-md border border-border p-3">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Github className="size-4 shrink-0" /> GitHub
            </h3>
            <Row label="Repository" ok value={repo} href={PROJECT_INFO.github.url} />
            <Row
              label="Branch"
              value={
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="size-3 shrink-0" /> {BUILD_INFO.branch}
                </span>
              }
            />
            <Row
              label="Letzter Commit"
              ok={commitOk}
              value={
                commitOk ? (
                  <span className="inline-flex flex-wrap items-center gap-1">
                    <GitCommit className="size-3 shrink-0" />
                    <span className="break-all">{BUILD_INFO.commit}</span>
                    {BUILD_INFO.dirty && <span className="text-warning">(uncommitted)</span>}
                  </span>
                ) : (
                  <span className="text-muted-foreground">nicht im Build verfügbar</span>
                )
              }
              href={commitOk ? commitUrl() : null}
            />
            <Row label="Build-Zeit" mono={false} value={builtAt.toLocaleString("de-DE")} />
          </section>

          <section className="min-w-0 rounded-md border border-border p-3">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Cloud className="size-4 shrink-0" /> Lovable-Deployment
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
            <Row label="Editor" value="lovable.dev" href={PROJECT_INFO.lovable.editorUrl} />
            <Row label="Projekt-ID" value={PROJECT_INFO.lovable.projectId} />
          </section>

          <section className="min-w-0 rounded-md border border-border p-3 lg:col-span-2">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Server className="size-4 shrink-0" /> Versionen & Backend
            </h3>
            <Row label="Dashboard-Version" value={DASHBOARD_VERSION} />
            <Row label="Handbuch-Version" value={DOCUMENTATION_VERSION} />
            <Row label="Paketversion" value={BUILD_INFO.packageVersion} />
            <Row label="Letzte Handbuch-Aktualisierung" mono={false} value={lastUpdated} />
            <Row
              label="Letztes automatisches Backup"
              mono={false}
              value={lastBackup ? new Date(lastBackup).toLocaleString("de-DE") : "—"}
            />
            <Row
              label="Backend /api/status"
              ok={health.apiReachable ?? undefined}
              mono={false}
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
              mono={false}
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
              mono={false}
              value={health.checkedAt ? new Date(health.checkedAt).toLocaleString("de-DE") : "—"}
            />
            {health.lastError && (
              <p className="mt-2 break-words text-xs text-destructive [overflow-wrap:anywhere]">
                Fehler: {health.lastError}
              </p>
            )}
          </section>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" size="sm" onClick={health.refresh} disabled={health.inFlight}>
            <RefreshCw className={`mr-2 size-4 ${health.inFlight ? "animate-spin" : ""}`} />
            Jetzt prüfen
          </Button>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
