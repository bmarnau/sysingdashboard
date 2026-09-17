import { AlertTriangle, CheckCircle2, CircleGauge, Clock3, ServerCog } from "lucide-react";
import type { ReactNode } from "react";
import type { KioskDomainSnapshot, KioskLevel, KioskMetric } from "@/lib/kiosk/kiosk-contract";

const LEVEL_LABEL: Record<KioskLevel, string> = {
  ok: "OK",
  warning: "Warnung",
  critical: "Kritisch",
  unknown: "Unbekannt",
};

const STATUS_CLASS: Record<KioskLevel, string> = {
  ok: "border-kiosk-success-border bg-kiosk-success-soft text-kiosk-success",
  warning: "border-kiosk-warning-border bg-kiosk-warning-soft text-kiosk-warning",
  critical: "border-kiosk-critical-border bg-kiosk-critical-soft text-kiosk-critical",
  unknown: "border-kiosk-border bg-kiosk-muted text-kiosk-subtle",
};

function value(metric: KioskMetric): string {
  if (metric.value === null) return "—";
  const formatted = metric.value.toLocaleString("de-DE");
  return metric.unit ? `${formatted} ${metric.unit}` : formatted;
}

function MetricTile({ metric, emphasis }: { metric: KioskMetric; emphasis?: KioskLevel }) {
  const visualLevel = emphasis ?? "unknown";
  return (
    <div
      data-emphasis={emphasis ?? "neutral"}
      className={`flex min-h-28 flex-col justify-between rounded-lg border p-4 ${
        emphasis ? STATUS_CLASS[visualLevel] : "border-kiosk-border bg-kiosk-muted text-kiosk-ink"
      }`}
    >
      <dt className="text-base font-semibold text-kiosk-subtle">{metric.label}</dt>
      <dd className="mt-3 text-4xl font-bold tabular-nums text-kiosk-ink">{value(metric)}</dd>
      {metric.level === "unknown" ? (
        <span className="mt-2 text-xs font-bold uppercase text-kiosk-subtle">UNBEKANNT</span>
      ) : null}
    </div>
  );
}

