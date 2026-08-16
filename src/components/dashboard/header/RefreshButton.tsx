/**
 * Zentraler Daten-Refresh im Dashboard-Header.
 *
 * Kein `window.location.reload()`, kein Provider-Zugriff — ausschließlich
 * die Fassade `useRefresh()`.
 */
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useRefresh } from "@/hooks/useRefresh";

function timeOf(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export function RefreshButton() {
  const { running, lastRefreshedAt, refresh } = useRefresh();
  const last = timeOf(lastRefreshedAt);
  const title = last ? `Daten aktualisieren · Zuletzt aktualisiert: ${last}` : "Daten aktualisieren";

  return (
    <button
      type="button"
      title={title}
      aria-label="Daten aktualisieren"
      aria-busy={running}
      disabled={running}
      suppressHydrationWarning
      onClick={() => {
        void refresh()
          .then((result) => {
            if (result.ok) {
              toast.success("Daten aktualisiert");
              return;
            }
            toast.warning("Teilweise aktualisiert", {
              description: `Nicht aktualisiert: ${result.failed.map((f) => f.label).join(", ")}`,
            });
          })
          .catch(() => toast.error("Aktualisierung nicht möglich"));
      }}
      className="grid size-10 min-h-10 min-w-10 place-items-center rounded-lg border border-border bg-secondary/40 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
    >
      <RefreshCw className={`size-4 ${running ? "animate-spin" : ""}`} aria-hidden="true" />
    </button>
  );
}
