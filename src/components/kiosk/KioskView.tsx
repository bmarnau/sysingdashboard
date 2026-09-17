import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KioskDomainCard } from "@/components/kiosk/KioskDomainCard";
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
  const projects = domains.get("projects");
  const workPackages = domains.get("workPackages");
  const activities = domains.get("activities");
  const availability = domains.get("availability");
  const infrastructure = domains.get("infrastructure");
  const support = domains.get("support");

  return (
    <main className="min-h-dvh bg-slate-50 p-4 text-slate-950 sm:p-6">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[1920px] flex-col gap-4 sm:min-h-[calc(100dvh-3rem)]">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                SYSING / SYSTEMHAUS
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Info-Kiosk</h1>
                <span className="text-lg font-semibold text-slate-600">{greetingFor(now)}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-slate-500">{formatDayDate(now)}</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="rounded-md border border-amber-500/60 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-950">
                DEMO-DATEN — KEINE LIVE-DATEN
              </div>
              <Button
                variant="outline"
                className="bg-white text-slate-900"
                onClick={onLogout}
                aria-label="Abmelden"
              >
                <LogOut className="mr-2 size-4" aria-hidden="true" /> Abmelden
              </Button>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Operatives Management-Wallboard
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Read-only | Auto-Refresh | Systemhaus
            </p>
          </div>
        </header>

        {securityBlocked ? (
          <section
            role="alert"
            className="grid flex-1 place-items-center rounded-2xl border border-amber-300 bg-white p-8 text-center shadow-sm"
          >
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold">Sicherheitsprüfung derzeit nicht verfügbar</h2>
              <p className="mt-3 text-slate-600">
                Die Kiosk-Sitzung wird erneut geprüft. Bis zur erfolgreichen Bestätigung werden
                keine Managementdaten angezeigt.
              </p>
            </div>
          </section>
        ) : state.status === "loading" ? (
          <section className="grid flex-1 place-items-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium">Kiosk-Daten werden geladen …</p>
          </section>
        ) : state.status === "error" || !state.snapshot ? (
          <section
            role="alert"
            className="grid flex-1 place-items-center rounded-2xl border border-destructive/50 bg-white p-8 text-center shadow-sm"
          >
            <div>
              <h2 className="text-2xl font-semibold">Kiosk-Daten konnten nicht geladen werden</h2>
              <p className="mt-3 text-slate-600">
                Bitte den Demo-Datensatz und den lokalen Zustand prüfen.
              </p>
            </div>
          </section>
        ) : state.snapshot.datasetState === "not_loaded" ? (
          <section className="grid flex-1 place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold">
                Kiosk-Demodaten sind auf diesem Gerät nicht geladen.
              </h2>
              <p className="mt-3 text-slate-600">
                Ein berechtigter Administrator lädt den synthetischen Kiosk-Datensatz im
                Servicebereich.
              </p>
            </div>
          </section>
        ) : (
          <section
            aria-label="Kiosk-Domänen"
            className="grid flex-1 gap-4 lg:grid-cols-[1.15fr_1fr_0.9fr]"
          >
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 border-b border-slate-200 pb-3">
                <h2 className="text-xl font-bold tracking-tight">Operative Arbeit</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Quelle: synthetische Demo-Daten
                </p>
              </div>
              <div className="grid gap-3">
                {projects ? <KioskDomainCard domain={projects} /> : null}
                {workPackages ? <KioskDomainCard domain={workPackages} /> : null}
                {activities ? <KioskDomainCard domain={activities} /> : null}
                {availability ? <KioskDomainCard domain={availability} /> : null}
              </div>
              <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                Keine Gründe oder Gesundheitsdaten
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 border-b border-slate-200 pb-3">
                <h2 className="text-xl font-bold tracking-tight">Infrastruktur – Überblick</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Quelle: synthetische Demo-Daten
                </p>
              </div>
              <div className="grid gap-3">
                {infrastructure ? <KioskDomainCard domain={infrastructure} /> : null}
              </div>
              <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                Keine produktiven Hostnamen oder IP-Adressen.
              </p>
            </section>

            <section
              aria-label="Support-Postfach"
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 border-b border-slate-200 pb-3">
                <p className="text-xl font-bold tracking-tight">Support-Postfach</p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Quelle: synthetische Demo-Daten
                </p>
              </div>
              {support ? <KioskDomainCard domain={support} /> : null}
              <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                Nur Mengenansicht. Keine Inhaltsanzeige.
              </p>
            </section>
          </section>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
          <span>Datenstand: {formatTimestamp(state.snapshot?.observedAt ?? null)}</span>
          <span>Datensatz: {state.snapshot?.datasetVersion ?? "—"}</span>
          {state.refreshError ? (
            <span role="status" className="font-semibold text-destructive">
              {state.refreshError}
            </span>
          ) : (
            <span>Letzte Aktualisierung: {formatTimestamp(state.lastRefreshedAt)}</span>
          )}
        </footer>
      </div>
    </main>
  );
}
