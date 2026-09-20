import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KioskWallboardSections } from "@/components/kiosk/KioskWallboardSections";
import type { KioskSnapshotState } from "@/hooks/useKioskSnapshot";
import type { KioskSessionWatchdogStatus } from "@/hooks/useKioskSessionWatchdog";
import { KIOSK_REFRESH_MS } from "@/lib/kiosk/kiosk-contract";

export interface KioskViewProps {
  state: KioskSnapshotState;
  securityStatus: KioskSessionWatchdogStatus;
  onLogout: () => void;
  showControllingLink?: boolean;
  requestedMode?: "demo" | "internal";
}

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("de-DE");
}

function greetingFor(value: Date): string {
  const hour = value.getHours();
  if (hour < 12) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

function formatPeriod(value: { from: string; to: string } | undefined): string | null {
  if (!value) return null;
  const format = (date: string) => {
    const [year, month, day] = date.split("-");
    return year && month && day ? `${day}.${month}.${year}` : date;
  };
  return `${format(value.from)} – ${format(value.to)}`;
}

function formatDayDate(value: Date): string {
  return value.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function KioskView({
  state,
  securityStatus,
  onLogout,
  showControllingLink = false,
  requestedMode = "demo",
}: KioskViewProps) {
  const securityBlocked = securityStatus !== "valid";
  const now = new Date();
  const mode = state.snapshot?.mode ?? requestedMode;
  const period = formatPeriod(state.snapshot?.period);
  const domains = new Map((state.snapshot?.domains ?? []).map((domain) => [domain.id, domain]));
  const banner =
    mode === "hybrid"
      ? "HYBRID — INTERNE DATEN + DEMO-DATEN"
      : mode === "internal"
        ? "INTERNE DATEN"
        : "DEMO-DATEN — KEINE LIVE-DATEN";

  return (
    <main className="min-h-dvh bg-kiosk-canvas p-3 text-kiosk-ink sm:p-4 2xl:p-2">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-[1920px] flex-col gap-3 sm:min-h-[calc(100dvh-2rem)] 2xl:min-h-[calc(100dvh-1rem)] 2xl:gap-2">
        <header className="rounded-lg border border-kiosk-border bg-kiosk-surface px-4 py-3 shadow-sm sm:px-5 2xl:py-2">
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_auto] 2xl:gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-kiosk-subtle">SYSING / SYSTEMHAUS</p>
              <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
                <h1 className="truncate text-2xl font-bold sm:text-3xl">Info-Kiosk</h1>
                <span className="text-lg font-semibold text-kiosk-subtle">{greetingFor(now)}</span>
              </div>
              <p className="text-sm font-medium text-kiosk-subtle">{formatDayDate(now)}</p>
            </div>

            <div className="grid shrink-0 justify-items-start gap-2 lg:justify-items-end 2xl:gap-1">
              <div className="flex flex-wrap items-center justify-end gap-3">
                <div
                  className={
                    mode === "demo"
                      ? "rounded-md border border-kiosk-warning-border bg-kiosk-warning-soft px-3 py-2 text-sm font-bold text-kiosk-warning 2xl:py-1.5"
                      : "rounded-md border border-kiosk-accent bg-kiosk-accent-soft px-3 py-2 text-sm font-bold text-kiosk-accent 2xl:py-1.5"
                  }
                >
                  {banner}
                </div>
                <Button
                  variant="outline"
                  className="bg-kiosk-surface text-kiosk-ink"
                  onClick={onLogout}
                  aria-label="Abmelden"
                >
                  <LogOut className="mr-2 size-4" aria-hidden="true" /> Abmelden
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-0.5 text-left text-xs font-medium text-kiosk-subtle sm:grid-cols-2 lg:text-right">
                <span>
                  {mode === "demo" ? "Datenstand" : "Interner Datenstand"}:{" "}
                  {formatTimestamp(state.snapshot?.observedAt ?? null)}
                </span>
                <span>Datensatz: {state.snapshot?.datasetVersion ?? "—"}</span>
                {period ? <span>Zeitraum: {period}</span> : null}
                <span>Automatischer Refresh: {KIOSK_REFRESH_MS / 1000} s</span>
                {state.refreshError ? (
                  <span role="status" className="font-semibold text-kiosk-critical">
                    {state.refreshError}
                  </span>
                ) : (
                  <span>Letzte Aktualisierung: {formatTimestamp(state.lastRefreshedAt)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 border-t border-kiosk-border pt-3 2xl:mt-2 2xl:pt-2">
            <h2 className="text-2xl font-bold sm:text-3xl">Operative Steuerungsübersicht</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="text-sm font-medium text-kiosk-subtle">
                Read-only | Auto-Refresh | Systemhaus
              </p>
              {showControllingLink ? (
                <Link
                  to="/projektcontrolling"
                  className="text-sm font-semibold text-kiosk-accent underline-offset-4 hover:underline"
                >
                  Projektcontrolling öffnen
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        {securityBlocked ? (
          <section
            role="alert"
            className="grid flex-1 place-items-center rounded-lg border border-kiosk-warning-border bg-kiosk-surface p-8 text-center shadow-sm"
          >
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold">Sicherheitsprüfung derzeit nicht verfügbar</h2>
              <p className="mt-3 text-kiosk-subtle">
                Die Kiosk-Sitzung wird erneut geprüft. Bis zur erfolgreichen Bestätigung werden
                keine Managementdaten angezeigt.
              </p>
            </div>
          </section>
        ) : state.status === "loading" ? (
          <section className="grid flex-1 place-items-center rounded-lg border border-kiosk-border bg-kiosk-surface p-8 shadow-sm">
            <p className="text-lg font-medium">Kiosk-Daten werden geladen …</p>
          </section>
        ) : state.status === "error" || !state.snapshot ? (
          <section
            role="alert"
            className="grid flex-1 place-items-center rounded-lg border border-kiosk-critical-border bg-kiosk-surface p-8 text-center shadow-sm"
          >
            <div>
              <h2 className="text-2xl font-semibold">Kiosk-Daten konnten nicht geladen werden</h2>
              <p className="mt-3 text-kiosk-subtle">Bitte Sitzung und Datenquelle prüfen.</p>
            </div>
          </section>
        ) : state.snapshot.datasetState === "not_loaded" ? (
          <section className="grid flex-1 place-items-center rounded-lg border border-kiosk-border bg-kiosk-surface p-8 text-center shadow-sm">
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold">
                Kiosk-Demodaten sind auf diesem Gerät nicht geladen.
              </h2>
              <p className="mt-3 text-kiosk-subtle">
                Ein berechtigter Administrator lädt den synthetischen Kiosk-Datensatz im
                Servicebereich.
              </p>
            </div>
          </section>
        ) : (
          <KioskWallboardSections domains={domains} />
        )}
      </div>
    </main>
  );
}
