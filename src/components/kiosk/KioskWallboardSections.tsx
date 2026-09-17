import {
  Activity,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  Mail,
  Server,
  ShieldAlert,
} from "lucide-react";
import type { ComponentType } from "react";
import type { KioskDomainSnapshot, KioskLevel, KioskMetric } from "@/lib/kiosk/kiosk-contract";

const LEVEL_TEXT: Record<KioskLevel, string> = {
  ok: "OK",
  warning: "WARNUNG",
  critical: "KRITISCH",
  unknown: "UNBEKANNT",
};

const LEVEL_DOT: Record<KioskLevel, string> = {
  ok: "bg-kiosk-green",
  warning: "bg-kiosk-amber",
  critical: "bg-kiosk-red",
  unknown: "bg-kiosk-copy",
};

const METRIC_SURFACE: Record<KioskLevel, string> = {
  ok: "border-kiosk-green/25 bg-kiosk-green-soft",
  warning: "border-kiosk-amber/25 bg-kiosk-amber-soft",
  critical: "border-kiosk-red/25 bg-kiosk-red-soft",
  unknown: "border-kiosk-line bg-kiosk-canvas",
};

function formatValue(metric: KioskMetric): string {
  if (metric.value === null) return "—";
  const value = metric.value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
  return metric.unit ? `${value} ${metric.unit}` : value;
}

function valueFor(domain: KioskDomainSnapshot | undefined, label: string): KioskMetric | undefined {
  return domain?.metrics.find((metric) => metric.label === label);
}

function DomainHeading({
  icon: Icon,
  title,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-kiosk-blue-soft text-kiosk-blue">
        <Icon className="size-5" aria-hidden={true} />
      </span>
      <h3 className="text-lg font-bold text-kiosk-ink">{title}</h3>
    </div>
  );
}

function EmptyDomain({ title }: { title: string }) {
  return (
    <div className="border-b border-kiosk-line py-3 last:border-b-0">
      <h3 className="text-lg font-bold text-kiosk-ink">{title}</h3>
      <p className="mt-2 text-sm font-semibold text-kiosk-copy">Keine Demo-Daten für diesen Bereich</p>
    </div>
  );
}

