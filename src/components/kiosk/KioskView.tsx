import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KioskWallboardSections } from "@/components/kiosk/KioskWallboardSections";
import type { KioskSnapshotState } from "@/hooks/useKioskSnapshot";
import type { KioskSessionWatchdogStatus } from "@/hooks/useKioskSessionWatchdog";

export interface KioskViewProps {
  state: KioskSnapshotState;
  securityStatus: KioskSessionWatchdogStatus;
  onLogout: () => void;
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

function formatDayDate(value: Date): string {
  return value.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function KioskView({ state, securityStatus, onLogout }: KioskViewProps) {
  const securityBlocked = securityStatus !== "valid";
  const now = new Date();
  const domains = new Map((state.snapshot?.domains ?? []).map((domain) => [domain.id, domain]));

  return (
    <main className="min-h-dvh bg-kiosk-canvas p-3 text-kiosk-ink sm:p-4">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-[1920px] flex-col gap-3 sm:min-h-[calc(100dvh-2rem)]">
        <header className="rounded-lg border border-kiosk-border bg-kiosk-surface px-4 py-3 shadow-sm sm:px-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-kiosk-subtle">SYSING / SYSTEMHAUS</p>
              <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
                <h1 className="truncate text-2xl font-bold sm:text-3xl">Info-Kiosk</h1>
                <span className="text-lg font-semibold text-kiosk-subtle">{greetingFor(now)}</span>
              </div>
              <p className="text-sm font-medium text-kiosk-subtle">{formatDayDate(now)}</p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
              <div className="rounded-md border border-kiosk-warning-border bg-kiosk-warning-soft px-3 py-2 text-sm font-bold text-kiosk-warning">
                DEMO-DATEN — KEINE LIVE-DATEN
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
          </div>

          <div className="mt-3 border-t border-kiosk-border pt-3">
            <h2 className="text-2xl font-bold sm:text-3xl">Operatives Management-Wallboard</h2>
            <p className="text-sm font-medium text-kiosk-subtle">
              Read-only | Auto-Refresh | Systemhaus
            </p>
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
              <p className="mt-3 text-kiosk-subtle">
                Bitte den Demo-Datensatz und den lokalen Zustand prüfen.
              </p>
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

        <footer className="grid grid-cols-1 gap-2 rounded-lg border border-kiosk-border bg-kiosk-surface px-4 py-2 text-sm text-kiosk-subtle shadow-sm sm:grid-cols-3 sm:items-center">
          <span>Datenstand: {formatTimestamp(state.snapshot?.observedAt ?? null)}</span>
          <span className="sm:text-center">Datensatz: {state.snapshot?.datasetVersion ?? "—"}</span>
          {state.refreshError ? (
            <span role="status" className="font-semibold text-destructive">
              {state.refreshError}
            </span>
          ) : (
            <span className="sm:text-right">
              Letzte Aktualisierung: {formatTimestamp(state.lastRefreshedAt)}
            </span>
          )}
        </footer>
      </div>
    </main>
  );
}
