import { CheckCircle2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSystemStatusHealth } from "@/hooks/useSystemStatusHealth";

/**
 * AzureStatusPanel — Read-only Übersicht des Azure-/ENV-Status.
 *
 * Datenquelle: `/api/status` (bereits secret-frei modelliert). Wird nur
 * beim Öffnen des Dialogs bzw. per manuellem Button aktualisiert. Kein
 * Polling, kein Interval — Regel "keine automatischen Aktionen".
 */
export function AzureStatusPanel() {
  const health = useSystemStatusHealth();
  const azure = health.payload?.azure;
  const security = health.payload?.security;

  const reachable = health.apiReachable !== false;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Azure Status</h3>
          <p className="text-xs text-muted-foreground">
            Aggregiert aus dem Systemstatus (secret-frei). Keine automatischen Abfragen.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={health.refresh}
          disabled={health.inFlight}
        >
          <RefreshCw className={`size-4 ${health.inFlight ? "animate-spin" : ""}`} />
          Status aktualisieren
        </Button>
      </div>

      {!reachable ? (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-warning">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Statusdienst nicht erreichbar</p>
            <p className="text-xs">
              Das Dashboard bleibt uneingeschränkt nutzbar. Azure-Aktionen sind vorsorglich
              deaktiviert, bis der Status wieder verfügbar ist.
            </p>
          </div>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <StatusRow label="Azure erlaubt" ok={azure?.allowed === true} />
        <StatusRow
          label="Auth-Modus"
          ok={!!azure?.authMode && azure?.authMode !== "none"}
          value={azure?.authMode ?? "not configured"}
        />
        <StatusRow label="SQL konfiguriert" ok={azure?.sql?.configured === true} />
        <StatusRow label="Table konfiguriert" ok={azure?.table?.configured === true} />
        <StatusRow label="Storage konfiguriert" ok={azure?.storage?.configured === true} />
        <StatusRow
          label="ENV-Validierung"
          ok={security?.envValidation?.ok === true}
          value={
            security?.envValidation?.ok
              ? "ok"
              : `fehlend: ${(security?.envValidation?.missing ?? []).length}`
          }
        />
      </section>

      {security?.envValidation?.missing && security.envValidation.missing.length > 0 ? (
        <section className="rounded-md border border-warning/40 bg-warning/10 p-3">
          <p className="mb-1 text-xs font-semibold text-warning">
            Fehlende ENV-Variablen (nur Namen, keine Werte):
          </p>
          <div className="flex flex-wrap gap-1">
            {security.envValidation.missing.map((n) => (
              <span
                key={n}
                className="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 font-mono text-xs text-warning"
              >
                {n}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-md border border-border bg-muted/30 p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Letzte Ereignisse</p>
        <ul className="mt-1 space-y-0.5">
          <li>
            Letzter Verbindungstest: {fmt(azure?.lastConnectionTestAt)}
          </li>
          <li>Letzter Export nach Azure: {fmt(health.payload?.data?.lastAzureExportAt)}</li>
          <li>Letzter Import aus Azure: {fmt(health.payload?.data?.lastAzureImportAt)}</li>
        </ul>
      </section>
    </div>
  );
}

function StatusRow({
  label,
  ok,
  value,
}: {
  label: string;
  ok: boolean;
  value?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      {ok ? (
        <span className="inline-flex items-center gap-1 text-success">
          <CheckCircle2 className="size-4" /> {value ?? "configured"}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <XCircle className="size-4" /> {value ?? "Not configured"}
        </span>
      )}
    </div>
  );
}

function fmt(v: string | null | undefined): string {
  if (!v) return "Not configured";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "Not configured" : d.toLocaleString("de-DE");
}
