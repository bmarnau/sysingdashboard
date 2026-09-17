import { Clock3, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InfrastructureColumn,
  OperationsColumn,
  SupportColumn,
} from "@/components/kiosk/KioskWallboardSections";
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

function ColumnHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-kiosk-line pb-2.5">
      <h2 className="text-xl font-bold text-kiosk-ink">{title}</h2>
      <p className="mt-0.5 text-xs font-semibold text-kiosk-copy">
        Quelle: synthetische Demo-Daten
      </p>
    </div>
  );
}

export function KioskView({ state, securityStatus, onLogout }: KioskViewProps) {
  const securityBlocked = securityStatus !== "valid";
  const now = new Date();
  const domains = new Map((state.snapshot?.domains ?? []).map((domain) => [domain.id, domain]));

  return (
    <main className="min-h-dvh bg-kiosk-canvas p-3 text-kiosk-ink lg:h-dvh lg:overflow-hidden">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-[1920px] flex-col gap-3 lg:h-full lg:min-h-0">
        <header className="rounded-md border border-kiosk-line bg-kiosk-surface px-4 py-3 shadow-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 xl:grid-cols-[1fr_1.15fr_1.2fr]">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-kiosk-blue">SYSING / SYSTEMHAUS</p>
              <div className="mt-0.5 flex min-w-0 items-baseline gap-3">
                <h1 className="truncate text-3xl font-bold text-kiosk-ink">Info-Kiosk</h1>
                <span className="shrink-0 text-base font-bold text-kiosk-copy">
                  {greetingFor(now)}
                </span>
              </div>
              <p className="mt-0.5 text-sm font-medium text-kiosk-copy">{formatDayDate(now)}</p>
            </div>

            <div className="hidden min-w-0 border-l border-kiosk-line pl-5 xl:block">
              <h2 className="text-2xl font-bold text-kiosk-ink">Operatives Management-Wallboard</h2>
              <p className="mt-0.5 text-sm font-medium text-kiosk-copy">
                Read-only | Auto-Refresh | Systemhaus
              </p>
            </div>

            <div className="grid justify-items-end gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-md border border-kiosk-line px-2.5 py-1.5 text-xs">
                  <Clock3 className="size-4 text-kiosk-blue" aria-hidden="true" />
                  <span>
                    <strong>Datenstand</strong>
                    <br />
                    {formatTimestamp(state.snapshot?.observedAt ?? null)}
                  </span>
                </div>
                <div className="hidden items-center gap-2 rounded-md border border-kiosk-green/30 bg-kiosk-green-soft px-2.5 py-1.5 text-xs text-kiosk-copy sm:flex">
                  <RefreshCw className="size-4 text-kiosk-green" aria-hidden="true" />
                  <span>
                    <strong className="text-kiosk-ink">Aktuell</strong>
                    <br />
                    automatisch alle 60 Sekunden
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <strong className="rounded-md border border-kiosk-amber/40 bg-kiosk-amber-soft px-3 py-1.5 text-xs text-kiosk-ink">
                  DEMO-DATEN — KEINE LIVE-DATEN
                </strong>
                <Button
                  variant="outline"
                  className="border-kiosk-line bg-kiosk-surface text-kiosk-ink"
                  onClick={onLogout}
                  aria-label="Abmelden"
                >
                  <LogOut aria-hidden="true" /> Abmelden
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-3 border-t border-kiosk-line pt-2 xl:hidden">
            <h2 className="text-xl font-bold text-kiosk-ink">Operatives Management-Wallboard</h2>
            <p className="text-xs font-medium text-kiosk-copy">
              Read-only | Auto-Refresh | Systemhaus
            </p>
          </div>
        </header>

        {securityBlocked ? (
          <section
            role="alert"
            className="grid flex-1 place-items-center rounded-md border border-kiosk-amber/40 bg-kiosk-surface p-8 text-center"
          >
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold">Sicherheitsprüfung derzeit nicht verfügbar</h2>
              <p className="mt-3 text-kiosk-copy">
                Die Kiosk-Sitzung wird erneut geprüft. Bis zur erfolgreichen Bestätigung werden
                keine Managementdaten angezeigt.
              </p>
            </div>
          </section>
        ) : state.status === "loading" ? (
          <section className="grid flex-1 place-items-center rounded-md border border-kiosk-line bg-kiosk-surface p-8">
            <p className="text-lg font-semibold">Kiosk-Daten werden geladen …</p>
          </section>
        ) : state.status === "error" || !state.snapshot ? (
          <section
            role="alert"
            className="grid flex-1 place-items-center rounded-md border border-kiosk-red/40 bg-kiosk-surface p-8 text-center"
          >
            <div>
              <h2 className="text-2xl font-bold">Kiosk-Daten konnten nicht geladen werden</h2>
              <p className="mt-3 text-kiosk-copy">
                Bitte den Demo-Datensatz und den lokalen Zustand prüfen.
              </p>
            </div>
          </section>
        ) : state.snapshot.datasetState === "not_loaded" ? (
          <section className="grid flex-1 place-items-center rounded-md border border-kiosk-line bg-kiosk-surface p-8 text-center">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold">
                Kiosk-Demodaten sind auf diesem Gerät nicht geladen.
              </h2>
              <p className="mt-3 text-kiosk-copy">
                Ein berechtigter Administrator lädt den synthetischen Kiosk-Datensatz im
                Servicebereich.
              </p>
            </div>
          </section>
        ) : (
          <section
            aria-label="Kiosk-Domänen"
            className="grid flex-1 min-h-0 gap-3 lg:grid-cols-[1.08fr_1fr_0.82fr]"
          >
            <section className="min-w-0 overflow-hidden rounded-md border border-kiosk-line bg-kiosk-surface p-3 shadow-sm">
              <ColumnHeader title="Operative Arbeit" />
              <OperationsColumn
                projects={domains.get("projects")}
                workPackages={domains.get("workPackages")}
                activities={domains.get("activities")}
                availability={domains.get("availability")}
              />
            </section>
            <section className="min-w-0 overflow-hidden rounded-md border border-kiosk-line bg-kiosk-surface p-3 shadow-sm">
              <ColumnHeader title="Infrastruktur – Überblick" />
              <div className="mt-3">
                <InfrastructureColumn domain={domains.get("infrastructure")} />
              </div>
            </section>
            <section
              aria-label="Support-Postfach"
              className="min-w-0 overflow-hidden rounded-md border border-kiosk-line bg-kiosk-surface p-3 shadow-sm"
            >
              <ColumnHeader title="Support-Postfach" />
              <div className="mt-3">
                <SupportColumn domain={domains.get("support")} />
              </div>
              <p className="mt-3 rounded-md bg-kiosk-blue-soft px-3 py-2 text-xs font-semibold text-kiosk-copy">
                Nur Mengenansicht. Keine Inhaltsanzeige.
              </p>
            </section>
          </section>
        )}

        <footer className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-kiosk-line px-2 py-1 text-xs font-medium text-kiosk-copy sm:flex sm:justify-between">
          <span>Operatives Management-Wallboard · SYSING / SYSTEMHAUS</span>
          <span>Datensatz {state.snapshot?.datasetVersion ?? "—"}</span>
          {state.refreshError ? (
            <span role="status" className="font-bold text-kiosk-red">
              {state.refreshError}
            </span>
          ) : (
            <span className="hidden sm:inline">
              Letzte Aktualisierung: {formatTimestamp(state.lastRefreshedAt)}
            </span>
          )}
        </footer>
      </div>
    </main>
  );
}
