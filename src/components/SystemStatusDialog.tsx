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
  ExternalLink,
  GitBranch,
  GitCommit,
  Github,
  Server,
  XCircle,
} from "lucide-react";
import { BUILD_INFO, commitUrl, repoLabel } from "@/lib/build-info";
import {
  DASHBOARD_VERSION,
  DOCUMENTATION_VERSION,
  HelpDocumentationService,
} from "@/lib/help-documentation";
import { BackupService } from "@/lib/backup-service";

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

  useEffect(() => {
    if (!open) return;
    setLastBackup(BackupService.lastAuto());
  }, [open]);

  const repo = repoLabel();
  const githubConnected = Boolean(repo) && BUILD_INFO.commit !== "unknown";
  const builtAt = new Date(BUILD_INFO.builtAt);
  const lastUpdated = HelpDocumentationService.getLastUpdated();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="size-5" /> Systemstatus
          </DialogTitle>
          <DialogDescription>
            Versionen, GitHub-Sync und letzte Aktivitäten auf einen Blick.
          </DialogDescription>
        </DialogHeader>

        <section className="rounded-md border border-border p-3">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Github className="size-4" /> GitHub
          </h3>
          <Row
            label="Verbindung"
            ok={githubConnected}
            value={githubConnected ? "verbunden" : "nicht verbunden"}
          />
          <Row
            label="Repository"
            value={repo || "—"}
            href={repo ? `https://github.com/${repo}` : null}
          />
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
            value={
              <span className="inline-flex items-center gap-1">
                <GitCommit className="size-3" /> {BUILD_INFO.commit}
                {BUILD_INFO.dirty && (
                  <span className="ml-1 text-warning">(uncommitted)</span>
                )}
              </span>
            }
            href={commitUrl()}
          />
          <Row label="Build-Zeit" value={builtAt.toLocaleString("de-DE")} />
        </section>

        <section className="rounded-md border border-border p-3">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Server className="size-4" /> Versionen
          </h3>
          <Row label="Dashboard-Version" value={DASHBOARD_VERSION} />
          <Row label="Handbuch-Version" value={DOCUMENTATION_VERSION} />
          <Row label="Paketversion" value={BUILD_INFO.packageVersion} />
          <Row label="Letzte Handbuch-Aktualisierung" value={lastUpdated} />
          <Row
            label="Letztes automatisches Backup"
            value={lastBackup ? new Date(lastBackup).toLocaleString("de-DE") : "—"}
          />
        </section>

        {!githubConnected && (
          <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
            <p className="font-medium">GitHub ist nicht verbunden.</p>
            <p className="mt-1">
              Verbinden über das Plus-Menü in der Lovable-Chatleiste → GitHub →
              Connect project. Nach dem Verbinden zeigt diese Ansicht
              Repository, Branch und Commit automatisch an.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
