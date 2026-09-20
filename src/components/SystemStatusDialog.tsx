import { useCallback, useEffect, useState } from "react";
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
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { can } from "@/lib/rbac/permissions";
import { getAuthConfigurationStatus } from "@/integrations/supabase/config";
import { getAuthBackendStatus } from "@/lib/admin/auth-accounts.functions";
import { resolveGitSyncState } from "@/lib/git-sync-status";

interface SystemStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NOT_CONFIGURED = "Not configured";
const HOSTING_METADATA_UNAVAILABLE = "vom Hosting nicht bereitgestellt";
type AdminBackendState = "idle" | "checking" | "connected" | "unavailable";

function fmtDate(value: string | null | undefined): string {
  if (!value) return NOT_CONFIGURED;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? NOT_CONFIGURED : d.toLocaleString("de-DE");
}

function fmtText(value: string | null | undefined): string {
  return value && value.length > 0 ? value : NOT_CONFIGURED;
}

function probeLocalStorage(): boolean {
  if (typeof window === "undefined") return false;
  const key = "__sysing_status_probe__";
  try {
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
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
  const [adminBackendState, setAdminBackendState] = useState<AdminBackendState>("idle");
  const health = useSystemStatusHealth();
  const currentUser = useCurrentUser();
  const canManageUsers = can(currentUser, "users.manage");
  const authConfig = getAuthConfigurationStatus();
  const p = health.payload ?? {};

  const refreshAdminBackend = useCallback(async () => {
    if (!canManageUsers) {
      setAdminBackendState("idle");
      return;
    }
    setAdminBackendState("checking");
    try {
      await getAuthBackendStatus();
      setAdminBackendState("connected");
    } catch {
      setAdminBackendState("unavailable");
    }
  }, [canManageUsers]);

  useEffect(() => {
    if (!open) return;
    setLastBackup(BackupService.lastAuto());
    void refreshAdminBackend();
  }, [open, refreshAdminBackend]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setExpanded(false);
    onOpenChange(next);
  };

  const refreshAll = () => {
    health.refresh();
    setLastBackup(BackupService.lastAuto());
    void refreshAdminBackend();
  };

  const builtAt = new Date(BUILD_INFO.builtAt);
  const lastUpdated = HelpDocumentationService.getLastUpdated();
  const commitOk = hasBuildCommit();

  // GitHub — Server-Werte bevorzugt, sonst BUILD_INFO / PROJECT_INFO als Fallback.
  const ghRepoUrl = p.github?.repositoryUrl || PROJECT_INFO.github.url;
  const ghRepoLabel = repoLabel();
  const ghBranch = p.github?.branch || BUILD_INFO.branch;
  const ghCommit = p.github?.commit || (commitOk ? BUILD_INFO.commit : null);
  const ghMainBranch = p.github?.mainBranch || PROJECT_INFO.github.defaultBranch;
  const ghMainCommit = p.github?.mainCommit ?? null;
  const ghCheckedAt = p.github?.checkedAt ?? null;
  const ghSourceReachable = p.github?.sourceOfTruthReachable ?? null;
  const ghSyncState = resolveGitSyncState(ghCommit, ghMainCommit);
  const ghSyncLabel =
    ghSyncState === "synchronized"
      ? "SYNCHRON — Build entspricht GitHub main"
      : ghSyncState === "different"
        ? "ABWEICHEND — Build entspricht nicht GitHub main"
        : ghSourceReachable === false
          ? "NICHT PRÜFBAR — GitHub main nicht erreichbar"
          : "NICHT PRÜFBAR — Build- oder main-Commit fehlt";
  const ghCommitHref = ghCommit
    ? `${ghRepoUrl.replace(/\/$/, "")}/commit/${ghCommit}`
    : commitOk
      ? commitUrl()
      : null;
  const ghMainCommitHref = ghMainCommit
    ? `${ghRepoUrl.replace(/\/$/, "")}/commit/${ghMainCommit}`
    : null;

  // Lovable — Publish-URL darf auf feste Projektmetadaten zurückfallen. Ein
  // Deploymentstatus wird dagegen nur angezeigt, wenn das Hosting ihn liefert.
  const lvPublished = p.lovable?.publishedUrl || PROJECT_INFO.lovable.publishedUrl || null;
  const lvDeployAt = p.lovable?.lastDeploymentAt ?? null;
  const lvStatus = p.lovable?.status ?? null;

  // Azure — optionaler Zielprovider. Fehlende Konfiguration ist neutral und
  // wird über Counts statt über öffentlich sichtbare ENV-Namen bewertet.
  const az = p.azure ?? {};
  const azAllowed = az.allowed ?? null;
  const azSql = Boolean(az.sql?.configured);
  const azTable = Boolean(az.table?.configured);
  const azStorage = Boolean(az.storage?.configured);
  const azAuthMode = az.authMode || NOT_CONFIGURED;
  const azMissing = az.missingEnv ?? [];
  const azMissingCount = az.missingEnvCount ?? azMissing.length;

  // Security — allgemeine ENV-Ampel bezieht sich nur auf die aktive Plattform.
  const sec = p.security ?? {};
  const envOk = sec.envValidation?.ok ?? null;
  const envMissing = sec.envValidation?.missing ?? [];
  const envMissingCount = sec.envValidation?.missingCount ?? envMissing.length;
  const envScope = sec.envValidation?.scope || sec.authMode || "active";
  const rbacRoles = sec.rbac?.rolesCount;
  const rbacPerms = sec.rbac?.permissionsCount;
  const kvOk = Boolean(sec.keyVault?.configured);
  const authConfigLabel =
    authConfig.status === "configured"
      ? "vollständig konfiguriert"
      : authConfig.status === "missing"
        ? "unvollständig konfiguriert"
        : "fehlerhaft konfiguriert";
  const backendStatusLabel = !canManageUsers
    ? "nicht geprüft — users.manage erforderlich"
    : adminBackendState === "checking"
      ? "Prüfung läuft…"
      : adminBackendState === "connected"
        ? "erreichbar — geschützte Admin-Prüfung"
        : adminBackendState === "unavailable"
          ? "nicht erreichbar"
          : "noch nicht geprüft";
  const backendStatusOk = !canManageUsers
    ? undefined
    : adminBackendState === "connected"
      ? true
      : adminBackendState === "unavailable"
        ? false
        : undefined;

  const contentClass = expanded
    ? "max-w-[100vw] sm:max-w-[100vw] w-screen h-[100dvh] max-h-[100dvh] rounded-none overflow-y-auto overflow-x-hidden p-4 sm:p-6"
    : "max-w-3xl max-h-[85vh] overflow-y-auto overflow-x-hidden";

  const sectionsWrapper = expanded ? "grid gap-3 lg:grid-cols-2" : "flex flex-col gap-3";

  const runtimeMode = p.application?.mode ?? health.mode ?? null;
  const localStorageAvailable = probeLocalStorage();

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
                Betriebsübersicht ohne Secrets oder Verbindungswerte — nur sichere Status- und
                Metadaten.
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
            <Row label="Application name" value={fmtText(p.application?.name)} />
            <Row label="Version" value={DASHBOARD_VERSION} mono />
            <Row label="Build date" value={builtAt.toLocaleString("de-DE")} />
            <Row label="Runtime mode (NODE_ENV)" value={runtimeMode ?? NOT_CONFIGURED} />
          </Section>

          {/* 2) GitHub */}
          <Section icon={<Github className="size-4 shrink-0" />} title="2. GitHub">
            <Row label="Repository URL" value={ghRepoLabel} href={ghRepoUrl} ok />
            <Row
              label="Build branch"
              value={
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="size-3 shrink-0" />{" "}
                  {ghBranch && ghBranch !== "unknown" ? ghBranch : HOSTING_METADATA_UNAVAILABLE}
                </span>
              }
            />
            <Row
              label="Build commit"
              ok={ghCommit ? true : undefined}
              mono
              value={
                ghCommit ? (
                  <span className="inline-flex flex-wrap items-center gap-1">
                    <GitCommit className="size-3 shrink-0" />
                    <span className="break-all">{ghCommit.slice(0, 12)}</span>
                    {BUILD_INFO.dirty && <span className="text-warning">(uncommitted)</span>}
                  </span>
                ) : (
                  HOSTING_METADATA_UNAVAILABLE
                )
              }
              href={ghCommitHref}
            />
            <Row label="Source-of-Truth branch" value={ghMainBranch} mono />
            <Row
              label="GitHub main HEAD"
              value={ghMainCommit ? ghMainCommit.slice(0, 12) : "nicht prüfbar"}
              href={ghMainCommitHref}
              mono
            />
            <Row
              label="Synchronisationsstatus"
              value={ghSyncLabel}
              ok={
                ghSyncState === "synchronized"
                  ? true
                  : ghSyncState === "different"
                    ? false
                    : undefined
              }
            />
            <Row label="Zuletzt gegen GitHub geprüft" value={fmtDate(ghCheckedAt)} />
          </Section>

          {/* 3) Lovable */}
          <Section icon={<Cloud className="size-4 shrink-0" />} title="3. Lovable">
            <Row
              label="Configured publish URL"
              value={lvPublished ? lvPublished.replace(/^https?:\/\//, "") : NOT_CONFIGURED}
              href={lvPublished}
            />
            <Row
              label="Hosting publish metadata"
              value={
                lvStatus === "configured"
                  ? "vorhanden — kein Live-Health-Nachweis"
                  : lvStatus === "not_configured"
                    ? NOT_CONFIGURED
                    : HOSTING_METADATA_UNAVAILABLE
              }
            />
            <Row
              label="Hosting deployment timestamp"
              value={lvDeployAt ? fmtDate(lvDeployAt) : HOSTING_METADATA_UNAVAILABLE}
            />
          </Section>

          {/* 4) Azure */}
          <Section icon={<Cloud className="size-4 shrink-0" />} title="4. Azure">
            <Row
              label="Azure runtime policy"
              value={
                azAllowed === null
                  ? NOT_CONFIGURED
                  : azAllowed
                    ? "Freigabe durch NODE_ENV=production"
                    : "blockiert durch Development-Modus"
              }
            />
            <Row label="Azure SQL ENV" value={<BoolBadge ok={azSql} />} />
            <Row label="Azure Table Storage ENV" value={<BoolBadge ok={azTable} />} />
            <Row label="Azure Blob/SAS ENV" value={<BoolBadge ok={azStorage} />} />
            <Row
              label="Azure auth metadata"
              value={
                azAuthMode === "managed-identity"
                  ? "Managed-Identity-Flag gesetzt"
                  : azAuthMode === "service-principal-metadata"
                    ? "Client-/Tenant-ID vorhanden — kein Credential-Nachweis"
                    : azAuthMode === "none"
                      ? "optional / nicht vorbereitet"
                      : azAuthMode
              }
            />
            <Row
              label="Azure connectivity test"
              value={
                az.lastConnectionTestAt
                  ? fmtDate(az.lastConnectionTestAt)
                  : "noch nicht ausgeführt / implementiert"
              }
            />
            <Row
              label="Known Azure ENV presence"
              value={
                azMissingCount === 0
                  ? "alle bekannten Azure-ENV-Namen vorhanden — keine Verbindungsprüfung"
                  : `optionales Ziel — ${azMissingCount} bekannte ENV nicht gesetzt`
              }
            />
            {azMissing.length > 0 && (
              <Row label="Missing Azure ENV (names only)" value={<EnvChips names={azMissing} />} />
            )}
          </Section>

          {/* 5) Security */}
          <Section icon={<ShieldCheck className="size-4 shrink-0" />} title="5. Security" span2>
            <Row label="Configured auth provider" value={fmtText(sec.authMode)} />
            <Row
              label="Supabase Client-Konfiguration"
              value={`${authConfigLabel} — Format/Presence, keine Connectivity`}
              ok={authConfig.status === "configured"}
            />
            <Row
              label="RBAC code contract"
              value={
                sec.rbac?.enabled
                  ? `geladen — ${rbacRoles ?? "?"} Rollen · ${rbacPerms ?? "?"} Permissions; Live-Matrix separat testen`
                  : NOT_CONFIGURED
              }
            />
            <Row
              label="Secret-handling module"
              value={
                sec.secretManager?.enabled
                  ? "geladen (secretManager.mjs) — kein externer Secret-Store-Nachweis"
                  : NOT_CONFIGURED
              }
            />
            <Row
              label="Runtime ENV (aktive Plattform)"
              ok={envOk ?? undefined}
              value={
                envOk === null
                  ? NOT_CONFIGURED
                  : envOk
                    ? `${envScope} — ok`
                    : `${envScope} — ${envMissingCount} required missing`
              }
            />
            {envMissing.length > 0 && (
              <Row
                label="Missing active-provider ENV (names only)"
                value={<EnvChips names={envMissing} />}
              />
            )}
            <Row
              label="Key Vault URL"
              value={
                kvOk ? "konfiguriert — Provider noch nicht aktiv" : "optional / nicht konfiguriert"
              }
            />
          </Section>

          {/* 6) Data */}
          <Section icon={<Database className="size-4 shrink-0" />} title="6. Data">
            <Row label="MVP-Datenplattform" value="Supabase" ok />
            <Row label="Backend-Verbindung" value={backendStatusLabel} ok={backendStatusOk} />
            <Row
              label="Browser Local Storage"
              value={localStorageAvailable ? "schreibbar — Laufzeitprobe PASS" : "nicht schreibbar"}
              ok={localStorageAvailable}
            />
            <Row label="Last auto-backup marker" value={fmtDate(lastBackup)} />
            <Row label="Last sync run" value={fmtDate(p.data?.lastSyncAt)} />
            <Row
              label="Azure export/import evidence"
              value="noch nicht getrennt gemessen — kein Betriebsnachweis"
            />
          </Section>

          {/* 7) Documentation */}
          <Section icon={<BookOpen className="size-4 shrink-0" />} title="7. Documentation">
            <Row
              label="User manual artifact"
              value={`im Build enthalten — v${DOCUMENTATION_VERSION}`}
            />
            <Row
              label="Management overview artifact"
              value="Repository-Vertrag: docs/MANAGEMENT_OVERVIEW.md"
            />
            <Row label="Latest help-topic date (editorial)" value={lastUpdated || NOT_CONFIGURED} />
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
            <Row
              label="Correlation-ID contract"
              value="Middleware konfiguriert — vollständige Routenabdeckung wird durch CI/Tech-Debt-Vertrag geprüft"
            />
            <Row
              label="Referenz-ID (letzte Antwort)"
              value={health.lastCorrelationId ?? NOT_CONFIGURED}
            />
            {health.lastError && (
              <p className="mt-2 break-words text-xs text-destructive [overflow-wrap:anywhere]">
                Fehler: {health.lastError}
                {health.lastCorrelationId && (
                  <>
                    {" · "}
                    <span className="text-muted-foreground">
                      Referenz-ID:{" "}
                      <button
                        type="button"
                        className="cursor-pointer font-mono underline"
                        onClick={() =>
                          void navigator.clipboard?.writeText(health.lastCorrelationId ?? "")
                        }
                        aria-label="Referenz-ID kopieren"
                      >
                        {health.lastCorrelationId}
                      </button>
                    </span>
                  </>
                )}
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
              label="Custom-Scanner configured"
              value="scripts/security-check.mjs (bun run security:check)"
            />
            <Row label="Gitleaks configured" value=".gitleaks.toml" />
            <Row
              label="Security workflow configured"
              value=".github/workflows/security.yml"
              href={`${PROJECT_INFO.github.url}/actions/workflows/security.yml`}
            />
            <Row
              label="Trigger contract"
              value="Push & PR (main/develop) · wöchentlich Mo 03:00 UTC"
            />
            <Row
              label="Report-Artefakt contract"
              value="security-report/findings.{md,json} (30 d)"
            />
            <Row
              label="Latest Security-Scan result"
              value="hier nicht live abgefragt — GitHub Actions / Technischer Prüfbericht ist maßgeblich"
            />
          </Section>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={health.inFlight || adminBackendState === "checking"}
          >
            <RefreshCw
              className={`mr-2 size-4 ${health.inFlight || adminBackendState === "checking" ? "animate-spin" : ""}`}
            />
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
