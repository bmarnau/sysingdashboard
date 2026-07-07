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
  AppWindow,
  BookOpen,
  CheckCircle2,
  Cloud,
  Database,
  ExternalLink,
  GitBranch,
  GitCommit,
  Github,
  Maximize2,
  Minimize2,
  RefreshCw,
  ShieldCheck,
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

const NOT_CONFIGURED = "Not configured";

function fmtDate(value: string | null | undefined): string {
  if (!value) return NOT_CONFIGURED;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? NOT_CONFIGURED : d.toLocaleString("de-DE");
}

function fmtText(value: string | null | undefined): string {
  return value && value.length > 0 ? value : NOT_CONFIGURED;
}

function BoolBadge({
  ok,
  labelOk = "configured",
  labelNo = NOT_CONFIGURED,
}: {
  ok: boolean;
  labelOk?: string;
  labelNo?: string;
}) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-success">
      <CheckCircle2 className="size-4 shrink-0" /> {labelOk}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <XCircle className="size-4 shrink-0" /> {labelNo}
    </span>
  );
}

function EnvChips({ names }: { names: string[] }) {
  if (!names || names.length === 0) {
    return (
      <span className="text-success inline-flex items-center gap-1">
        <CheckCircle2 className="size-4" /> alle gesetzt
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {names.map((n) => (
        <span
          key={n}
          className="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 font-mono text-xs text-warning"
          title="Fehlende ENV-Variable (nur Name, kein Wert)"
        >
          {n}
        </span>
      ))}
    </div>
  );
}

function Row({
  label,
  value,
  ok,
  href,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  ok?: boolean;
  href?: string | null;
  mono?: boolean;
}) {
  const valueClass = `min-w-0 ${mono ? "font-mono text-xs sm:text-sm" : "text-sm"} [overflow-wrap:anywhere] break-words`;
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-1 border-b border-border py-2 last:border-0 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)] sm:items-start">
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