function OperationalSummary({
  domain,
  icon,
}: {
  domain: KioskDomainSnapshot | undefined;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}) {
  if (!domain || domain.metrics.length === 0) return <EmptyDomain title={domain?.title ?? "Bereich"} />;
  const primary = domain.metrics[0];
  if (!primary) return <EmptyDomain title={domain.title} />;
  const total = domain.metrics.reduce((sum, metric) => sum + (metric.value ?? 0), 0);
  const okValue = domain.metrics.find((metric) => metric.level === "ok")?.value ?? 0;
  const progress = total > 0 ? Math.min(100, Math.round((okValue / total) * 100)) : 0;

  return (
    <article className="border-b border-kiosk-line py-3 last:border-b-0">
      <DomainHeading icon={icon} title={domain.title} />
      <div className="mt-2 grid grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] items-end gap-4">
        <div className="min-w-0">
          <p className="text-4xl font-bold tabular-nums text-kiosk-ink">{formatValue(primary)}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-kiosk-line">
            <div className="h-full rounded-full bg-kiosk-green" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs font-semibold text-kiosk-copy">{progress} % im Plan</p>
        </div>
        <dl className="grid gap-1.5">
          {domain.metrics.slice(1).map((metric) => (
            <div key={metric.label} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
              <span className={`size-2.5 rounded-full ${LEVEL_DOT[metric.level]}`} aria-hidden="true" />
              <div className="flex min-w-0 items-baseline justify-between gap-2 text-sm">
                <dt className="truncate font-medium text-kiosk-copy">{metric.label}</dt>
                <dd className="shrink-0 font-bold tabular-nums text-kiosk-ink">{formatValue(metric)}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}

function VacationAndBillable({
  availability,
  activities,
}: {
  availability: KioskDomainSnapshot | undefined;
  activities: KioskDomainSnapshot | undefined;
}) {
  const billable = valueFor(activities, "Abrechenbarer Anteil");
  return (
    <div className="grid grid-cols-[1.05fr_0.95fr] gap-3 pt-3">
      <article className="rounded-md border border-kiosk-amber/25 bg-kiosk-amber-soft p-3">
        <DomainHeading icon={CalendarDays} title="Urlaub (Mitarbeiter)" />
        <dl className="mt-3 grid grid-cols-2 divide-x divide-kiosk-line">
          {(availability?.metrics ?? []).slice(0, 2).map((metric) => (
            <div key={metric.label} className="px-2 first:pl-0 last:pr-0">
              <dt className="min-h-9 text-xs font-semibold text-kiosk-copy">{metric.label}</dt>
              <dd className="text-3xl font-bold tabular-nums text-kiosk-ink">{formatValue(metric)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs font-medium text-kiosk-copy">Keine personenbezogenen Daten</p>
      </article>
      <article className="rounded-md border border-kiosk-green/25 bg-kiosk-green-soft p-3">
        <DomainHeading icon={Activity} title="Abrechenbarer Anteil" />
        <div className="mt-3 flex items-center gap-3">
          <div
            className="grid size-20 shrink-0 place-items-center rounded-full"
            style={{
              background: `conic-gradient(var(--color-kiosk-green) ${billable?.value ?? 0}%, var(--color-kiosk-line) 0)`,
            }}
          >
            <div className="grid size-14 place-items-center rounded-full bg-kiosk-surface text-xl font-bold text-kiosk-ink">
              {billable ? formatValue(billable) : "—"}
            </div>
          </div>
          <div className="text-sm font-semibold text-kiosk-copy">
            <p className="text-kiosk-green">Abrechenbar</p>
            <p className="mt-2">Nicht abrechenbar</p>
          </div>
        </div>
      </article>
    </div>
  );
}

export function OperationsColumn({
  projects,
  workPackages,
  activities,
  availability,
}: {
  projects: KioskDomainSnapshot | undefined;
  workPackages: KioskDomainSnapshot | undefined;
  activities: KioskDomainSnapshot | undefined;
  availability: KioskDomainSnapshot | undefined;
}) {
  return (
    <div className="divide-y divide-kiosk-line">
      <OperationalSummary domain={projects} icon={BriefcaseBusiness} />
      <OperationalSummary domain={workPackages} icon={Check} />
      <OperationalSummary domain={activities} icon={Activity} />
      <VacationAndBillable availability={availability} activities={activities} />
    </div>
  );
}

function statusFor(row: NonNullable<KioskDomainSnapshot["rows"]>[number]): KioskLevel {
  if (row.breakdown.critical > 0) return "critical";
  if (row.breakdown.warning > 0) return "warning";
  return "ok";
}

export function InfrastructureColumn({ domain }: { domain: KioskDomainSnapshot | undefined }) {
  if (!domain || domain.metrics.length === 0) return <EmptyDomain title="Infrastruktur" />;
  const total = domain.metrics.reduce((sum, metric) => sum + (metric.value ?? 0), 0);
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {domain.metrics.slice(0, 3).map((metric) => {
          const share = total > 0 && metric.value !== null ? Math.round((metric.value / total) * 100) : 0;
          return (
            <article key={metric.label} className={`rounded-md border p-3 ${METRIC_SURFACE[metric.level]}`}>
              <p className="text-3xl font-bold tabular-nums text-kiosk-ink">{formatValue(metric)}</p>
              <p className="mt-0.5 text-sm font-bold text-kiosk-ink">{metric.label}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-kiosk-copy">{share} %</p>
            </article>
          );
        })}
      </div>

      <div className="mt-3 overflow-hidden rounded-md border border-kiosk-line">
        <div className="flex items-center gap-2 bg-kiosk-blue-soft px-3 py-2">
          <Server className="size-4 text-kiosk-blue" aria-hidden="true" />
          <h3 className="text-sm font-bold text-kiosk-ink">Status nach Bereichen</h3>
        </div>
        <table className="w-full table-fixed text-sm">
          <thead className="bg-kiosk-canvas text-xs font-bold text-kiosk-copy">
            <tr>
              <th className="px-3 py-2 text-left">Bereich</th>
              <th className="px-2 py-2 text-center">OK</th>
              <th className="px-2 py-2 text-center">Warnung</th>
              <th className="px-2 py-2 text-center">Kritisch</th>
              <th className="px-2 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kiosk-line">
            {(domain.rows ?? []).map((row) => {
              const level = statusFor(row);
              return (
                <tr key={row.label}>
                  <th className="px-3 py-2 text-left font-semibold text-kiosk-ink">{row.label}</th>
                  <td className="px-2 py-2 text-center tabular-nums text-kiosk-copy">{row.breakdown.ok}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-kiosk-copy">{row.breakdown.warning}</td>
                  <td className="px-2 py-2 text-center tabular-nums text-kiosk-copy">{row.breakdown.critical}</td>
                  <td className="px-2 py-2 text-center">
                    <span className={`inline-block size-3 rounded-full ${LEVEL_DOT[level]}`}>
                      <span className="sr-only">{LEVEL_TEXT[level]}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <article className="mt-3 rounded-md border border-kiosk-line p-3">
        <DomainHeading icon={ShieldAlert} title="Verfügbarkeit (Systeme)" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-3 rounded-md bg-kiosk-green-soft p-3">
            <Check className="size-7 text-kiosk-green" aria-hidden="true" />
            <div><p className="text-xs font-semibold text-kiosk-copy">Verfügbar</p><p className="text-2xl font-bold text-kiosk-ink">9</p></div>
          </div>
          <div className="flex items-center gap-3 rounded-md bg-kiosk-red-soft p-3">
            <CircleAlert className="size-7 text-kiosk-red" aria-hidden="true" />
            <div><p className="text-xs font-semibold text-kiosk-copy">Nicht verfügbar</p><p className="text-2xl font-bold text-kiosk-ink">2</p></div>
          </div>
        </div>
      </article>
      <p className="mt-3 text-xs font-medium text-kiosk-copy">{domain.note}</p>
    </div>
  );
}

const SUPPORT_ICONS = [Mail, Activity, CalendarDays, Clock3];
const SUPPORT_BARS = [35, 52, 42, 66, 48, 74, 58, 82];

export function SupportColumn({ domain }: { domain: KioskDomainSnapshot | undefined }) {
  if (!domain || domain.metrics.length === 0) return <EmptyDomain title="Support-Postfach" />;
  return (
    <div className="grid gap-3">
      {domain.metrics.slice(0, 4).map((metric, index) => {
        const Icon = SUPPORT_ICONS[index] ?? Mail;
        return (
          <article key={metric.label} className={`rounded-md border p-4 ${METRIC_SURFACE[metric.level]}`}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="size-5 shrink-0 text-kiosk-blue" aria-hidden="true" />
                  <h3 className="truncate text-base font-bold text-kiosk-ink">{metric.label}</h3>
                </div>
                <p className="mt-2 text-4xl font-bold tabular-nums text-kiosk-ink">{formatValue(metric)}</p>
                <p className="mt-1 text-xs font-medium text-kiosk-copy">
                  {index === 0 ? "Alle E-Mails im Posteingang" : index === 1 ? "E-Mails seit 0:00 Uhr" : index === 2 ? "E-Mails von gestern" : "E-Mails älter als 24 Stunden"}
                </p>
              </div>
              <div className="flex h-12 items-end gap-1" aria-hidden="true">
                {SUPPORT_BARS.map((height, barIndex) => (
                  <span key={barIndex} className="w-2 rounded-sm bg-kiosk-blue/55" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}