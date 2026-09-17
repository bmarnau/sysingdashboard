import type {
  KioskDomainSnapshot,
  KioskLevel,
  KioskMetric,
} from "@/lib/kiosk/kiosk-contract";

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

function formatMetricValue(metric: KioskMetric): string {
  if (metric.value === null) return "—";

  const value = metric.value.toLocaleString("de-DE");
  return metric.unit ? `${value} ${metric.unit}` : value;
}

export function KioskDomainCard({ domain }: KioskDomainCardProps) {
  return (
    <article className={`min-h-48 rounded-xl border p-4 shadow-sm ${LEVEL_CLASS[domain.level]}`}>
      <div className="mb-3 flex items-start justify-between gap-4">
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
        <dl className="grid gap-2 sm:grid-cols-2">
          {domain.metrics.map((metric) => (
            <div
              key={`${domain.id}-${metric.label}`}
              className="rounded-lg border border-slate-200/80 bg-white/80 p-3"
            >
              <dt className="text-sm font-medium text-slate-600">{metric.label}</dt>
              <dd className="mt-1 flex items-baseline justify-between gap-3">
                <span className="text-3xl font-bold tabular-nums text-slate-950">
                  {formatMetricValue(metric)}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {LEVEL_LABEL[metric.level]}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      {domain.rows && domain.rows.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white/80">
          <table className="w-full border-collapse text-sm">
            <caption className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">
              Status nach Bereichen
            </caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Bereich</th>
                <th className="px-2 py-2 text-right font-semibold">OK</th>
                <th className="px-2 py-2 text-right font-semibold">Warnung</th>
                <th className="px-3 py-2 text-right font-semibold">Kritisch</th>
              </tr>
            </thead>
            <tbody>
              {domain.rows.map((row) => (
                <tr key={`${domain.id}-${row.label}`} className="border-t border-slate-100">
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">{row.label}</th>
                  <td className="px-2 py-2 text-right tabular-nums">{row.breakdown.ok}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{row.breakdown.warning}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.breakdown.critical}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {domain.note && domain.metrics.length > 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{domain.note}</p>
      ) : null}
    </article>
  );
}
