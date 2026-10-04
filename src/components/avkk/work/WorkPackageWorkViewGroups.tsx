import type {
  DueGroup,
  WorkPackageWorkViewGroup,
  WorkPackageWorkViewGroupBy,
} from "@/lib/avkk/work-package-work-view.types";
import { dueGroupLabels, workDateLabel, workStatusLabel } from "./work-view-presentation";

export function WorkPackageWorkViewGroups({
  groups,
  groupBy,
}: {
  groups: readonly WorkPackageWorkViewGroup[];
  groupBy: WorkPackageWorkViewGroupBy;
}) {
  return (
    <div className="space-y-5">
      {groups.map((group, index) => {
        const label =
          groupBy === "due"
            ? dueGroupLabels[group.key as DueGroup]
            : group.key === "UNASSIGNED"
              ? "Nicht zugeordnet"
              : group.label;
        const headingId = `work-package-group-${index}`;
        return (
          <section key={group.key} aria-labelledby={headingId} className="min-w-0 space-y-2">
            <h2 id={headingId} className="break-words text-lg font-semibold">
              {label}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({group.rows.length})
              </span>
            </h2>
            <ul className="space-y-2">
              {group.rows.map((row) => (
                <li
                  key={row.workPackageId}
                  data-work-package-id={row.workPackageId}
                  className="min-w-0 rounded-lg border border-border bg-card p-4"
                >
                  <h3 className="mb-3 break-words font-semibold">{row.title}</h3>
                  <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Kunde</dt>
                      <dd className="break-words">{row.customerName}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>{workStatusLabel(row.status)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Fälligkeit</dt>
                      <dd>
                        {row.due ? (
                          <time dateTime={row.due}>{workDateLabel(row.due)}</time>
                        ) : (
                          "Ohne Fälligkeitsdatum"
                        )}
                        <span className="block text-xs text-muted-foreground">
                          {dueGroupLabels[row.dueGroup]}
                        </span>
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Verantwortlicher</dt>
                      <dd className="break-words">
                        {row.owner === "UNASSIGNED" ? "Nicht zugeordnet" : row.owner.displayName}
                      </dd>
                    </div>
                    {row.deputies.length > 0 ? (
                      <div className="min-w-0 sm:col-span-2">
                        <dt className="text-muted-foreground">Stellvertretung</dt>
                        <dd className="break-words">
                          {row.deputies.map((person) => person.displayName).join(", ")}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
