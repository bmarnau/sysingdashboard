import type { KioskDomainSnapshot, KioskLevel } from "@/lib/kiosk/kiosk-contract";

const LEVEL_LABEL: Record<KioskLevel, string> = {
  ok: "OK",
  warning: "WARNUNG",
  critical: "KRITISCH",
  unknown: "UNBEKANNT",
};

const LEVEL_CLASS: Record<KioskLevel, string> = {
  ok: "border-emerald-500/40 bg-emerald-500/5",
  warning: "border-amber-500/50 bg-amber-500/5",
  critical: "border-destructive/60 bg-destructive/5",
  unknown: "border-muted-foreground/40 bg-muted/30",
};

export interface KioskDomainCardProps {
  domain: KioskDomainSnapshot;
}

function formatMetricValue(value: number | null): string {
  return value === null ? "—" : value.toLocaleString("de-DE");
}

export function KioskDomainCard({ domain }: KioskDomainCardProps) {
  return (
    <article className={`min-h-48 rounded-xl border p-5 shadow-sm ${LEVEL_CLASS[domain.level]}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight">{domain.title}</h2>
        <span className="rounded-full border border-current px-2.5 py-1 text-xs font-semibold">
          {LEVEL_LABEL[domain.level]}
        </span>
      </div>

      {domain.metrics.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {domain.note ?? "Keine Demo-Daten für diesen Bereich"}
        </p>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2">
          {domain.metrics.map((metric) => (
            <div key={`${domain.id}-${metric.label}`} className="rounded-lg bg-background/70 p-3">
              <dt className="text-sm text-muted-foreground">{metric.label}</dt>
              <dd className="mt-1 flex items-baseline justify-between gap-3">
                <span className="text-2xl font-semibold tabular-nums">
                  {formatMetricValue(metric.value)}
                </span>
                <span className="text-xs font-medium">{LEVEL_LABEL[metric.level]}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      {domain.note && domain.metrics.length > 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{domain.note}</p>
      ) : null}
    </article>
  );
}
