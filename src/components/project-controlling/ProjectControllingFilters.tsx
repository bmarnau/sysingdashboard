import type {
  ProjectControllingFilters as ProjectControllingFilterValue,
  ProjectControllingScopeOption,
} from "@/lib/project-controlling/project-controlling-contract";

interface Props {
  filters: ProjectControllingFilterValue;
  scopeOptions: readonly ProjectControllingScopeOption[];
  onChange?: (filters: ProjectControllingFilterValue) => void;
}

function uniqueOptions(
  options: readonly ProjectControllingScopeOption[],
  kind: ProjectControllingScopeOption["kind"],
) {
  const seen = new Set<string>();

  return options.filter((option) => {
    if (option.kind !== kind) return false;

    const key = [
      option.systemhouseId,
      option.customerId ?? "",
      option.projectSourceId ?? "",
      option.workPackageSourceId ?? "",
      option.categoryKey ?? "",
    ].join(":");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function ProjectControllingFilters({ filters, scopeOptions, onChange }: Props) {
  const systemhouses = uniqueOptions(scopeOptions, "systemhouse");
  const customers = uniqueOptions(scopeOptions, "customer").filter(
    (option) => !filters.systemhouseId || option.systemhouseId === filters.systemhouseId,
  );
  const projects = uniqueOptions(scopeOptions, "project").filter(
    (option) =>
      !!filters.systemhouseId &&
      !!filters.customerId &&
      option.systemhouseId === filters.systemhouseId &&
      option.customerId === filters.customerId,
  );
  const workPackages = uniqueOptions(scopeOptions, "workPackage").filter(
    (option) =>
      !!filters.systemhouseId &&
      !!filters.customerId &&
      option.systemhouseId === filters.systemhouseId &&
      option.customerId === filters.customerId &&
      (!filters.projectSourceId || option.projectSourceId === filters.projectSourceId),
  );
  const categories = uniqueOptions(scopeOptions, "category").filter(
    (option) => !!filters.systemhouseId && option.systemhouseId === filters.systemhouseId,
  );

  const update = (patch: Partial<ProjectControllingFilterValue>) =>
    onChange?.({ ...filters, ...patch });

  return (
    <section aria-label="Filter" className="rounded-lg border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Von</span>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => update({ from: event.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background px-3"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Bis</span>
          <input
            type="date"
            value={filters.to}
            onChange={(event) => update({ to: event.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background px-3"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Systemhaus</span>
          <select
            value={filters.systemhouseId ?? ""}
            onChange={(event) =>
              update({
                systemhouseId: event.target.value || undefined,
                customerId: undefined,
                projectSourceId: undefined,
                workPackageSourceId: undefined,
                categoryKey: undefined,
              })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3"
          >
            <option value="">Alle Systemhäuser</option>
            {systemhouses.map((option) => (
              <option key={option.systemhouseId} value={option.systemhouseId}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Kunde</span>
          <select
            value={filters.customerId ?? ""}
            disabled={!filters.systemhouseId}
            onChange={(event) =>
              update({
                customerId: event.target.value || undefined,
                projectSourceId: undefined,
                workPackageSourceId: undefined,
              })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 disabled:opacity-50"
          >
            <option value="">Alle Kunden</option>
            {customers.map((option) => (
              <option key={option.customerId} value={option.customerId}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Projekt</span>
          <select
            value={filters.projectSourceId ?? ""}
            disabled={!filters.systemhouseId || !filters.customerId}
            onChange={(event) =>
              update({
                projectSourceId: event.target.value || undefined,
                workPackageSourceId: undefined,
              })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 disabled:opacity-50"
          >
            <option value="">Alle Projekte</option>
            {projects.map((option) => (
              <option key={option.projectSourceId} value={option.projectSourceId}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Arbeitspaket</span>
          <select
            value={filters.workPackageSourceId ?? ""}
            disabled={!filters.systemhouseId || !filters.customerId}
            onChange={(event) =>
              update({ workPackageSourceId: event.target.value || undefined })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 disabled:opacity-50"
          >
            <option value="">Alle Arbeitspakete</option>
            {workPackages.map((option) => (
              <option key={option.workPackageSourceId} value={option.workPackageSourceId}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">AP-Kategorie</span>
          <select
            value={filters.categoryKey ?? ""}
            disabled={!filters.systemhouseId}
            onChange={(event) => update({ categoryKey: event.target.value || undefined })}
            className="h-9 w-full rounded-md border border-input bg-background px-3 disabled:opacity-50"
          >
            <option value="">Alle Kategorien</option>
            {categories.map((option) => (
              <option key={option.categoryKey} value={option.categoryKey}>
                {option.label}
                {option.active === false ? " (inaktiv)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Abrechenbarkeit</span>
          <select
            value={filters.billable}
            onChange={(event) =>
              update({
                billable: event.target.value as ProjectControllingFilterValue["billable"],
              })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3"
          >
            <option value="all">Alle</option>
            <option value="billable">Abrechenbar</option>
            <option value="nonBillable">Nicht abrechenbar</option>
          </select>
        </label>
      </div>
    </section>
  );
}
