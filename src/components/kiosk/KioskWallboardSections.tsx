import { AlertTriangle, CheckCircle2, CircleGauge, Clock3 } from "lucide-react";
import type { ReactNode } from "react";
import type {
  KioskDomainSnapshot,
  KioskLevel,
  KioskMetric,
  KioskSourceKind,
} from "@/lib/kiosk/kiosk-contract";

const SOURCE_LABEL: Record<KioskSourceKind, string> = {
  demo: "DEMO",
  internal: "INTERN",
  unavailable: "NICHT VERFÜGBAR",
};

const SOURCE_CLASS: Record<KioskSourceKind, string> = {
  demo: "border-kiosk-warning-border bg-kiosk-warning-soft text-kiosk-warning",
  internal: "border-kiosk-accent bg-kiosk-accent-soft text-kiosk-accent",
  unavailable: "border-kiosk-border bg-kiosk-muted text-kiosk-subtle",
};

const SOURCE_BADGE_CLASS = "rounded-full border px-2.5 py-1 text-xs font-bold uppercase";

function domainSourceKind(domain: KioskDomainSnapshot): KioskSourceKind {
  return domain.sourceKind ?? "demo";
}

function formatObservedAt(value: string | null | undefined): string {
  if (!value) return "unbekannt";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "unbekannt" : date.toLocaleString("de-DE");
}

function panelSourceDescription(domains: readonly KioskDomainSnapshot[]): string {
  const kinds = new Set(domains.map(domainSourceKind));
  if (kinds.size > 1) return "Quellen je Bereich gekennzeichnet";
  const kind = [...kinds][0] ?? "demo";
  if (kind === "internal") return "Quelle: interne Read-Daten";
  if (kind === "unavailable") return "Quelle: nicht verfügbar";
  return "Quelle: synthetische Demo-Daten";
}

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
      className={`flex min-h-28 flex-col justify-between rounded-lg border p-4 2xl:min-h-24 2xl:p-3 ${
        emphasis ? STATUS_CLASS[visualLevel] : "border-kiosk-border bg-kiosk-muted text-kiosk-ink"
      }`}
    >
      <p className="text-base font-semibold text-kiosk-subtle">{metric.label}</p>
      <p className="mt-3 text-4xl font-bold tabular-nums text-kiosk-ink 2xl:mt-2">
        {value(metric)}
      </p>
      {metric.level === "unknown" ? (
        <span className="mt-2 text-xs font-bold uppercase text-kiosk-subtle">UNBEKANNT</span>
      ) : null}
    </div>
  );
}

