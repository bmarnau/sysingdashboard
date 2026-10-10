import type {
  DueGroup,
  WorkPackagePerson,
  WorkPackageWorkViewGroup,
  WorkPackageWorkViewRepository,
  WorkPackageWorkViewRow,
  WorkPackageWorkViewSelection,
  WorkPackageWorkViewSourceRow,
} from "@/lib/avkk/work-package-work-view.types";

const BERLIN_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const DUE_GROUP_ORDER: Record<DueGroup, number> = {
  OVERDUE: 0,
  TODAY: 1,
  FUTURE: 2,
  NO_DUE_DATE: 3,
};

function fail(message: string): never {
  throw new Error(`Arbeitspaket-Arbeitssicht: ${message}.`);
}

function berlinDate(referenceInstant: string): string {
  const instant = new Date(referenceInstant);
  if (Number.isNaN(instant.getTime())) fail("ungültiger Referenzzeitpunkt");

  const parts = BERLIN_DATE_FORMATTER.formatToParts(instant);
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  if (!values.year || !values.month || !values.day) fail("Berlin-Datum nicht bestimmbar");
  return `${values.year}-${values.month}-${values.day}`;
}

function validDue(due: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(due);
  if (!match) return false;
  const [, year, month, day] = match;
  const candidate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    candidate.getUTCFullYear() === Number(year) &&
    candidate.getUTCMonth() === Number(month) - 1 &&
    candidate.getUTCDate() === Number(day)
  );
}

function dueGroup(due: string | null, asOfDate: string): DueGroup {
  if (due === null) return "NO_DUE_DATE";
  if (!validDue(due)) fail("ungültige Fälligkeit");
  if (due < asOfDate) return "OVERDUE";
  if (due === asOfDate) return "TODAY";
  return "FUTURE";
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "de", { sensitivity: "base" });
}

function personKey(person: WorkPackagePerson): string {
  return person.personId;
}

function personName(person: WorkPackagePerson | "UNASSIGNED"): string {
  return person === "UNASSIGNED" ? "UNASSIGNED" : person.displayName;
}

function hydrate(row: WorkPackageWorkViewSourceRow, asOfDate: string): WorkPackageWorkViewRow {
  const owners = row.responsibilities.filter((responsibility) => responsibility.role === "owner");
  if (owners.length > 1) fail(`mehrere aktive Owner für Arbeitspaket ${row.workPackageId}`);
  const owner = owners[0]
    ? { personId: owners[0].personId, displayName: owners[0].displayName }
    : "UNASSIGNED";
  const ownerId = owner === "UNASSIGNED" ? null : owner.personId;
  const deputies = [
    ...new Map(
      row.responsibilities
        .filter(
          (responsibility) =>
            responsibility.role === "deputy" && responsibility.personId !== ownerId,
        )
        .map((responsibility) => [
          responsibility.personId,
          { personId: responsibility.personId, displayName: responsibility.displayName },
        ]),
    ).values(),
  ].sort((left, right) => {
    const byName = compareText(left.displayName, right.displayName);
    return byName !== 0 ? byName : compareText(left.personId, right.personId);
  });

  return {
    workPackageId: row.workPackageId,
    sourceId: row.sourceId,
    systemhouseId: row.systemhouseId,
    customerId: row.customerId,
    customerName: row.customerName,
    title: row.title,
    status: row.status,
    due: row.due,
    dueGroup: dueGroup(row.due, asOfDate),
    owner,
    deputies,
    asOfDate,
  };
}

function matches(
  row: WorkPackageWorkViewRow,
  filters: WorkPackageWorkViewSelection["filters"],
): boolean {
  if (!filters) return true;
  const text = filters.text?.trim().toLocaleLowerCase("de");
  if (
    text &&
    !`${row.title} ${row.customerName} ${personName(row.owner)}`
      .toLocaleLowerCase("de")
      .includes(text)
  )
    return false;
  if (filters.customerIds && !filters.customerIds.includes(row.customerId)) return false;
  const ownerId = row.owner === "UNASSIGNED" ? "UNASSIGNED" : row.owner.personId;
  if (filters.ownerIds && !filters.ownerIds.includes(ownerId)) return false;
  if (filters.status && !filters.status.includes(row.status)) return false;
  return !filters.dueGroups || filters.dueGroups.includes(row.dueGroup);
}

function groupKey(
  row: WorkPackageWorkViewRow,
  groupBy: WorkPackageWorkViewSelection["groupBy"],
): string {
  if (groupBy === "customer") return `${row.systemhouseId}:${row.customerId}`;
  if (groupBy === "owner") return row.owner === "UNASSIGNED" ? "UNASSIGNED" : personKey(row.owner);
  return row.dueGroup;
}

function groupLabel(
  row: WorkPackageWorkViewRow,
  groupBy: WorkPackageWorkViewSelection["groupBy"],
): string {
  if (groupBy === "customer") return row.customerName;
  if (groupBy === "owner") return personName(row.owner);
  return row.dueGroup;
}

function compareGroups(
  left: WorkPackageWorkViewGroup,
  right: WorkPackageWorkViewGroup,
  groupBy: WorkPackageWorkViewSelection["groupBy"],
): number {
  if (groupBy === "due")
    return DUE_GROUP_ORDER[left.key as DueGroup] - DUE_GROUP_ORDER[right.key as DueGroup];
  if (groupBy === "owner") {
    if (left.key === "UNASSIGNED") return right.key === "UNASSIGNED" ? 0 : 1;
    if (right.key === "UNASSIGNED") return -1;
  }
  return compareText(left.label, right.label) || compareText(left.key, right.key);
}

function compareRows(
  left: WorkPackageWorkViewRow,
  right: WorkPackageWorkViewRow,
  selection: WorkPackageWorkViewSelection,
): number {
  const value = (row: WorkPackageWorkViewRow): string => {
    if (selection.sortBy === "due") return row.due ?? "9999-12-31";
    if (selection.sortBy === "customer") return row.customerName;
    if (selection.sortBy === "owner") return personName(row.owner);
    return row.title;
  };
  const base = compareText(value(left), value(right));
  const directional = selection.sortDirection === "asc" ? base : -base;
  if (directional !== 0) return directional;
  const byTitle = compareText(left.title, right.title);
  return byTitle !== 0 ? byTitle : compareText(left.workPackageId, right.workPackageId);
}

export class WorkPackageWorkViewService {
  constructor(private readonly repository: WorkPackageWorkViewRepository) {}

  async list(referenceInstant: string): Promise<WorkPackageWorkViewRow[]> {
    const asOfDate = berlinDate(referenceInstant);
    return (await this.repository.listAuthorizedWorkPackages(referenceInstant)).map((row) =>
      hydrate(row, asOfDate),
    );
  }
}

export function selectWorkPackageWorkView(
  rows: readonly WorkPackageWorkViewRow[],
  selection: WorkPackageWorkViewSelection,
): WorkPackageWorkViewGroup[] {
  const groups = new Map<string, WorkPackageWorkViewRow[]>();
  for (const row of rows.filter((candidate) => matches(candidate, selection.filters))) {
    const key = groupKey(row, selection.groupBy);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return [...groups.entries()]
    .map(([key, groupRows]) => ({
      key,
      label: groupLabel(groupRows[0], selection.groupBy),
      rows: [...groupRows].sort((left, right) => compareRows(left, right, selection)),
    }))
    .sort((left, right) => compareGroups(left, right, selection.groupBy));
}
