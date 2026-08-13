/**
 * Verantwortung — Zuordnungsstatus, ausdrücklich ohne Personenranking.
 */
import type { ResponsibilityOverview } from "@/lib/avkk/management";

export function ResponsibilityPanel({
  overview,
  onSelectUnassigned,
}: {
  overview: ResponsibilityOverview;
  onSelectUnassigned: () => void;
}) {
  return (
    <section aria-labelledby="avkk-responsibility-heading" className="space-y-3">
      <div>
        <h3 id="avkk-responsibility-heading" className="text-sm font-semibold">
          Verantwortung
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Dargestellt wird ausschließlich der Zuordnungsstatus. Es werden keine personenbezogenen
          Ranglisten oder Leistungswerte gebildet.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {[
          ["Mit Verantwortung", overview.assigned],
          ["Ohne Verantwortung", overview.unassigned],
          ["Überfällig mit Verantwortung", overview.overdueWithResponsibility],
          ["Kritisch ohne Zuordnung", overview.criticalWithoutFullResponsibility],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-border bg-secondary/30 p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {overview.unassigned > 0 ? (
        <button
          type="button"
          onClick={onSelectUnassigned}
          className="inline-flex min-h-11 items-center rounded-md border border-border bg-secondary/40 px-3 text-sm hover:bg-secondary"
        >
          Aufgaben ohne Verantwortung anzeigen
        </button>
      ) : null}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground">Verantwortungsarten</h4>
        {overview.types.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">Keine Verantwortungsart erfasst.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {overview.types.map((t) => (
              <li
                key={t.key}
                className="rounded-md border border-border bg-secondary/40 px-2 py-1 text-xs text-muted-foreground"
              >
                {t.label}: <span className="tabular-nums">{t.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