function Section({
  icon,
  title,
  children,
  span2 = false,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <section
      className={`min-w-0 rounded-md border border-border p-3 ${span2 ? "lg:col-span-2" : ""}`}
    >
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

export function SystemStatusDialog({ open, onOpenChange }: SystemStatusDialogProps) {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const health = useSystemStatusHealth();
  const p = health.payload ?? {};

  useEffect(() => {
    if (!open) return;
    setLastBackup(BackupService.lastAuto());
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setExpanded(false);
    onOpenChange(next);
  };

  const builtAt = new Date(BUILD_INFO.builtAt);
  const lastUpdated = HelpDocumentationService.getLastUpdated();
  const commitOk = hasBuildCommit();

  // GitHub — Server-Werte bevorzugt, sonst BUILD_INFO / PROJECT_INFO als Fallback.
  const ghRepoUrl = p.github?.repositoryUrl || PROJECT_INFO.github.url;
  const ghRepoLabel = repoLabel();
  const ghBranch = p.github?.branch || BUILD_INFO.branch;
  const ghCommit = p.github?.commit || (commitOk ? BUILD_INFO.commit : null);
  const ghCommitHref = ghCommit
    ? `${ghRepoUrl.replace(/\/$/, "")}/commit/${ghCommit}`
    : commitOk
      ? commitUrl()
      : null;

  // Lovable — Server-ENV bevorzugt, sonst feste PROJECT_INFO.
  const lvPublished = p.lovable?.publishedUrl || PROJECT_INFO.lovable.publishedUrl || null;
  const lvProject = p.lovable?.projectId || PROJECT_INFO.lovable.projectId || null;
  const lvDeployAt = p.lovable?.lastDeploymentAt ?? null;
  const lvStatus: "configured" | "not_configured" =
    p.lovable?.status ?? (lvPublished ? "configured" : "not_configured");

  // Azure
  const az = p.azure ?? {};
  const azAllowed = az.allowed ?? null;
  const azSql = Boolean(az.sql?.configured);
  const azTable = Boolean(az.table?.configured);
  const azStorage = Boolean(az.storage?.configured);
  const azAuthMode = az.authMode || NOT_CONFIGURED;
  const azMissing = az.missingEnv ?? [];

  // Security
  const sec = p.security ?? {};
  const envOk = sec.envValidation?.ok ?? null;
  const envMissing = sec.envValidation?.missing ?? [];
  const rbacRoles = sec.rbac?.rolesCount;
  const rbacPerms = sec.rbac?.permissionsCount;
  const kvOk = Boolean(sec.keyVault?.configured);

  const contentClass = expanded
    ? "max-w-[100vw] sm:max-w-[100vw] w-screen h-[100dvh] max-h-[100dvh] rounded-none overflow-y-auto overflow-x-hidden p-4 sm:p-6"
    : "max-w-3xl max-h-[85vh] overflow-y-auto overflow-x-hidden";

  const sectionsWrapper = expanded ? "grid gap-3 lg:grid-cols-2" : "flex flex-col gap-3";

  const runtimeMode = p.application?.mode ?? health.mode ?? null;

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
                Vollständige Übersicht — Werte werden niemals angezeigt, nur Status und ENV-Namen.
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
          {/* 1) Application */}
          <Section icon={<AppWindow className="size-4 shrink-0" />} title="1. Application">
            <Row
              label="Application name"
              value={fmtText(p.application?.name) || "Engineer Console"}
            />
            <Row label="Version" value={DASHBOARD_VERSION} mono />
            <Row label="Build date" value={builtAt.toLocaleString("de-DE")} />
            <Row
              label="Runtime mode"
              value={runtimeMode ?? NOT_CONFIGURED}
              ok={runtimeMode === "production"}
            />
          </Section>

          {/* 2) GitHub */}
          <Section icon={<Github className="size-4 shrink-0" />} title="2. GitHub">
            <Row label="Repository URL" value={ghRepoLabel} href={ghRepoUrl} ok />
            <Row
              label="Current branch"
              value={
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="size-3 shrink-0" /> {fmtText(ghBranch)}
                </span>
              }
            />
            <Row
              label="Commit hash"
              ok={Boolean(ghCommit)}
              mono
              value={
                ghCommit ? (
                  <span className="inline-flex flex-wrap items-center gap-1">
                    <GitCommit className="size-3 shrink-0" />
                    <span className="break-all">{ghCommit.slice(0, 12)}</span>
                    {BUILD_INFO.dirty && <span className="text-warning">(uncommitted)</span>}
                  </span>
                ) : (
                  NOT_CONFIGURED
                )
              }
              href={ghCommitHref}
            />
          </Section>

          {/* 3) Lovable */}
          <Section icon={<Cloud className="size-4 shrink-0" />} title="3. Lovable">
            <Row
              label="Current publish URL"
              value={lvPublished ? lvPublished.replace(/^https?:\/\//, "") : NOT_CONFIGURED}
              href={lvPublished}
              ok={Boolean(lvPublished)}
            />
            <Row
              label="Deployment status"
              value={lvStatus === "configured" ? "configured" : NOT_CONFIGURED}
              ok={lvStatus === "configured"}
            />
            <Row label="Last deployment" value={fmtDate(lvDeployAt)} />
            <Row label="Project ID" value={fmtText(lvProject)} mono />
          </Section>

          {/* 4) Azure */}
          <Section icon={<Cloud className="size-4 shrink-0" />} title="4. Azure">
            <Row
              label="Azure access"
              value={
                azAllowed === null
                  ? NOT_CONFIGURED
                  : azAllowed
                    ? "allowed (production)"
                    : "blocked (development)"
              }
              ok={azAllowed ?? undefined}
            />
            <Row label="Azure SQL" value={<BoolBadge ok={azSql} />} />
            <Row label="Azure Table Storage" value={<BoolBadge ok={azTable} />} />
            <Row label="Azure Blob/SAS" value={<BoolBadge ok={azStorage} />} />
            <Row
              label="Azure auth mode"
              value={azAuthMode === "none" ? NOT_CONFIGURED : azAuthMode}
              ok={azAuthMode !== "none" && azAuthMode !== NOT_CONFIGURED}
            />
            <Row label="Last connection test" value={fmtDate(az.lastConnectionTestAt)} />
            <Row label="Missing ENV variables" value={<EnvChips names={azMissing} />} />
          </Section>

          {/* 5) Security */}
          <Section icon={<ShieldCheck className="size-4 shrink-0" />} title="5. Security" span2>
            <Row
              label="Authentication mode"
              value={fmtText(sec.authMode)}
              ok={Boolean(sec.authMode)}
            />
            <Row
              label="RBAC status"
              ok={Boolean(sec.rbac?.enabled)}
              value={
                sec.rbac?.enabled
                  ? `enabled — ${rbacRoles ?? "?"} roles · ${rbacPerms ?? "?"} permissions`
                  : NOT_CONFIGURED
              }
            />
            <Row
              label="Secret management"
              ok={Boolean(sec.secretManager?.enabled)}
              value={sec.secretManager?.enabled ? "enabled (secretManager.mjs)" : NOT_CONFIGURED}
            />
            <Row
              label="ENV validation"
              ok={envOk ?? undefined}
              value={
                envOk === null
                  ? NOT_CONFIGURED
                  : envOk
                    ? "ok — all required ENVs present"
                    : `failed — ${envMissing.length} missing`
              }
            />
            {envMissing.length > 0 && (
              <Row label="Missing ENV (names only)" value={<EnvChips names={envMissing} />} />
            )}
            <Row
              label="Key Vault readiness"
              value={kvOk ? "configured" : NOT_CONFIGURED}
              ok={kvOk}
            />
          </Section>

          {/* 6) Data */}
          <Section icon={<Database className="size-4 shrink-0" />} title="6. Data">
            <Row label="Local storage" value="active" ok />
            <Row label="Last local backup" value={fmtDate(lastBackup)} />
            <Row label="Last Azure export" value={fmtDate(p.data?.lastAzureExportAt)} />
            <Row label="Last Azure import" value={fmtDate(p.data?.lastAzureImportAt)} />
          </Section>

          {/* 7) Documentation */}
          <Section icon={<BookOpen className="size-4 shrink-0" />} title="7. Documentation">
            <Row label="User manual" value={`available — v${DOCUMENTATION_VERSION}`} ok />
            <Row label="Management overview" value="available — docs/MANAGEMENT_OVERVIEW.md" ok />
            <Row label="Last documentation update" value={lastUpdated || NOT_CONFIGURED} />
          </Section>

          {/* Backend health / Security scan info */}
          <Section icon={<Activity className="size-4 shrink-0" />} title="Backend health" span2>
            <Row
              label="/api/status"
              ok={health.apiReachable ?? undefined}
              value={
                health.inFlight
                  ? "prüfe…"
                  : health.apiReachable
                    ? `reachable (${runtimeMode ?? "?"})`
                    : health.apiReachable === false
                      ? "nicht erreichbar"
                      : NOT_CONFIGURED
              }
            />
            <Row label="Zuletzt geprüft" value={fmtDate(health.checkedAt)} />
            {health.lastError && (
              <p className="mt-2 break-words text-xs text-destructive [overflow-wrap:anywhere]">
                Fehler: {health.lastError}
              </p>
            )}
            {health.apiReachable === false && (
              <p className="mt-2 text-xs text-muted-foreground">
                Hinweis: „nicht erreichbar" ist im reinen Frontend-Deploy ohne Backend erwartet —
                das Dashboard arbeitet vollständig lokal (siehe Handbuch → Offline-Betrieb).
              </p>
            )}
          </Section>

          <Section icon={<ShieldCheck className="size-4 shrink-0" />} title="Security-Scan" span2>
            <Row
              label="Custom-Scanner"
              ok
              value="scripts/security-check.mjs (bun run security:check)"
            />
            <Row label="Sekundär" ok value="gitleaks (.gitleaks.toml)" />
            <Row
              label="CI-Workflow"
              ok
              value=".github/workflows/security.yml"
              href={`${PROJECT_INFO.github.url}/actions/workflows/security.yml`}
            />
            <Row label="Trigger" value="Push & PR (main/develop) · wöchentlich Mo 03:00 UTC" />
            <Row label="Report-Artefakt" value="security-report/findings.{md,json} (30 d)" />
          </Section>
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