function DomainHeading({ domain }: { domain: KioskDomainSnapshot }) {
  const sourceKind = domainSourceKind(domain);

  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-xl font-bold text-kiosk-ink">{domain.title}</h3>
        <p className="mt-1 text-xs font-medium text-kiosk-subtle">
          Datenstand: {formatObservedAt(domain.observedAt)}
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${SOURCE_CLASS[sourceKind]}`}
        >
          {SOURCE_LABEL[sourceKind]}
        </span>
        {domain.level === "warning" || domain.level === "critical" || domain.level === "unknown" ? (
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${STATUS_CLASS[domain.level]}`}
          >
            {LEVEL_LABEL[domain.level]}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function OperationalDomain({ domain }: { domain: KioskDomainSnapshot }) {
  const isAvailability = domain.id === "availability";
  const percentage = domain.metrics.find((metric) => metric.unit === "%");
  const regularMetrics = domain.metrics.filter((metric) => metric !== percentage);
  const primaryMetric = regularMetrics[0];
  const detailMetrics = regularMetrics.slice(1);
  const usesProgressBar = domain.id === "projects" || domain.id === "workPackages";

  return (
    <article className="border-b border-kiosk-border pb-4 last:border-b-0 last:pb-0 2xl:pb-2">
      <DomainHeading domain={domain} />
      {isAvailability ? (
        <div
          data-layout="equal-vacation-cards"
          className="mt-3 grid grid-cols-2 gap-3 2xl:mt-2 2xl:gap-2"
        >
          {domain.metrics.map((metric) => (
            <div
              key={`${domain.id}-${metric.label}`}
              className="flex min-h-24 flex-col justify-between rounded-lg border border-kiosk-border bg-kiosk-muted px-4 py-3 2xl:min-h-20 2xl:py-2"
            >
              <p className="text-sm font-semibold text-kiosk-subtle">{metric.label}</p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-kiosk-ink">
                {value(metric)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`mt-3 grid gap-3 2xl:mt-2 2xl:gap-2 ${percentage ? "2xl:grid-cols-[0.7fr_1fr]" : "2xl:grid-cols-2"}`}
        >
          {primaryMetric ? (
            <div className="rounded-lg border border-kiosk-border bg-kiosk-muted px-4 py-3 2xl:py-2">
              <p className="text-sm font-semibold text-kiosk-subtle">{primaryMetric.label}</p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-kiosk-ink">
                {value(primaryMetric)}
              </p>
            </div>
          ) : null}
          {percentage ? (
            <div className="rounded-lg border border-kiosk-border bg-kiosk-muted px-4 py-3 2xl:py-2">
              {usesProgressBar ? (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold text-kiosk-subtle">{percentage.label}</p>
                    <p className="text-2xl font-bold tabular-nums text-kiosk-ink">
                      {value(percentage)}
                    </p>
                  </div>
                  <progress
                    aria-label={`${domain.title}: ${percentage.label}`}
                    max={100}
                    value={Math.min(100, Math.max(0, percentage.value ?? 0))}
                    className="mt-3 h-2.5 w-full overflow-hidden rounded-full accent-kiosk-accent 2xl:mt-2"
                  />
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="grid size-16 shrink-0 place-items-center rounded-full border-[6px] border-kiosk-accent-soft bg-kiosk-surface">
                    <p className="text-xl font-bold tabular-nums text-kiosk-ink">
                      {value(percentage)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-kiosk-subtle">{percentage.label}</p>
                </div>
              )}
            </div>
          ) : null}
          {detailMetrics.length ? (
            <div className="grid gap-2 2xl:col-span-2 2xl:grid-cols-2">
              {detailMetrics.map((metric) => (
                <div
                  key={`${domain.id}-${metric.label}`}
                  data-emphasis={
                    metric.level === "warning" || metric.level === "critical"
                      ? metric.level
                      : "neutral"
                  }
                  className={`flex items-center justify-between rounded-md border px-3 py-2 2xl:py-1.5 ${
                    metric.level === "warning" || metric.level === "critical"
                      ? STATUS_CLASS[metric.level]
                      : "border-kiosk-border bg-kiosk-muted text-kiosk-ink"
                  }`}
                >
                  <p className="text-sm font-semibold">{metric.label}</p>
                  <p className="text-xl font-bold tabular-nums">{value(metric)}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
      {domain.note &&
      (domain.sourceKind === "unavailable" ||
        (domain.sourceKind === "internal" && domain.observedAt === null)) ? (
        <p className="mt-3 rounded-md bg-kiosk-muted px-3 py-2 text-sm font-medium text-kiosk-subtle">
          {domain.note}
        </p>
      ) : null}
    </article>
  );
}

function Infrastructure({ domain }: { domain: KioskDomainSnapshot }) {
  const statusMetrics = domain.metrics.filter(
    (metric) => domain.level === "unknown" || ["OK", "Warnung", "Kritisch"].includes(metric.label),
  );
  const availabilityMetrics = domain.metrics.filter((metric) =>
    ["Verfügbar", "Nicht verfügbar"].includes(metric.label),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {domain.level === "unknown" ? (
        <div className="mb-3 rounded-md border border-kiosk-border bg-kiosk-muted px-3 py-2 text-sm font-bold text-kiosk-subtle">
          UNBEKANNT
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-3 2xl:gap-2">
        {statusMetrics.map((metric) => (
          <MetricTile
            key={`${domain.id}-${metric.label}`}
            metric={metric}
            emphasis={metric.level}
          />
        ))}
      </div>
      {domain.rows?.length ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-kiosk-border 2xl:mt-3">
          <table className="w-full border-collapse text-base">
            <caption className="bg-kiosk-muted px-4 py-3 text-left font-bold text-kiosk-ink 2xl:py-2">
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
                  <th className="px-4 py-3 text-left font-semibold text-kiosk-ink 2xl:py-2">
                    {row.label}
                  </th>
                  <td className="px-2 py-3 text-right font-semibold tabular-nums text-kiosk-success 2xl:py-2">
                    {row.breakdown.ok}
                  </td>
                  <td className="px-2 py-3 text-right font-semibold tabular-nums text-kiosk-warning 2xl:py-2">
                    {row.breakdown.warning}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-kiosk-critical 2xl:py-2">
                    {row.breakdown.critical}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {availabilityMetrics.length ? (
        <div className="mt-4 border-t border-kiosk-border pt-4 2xl:mt-3 2xl:pt-3">
          <h3 className="text-lg font-bold text-kiosk-ink">Verfügbarkeit (Systeme)</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 2xl:mt-2 2xl:gap-2">
            {availabilityMetrics.map((metric) => (
              <div
                key={`${domain.id}-${metric.label}`}
                className={`rounded-lg border px-4 py-3 2xl:py-2 ${STATUS_CLASS[metric.level]}`}
              >
                <p className="text-sm font-semibold">{metric.label}</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-kiosk-ink">
                  {value(metric)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <KioskExtensionArea />
    </div>
  );
}

function KioskExtensionArea() {
  return <div aria-hidden="true" data-kiosk-extension-area="reserved" className="min-h-0 flex-1" />;
}

function Support({ domain }: { domain: KioskDomainSnapshot }) {
  return (
    <div className="grid flex-1 content-stretch gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:gap-2">
      {domain.metrics.map((metric) => {
        const emphasis = metric.label === "Älter" ? "warning" : undefined;
        return (
          <div
            key={`${domain.id}-${metric.label}`}
            data-emphasis={emphasis ?? "neutral"}
            className={`grid min-h-28 grid-cols-[minmax(0,1fr)_7rem] items-center gap-3 rounded-lg border p-4 2xl:min-h-24 2xl:p-3 ${
              emphasis
                ? STATUS_CLASS[emphasis]
                : "border-kiosk-border bg-kiosk-muted text-kiosk-ink"
            }`}
          >
            <div className="min-w-0" data-emphasis={emphasis ?? "neutral"}>
              <p className="text-sm font-semibold text-kiosk-subtle">{metric.label}</p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-kiosk-ink">
                {value(metric)}
              </p>
              <p className="mt-1 text-xs text-kiosk-subtle">Mengenentwicklung, 7 Demo-Stände</p>
            </div>
            <TrendBars label={metric.label} values={metric.trend} />
          </div>
        );
      })}
    </div>
  );
}

function TrendBars({ label, values = [] }: { label: string; values?: number[] }) {
  const max = Math.max(...values, 1);

  return (
    <svg
      role="img"
      aria-label={`${label}: synthetischer Verlauf`}
      viewBox="0 0 112 56"
      preserveAspectRatio="none"
      className="h-14 w-28 text-kiosk-accent"
    >
      {values.map((trendValue, index) => {
        const height = Math.max(5, (trendValue / max) * 52);
        return (
          <rect
            key={`${label}-${index}`}
            x={index * 16 + 2}
            y={54 - height}
            width="10"
            height={height}
            rx="2"
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
}

function PanelHeader({
  title,
  icon,
  domains,
}: {
  title: string;
  icon: ReactNode;
  domains: readonly KioskDomainSnapshot[];
}) {
  const singleSource = domains.length === 1 ? domainSourceKind(domains[0]) : null;

  return (
    <div className="mb-4 flex items-center gap-3 border-b border-kiosk-border pb-3 2xl:mb-2 2xl:pb-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-kiosk-accent-soft text-kiosk-accent">
        {icon}
      </span>
      <div>
        <h2 className="text-xl font-bold text-kiosk-ink">{title}</h2>
        <p className="text-sm font-medium text-kiosk-subtle">{panelSourceDescription(domains)}</p>
      </div>
      {singleSource ? (
        <span
          className={`${SOURCE_BADGE_CLASS} ml-auto ${SOURCE_CLASS[singleSource]}`}
        >
          {SOURCE_LABEL[singleSource]}
        </span>
      ) : null}
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
      className="grid flex-1 gap-4 xl:grid-cols-[1.16fr_1fr_0.78fr] 2xl:gap-3"
    >
      <section className="flex min-h-0 flex-col rounded-lg border border-kiosk-border bg-kiosk-surface p-5 shadow-sm 2xl:p-3">
        <PanelHeader
          title="Operative Arbeit"
          icon={<CircleGauge className="size-5" aria-hidden="true" />}
          domains={operational}
        />
        <div className="grid gap-4 2xl:gap-2">
          {operational.map((domain) => (
            <OperationalDomain key={domain.id} domain={domain} />
          ))}
        </div>
        <p className="mt-4 rounded-md bg-kiosk-muted px-3 py-2 text-sm font-medium text-kiosk-subtle 2xl:mt-2 2xl:py-1.5">
          Keine Gründe oder Gesundheitsdaten
        </p>
      </section>

      <section className="rounded-lg border border-kiosk-border bg-kiosk-surface p-5 shadow-sm 2xl:p-3">
        <PanelHeader
          title="Infrastruktur – Überblick"
          icon={<CheckCircle2 className="size-5" aria-hidden="true" />}
          domains={infrastructure ? [infrastructure] : []}
        />
        {infrastructure ? <Infrastructure domain={infrastructure} /> : null}
        <p className="mt-4 rounded-md bg-kiosk-muted px-3 py-2 text-sm font-medium text-kiosk-subtle 2xl:mt-2 2xl:py-1.5">
          Keine produktiven Hostnamen oder IP-Adressen. Nur aggregierte Demo-Statusdaten.
        </p>
      </section>

      <section
        aria-label="Support-Postfach"
        className="flex flex-col rounded-lg border border-kiosk-border bg-kiosk-surface p-5 shadow-sm 2xl:p-3"
      >
        <PanelHeader
          title="Support-Postfach"
          icon={<Clock3 className="size-5" aria-hidden="true" />}
          domains={support ? [support] : []}
        />
        {support ? <Support domain={support} /> : null}
        <p className="mt-4 flex items-center gap-2 rounded-md bg-kiosk-muted px-3 py-2 text-sm font-medium text-kiosk-subtle 2xl:mt-2 2xl:py-1.5">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" /> Nur Mengenansicht. Keine
          Inhaltsanzeige.
        </p>
      </section>
    </section>
  );
}