function DomainHeading({ domain }: { domain: KioskDomainSnapshot }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-xl font-bold text-kiosk-ink">{domain.title}</h3>
      {domain.level === "warning" || domain.level === "critical" || domain.level === "unknown" ? (
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${STATUS_CLASS[domain.level]}`}
        >
          {LEVEL_LABEL[domain.level]}
        </span>
      ) : null}
    </div>
  );
}

function OperationalDomain({ domain }: { domain: KioskDomainSnapshot }) {
  const percentage = domain.metrics.find((metric) => metric.unit === "%");
  const regularMetrics = domain.metrics.filter((metric) => metric !== percentage);

  return (
    <article className="border-b border-kiosk-border pb-4 last:border-b-0 last:pb-0">
      <DomainHeading domain={domain} />
      <dl
        className={`mt-3 grid gap-3 ${percentage ? "sm:grid-cols-[1fr_auto]" : "sm:grid-cols-2"}`}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {regularMetrics.map((metric) => (
            <MetricTile
              key={`${domain.id}-${metric.label}`}
              metric={metric}
              emphasis={
                metric.level === "warning" || metric.level === "critical" ? metric.level : undefined
              }
            />
          ))}
        </div>
        {percentage ? (
          <div className="flex min-h-28 items-center gap-4 rounded-lg border border-kiosk-border bg-kiosk-muted px-5 py-3">
            <div className="grid size-20 shrink-0 place-items-center rounded-full border-[7px] border-kiosk-accent-soft bg-kiosk-surface">
              <span className="text-2xl font-bold tabular-nums text-kiosk-ink">
                {value(percentage)}
              </span>
            </div>
            <div>
              <dt className="text-base font-semibold text-kiosk-subtle">{percentage.label}</dt>
              <dd className="mt-1 text-sm text-kiosk-subtle">im Demo-Zeitraum</dd>
            </div>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

function Infrastructure({ domain }: { domain: KioskDomainSnapshot }) {
  return (
    <div className="flex h-full flex-col">
      {domain.level === "unknown" ? (
        <div className="mb-3 rounded-md border border-kiosk-border bg-kiosk-muted px-3 py-2 text-sm font-bold text-kiosk-subtle">
          UNBEKANNT
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-3">
        {domain.metrics.map((metric) => (
          <MetricTile
            key={`${domain.id}-${metric.label}`}
            metric={metric}
            emphasis={metric.level}
          />
        ))}
      </div>
      {domain.rows?.length ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-kiosk-border">
          <table className="w-full border-collapse text-base">
            <caption className="bg-kiosk-muted px-4 py-3 text-left font-bold text-kiosk-ink">
              Status nach Bereichen
            </caption>
            <thead className="border-y border-kiosk-border bg-kiosk-muted text-sm text-kiosk-subtle">
              <tr>
                <th className="px-4 py-2 text-left">Bereich</th>
                <th className="px-2 py-2 text-right">OK</th>
                <th className="px-2 py-2 text-right">Warnung</th>
                <th className="px-4 py-2 text-right">Kritisch</th>
              </tr>
            </thead>
            <tbody>
              {domain.rows.map((row) => (
                <tr key={row.label} className="border-b border-kiosk-border last:border-b-0">
                  <th className="px-4 py-3 text-left font-semibold text-kiosk-ink">{row.label}</th>
                  <td className="px-2 py-3 text-right font-semibold tabular-nums text-kiosk-success">
                    {row.breakdown.ok}
                  </td>
                  <td className="px-2 py-3 text-right font-semibold tabular-nums text-kiosk-warning">
                    {row.breakdown.warning}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-kiosk-critical">
                    {row.breakdown.critical}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="mt-auto flex items-center gap-3 border-t border-kiosk-border pt-4 text-base font-semibold text-kiosk-subtle">
        <ServerCog className="size-5 text-kiosk-accent" aria-hidden="true" />
        Systemverfügbarkeit wird aus dem letzten Demo-Stand angezeigt.
      </div>
    </div>
  );
}

function Support({ domain }: { domain: KioskDomainSnapshot }) {
  return (
    <dl className="grid flex-1 content-stretch gap-3 sm:grid-cols-2 lg:grid-cols-1">
      {domain.metrics.map((metric) => (
        <MetricTile
          key={`${domain.id}-${metric.label}`}
          metric={metric}
          emphasis={metric.label === "Älter" ? "warning" : undefined}
        />
      ))}
    </dl>
  );
}

function PanelHeader({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3 border-b border-kiosk-border pb-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-kiosk-accent-soft text-kiosk-accent">
        {icon}
      </span>
      <div>
        <h2 className="text-xl font-bold text-kiosk-ink">{title}</h2>
        <p className="text-sm font-medium text-kiosk-subtle">Quelle: synthetische Demo-Daten</p>
      </div>
    </div>
  );
}

export function KioskWallboardSections({ domains }: { domains: Map<string, KioskDomainSnapshot> }) {
  const operational = [
    domains.get("projects"),
    domains.get("workPackages"),
    domains.get("activities"),
    domains.get("availability"),
  ].filter((domain): domain is KioskDomainSnapshot => Boolean(domain));
  const infrastructure = domains.get("infrastructure");
  const support = domains.get("support");

  return (
    <section
      aria-label="Kiosk-Domänen"
      data-layout="three-column"
      className="grid flex-1 gap-4 xl:grid-cols-[1.16fr_1fr_0.78fr]"
    >
      <section className="rounded-lg border border-kiosk-border bg-kiosk-surface p-5 shadow-sm">
        <PanelHeader
          title="Operative Arbeit"
          icon={<CircleGauge className="size-5" aria-hidden="true" />}
        />
        <div className="grid gap-4">
          {operational.map((domain) => (
            <OperationalDomain key={domain.id} domain={domain} />
          ))}
        </div>
        <p className="mt-4 rounded-md bg-kiosk-muted px-3 py-2 text-sm font-medium text-kiosk-subtle">
          Keine Gründe oder Gesundheitsdaten
        </p>
      </section>

      <section className="rounded-lg border border-kiosk-border bg-kiosk-surface p-5 shadow-sm">
        <PanelHeader
          title="Infrastruktur – Überblick"
          icon={<CheckCircle2 className="size-5" aria-hidden="true" />}
        />
        {infrastructure ? <Infrastructure domain={infrastructure} /> : null}
        <p className="mt-4 rounded-md bg-kiosk-muted px-3 py-2 text-sm font-medium text-kiosk-subtle">
          Keine produktiven Hostnamen oder IP-Adressen.
        </p>
      </section>

      <section
        aria-label="Support-Postfach"
        className="flex flex-col rounded-lg border border-kiosk-border bg-kiosk-surface p-5 shadow-sm"
      >
        <PanelHeader
          title="Support-Postfach"
          icon={<Clock3 className="size-5" aria-hidden="true" />}
        />
        {support ? <Support domain={support} /> : null}
        <p className="mt-4 flex items-center gap-2 rounded-md bg-kiosk-muted px-3 py-2 text-sm font-medium text-kiosk-subtle">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" /> Nur Mengenansicht. Keine
          Inhaltsanzeige.
        </p>
      </section>
    </section>
  );
}
