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

export function KioskView({ state, securityStatus, onLogout }: KioskViewProps) {
  const securityBlocked = securityStatus !== "valid";

  return (
    <main className="min-h-dvh bg-background p-4 text-foreground sm:p-6">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[1920px] flex-col gap-4 sm:min-h-[calc(100dvh-3rem)]">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Sysing Dashboard
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Info-Kiosk</h1>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="rounded-md border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-sm font-bold">
              DEMO-DATEN — KEINE LIVE-DATEN
            </div>
            <Button variant="outline" onClick={onLogout} aria-label="Abmelden">
              <LogOut className="mr-2 size-4" aria-hidden="true" /> Abmelden
            </Button>
          </div>
        </header>

        {securityBlocked ? (
          <section
            role="alert"
            className="grid flex-1 place-items-center rounded-xl border border-amber-500/50 bg-amber-500/5 p-8 text-center"
          >
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold">Sicherheitsprüfung derzeit nicht verfügbar</h2>
              <p className="mt-3 text-muted-foreground">
                Die Kiosk-Sitzung wird erneut geprüft. Bis zur erfolgreichen Bestätigung werden keine
                Managementdaten angezeigt.
              </p>
            </div>
          </section>
        ) : state.status === "loading" ? (
          <section className="grid flex-1 place-items-center rounded-xl border bg-card p-8">
            <p className="text-lg font-medium">Kiosk-Daten werden geladen …</p>
          </section>
        ) : state.status === "error" || !state.snapshot ? (
          <section
            role="alert"
            className="grid flex-1 place-items-center rounded-xl border border-destructive/50 bg-destructive/5 p-8 text-center"
          >
            <div>
              <h2 className="text-2xl font-semibold">Kiosk-Daten konnten nicht geladen werden</h2>
              <p className="mt-3 text-muted-foreground">Bitte den Demo-Datensatz und den lokalen Zustand prüfen.</p>
            </div>
          </section>
        ) : state.snapshot.datasetState === "not_loaded" ? (
          <section className="grid flex-1 place-items-center rounded-xl border bg-card p-8 text-center">
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold">Kiosk-Demodaten sind auf diesem Gerät nicht geladen.</h2>
              <p className="mt-3 text-muted-foreground">
                Ein berechtigter Administrator lädt den synthetischen Kiosk-Datensatz im Servicebereich.
              </p>
            </div>
          </section>
        ) : (
          <section aria-label="Kiosk-Domänen" className="grid flex-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {state.snapshot.domains.map((domain) => (
              <KioskDomainCard key={domain.id} domain={domain} />
            ))}
          </section>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
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
