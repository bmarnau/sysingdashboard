/**
 * Verteilungsdiagramme als barrierefreie Balkenlisten (Wert immer als Text).
 * Bewusst ohne Diagrammbibliothek — kein zusätzliches Bundle, druckbar.
 */
export function DistributionPanel({
  title,
  data,
}: {
  title: string;
  data: readonly { label: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <h4 className="text-xs font-semibold text-muted-foreground">{title}</h4>
      {data.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Keine Daten in der Auswahl.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {data.map((d) => (
            <li
              key={d.label}
              className="grid grid-cols-[minmax(6rem,10rem)_1fr_2.5rem] items-center gap-2"
            >
              <span className="truncate text-xs">{d.label}</span>
              <span className="h-2 rounded-full bg-muted" aria-hidden="true">
                <span
                  className="block h-2 rounded-full bg-primary"
                  style={{ width: `${(d.count / max) * 100}%` }}
                />
              </span>
              <span className="text-right text-xs tabular-nums">{d.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
