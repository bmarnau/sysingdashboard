import type { Activity, Project, WorkPackage, Engineer } from "@/lib/dashboard-data";

/* -------------------------------- Typen -------------------------------- */

export type ExportFormat = "pdf" | "json" | "csv" | "azure-table";

export type GroupingId =
  | "customer-project-workpackage-task"
  | "project-workpackage-task"
  | "employee-project-task"
  | "customer-month-project";

export type SortKey = "date" | "date-desc" | "project" | "customer" | "employee" | "duration";

export interface ExportConfiguration {
  format: ExportFormat;
  month: string; // YYYY-MM
  fileName: string;
  grouping: GroupingId;
  sorting: SortKey[];
  filter: {
    clientId: string | null;
    clientName: string | null;
    projectId: string | null;
    projectName: string | null;
  };
}

export interface ExportSummary {
  customers: number;
  projects: number;
  workPackages: number;
  activities: number;
  timeEntries: number;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  totalAmount: number;
}

export interface ExportGroupNode {
  key: string;
  label: string;
  level: "customer" | "project" | "workpackage" | "activity" | "employee" | "month";
  hours: number;
  billableHours: number;
  amount: number;
  children: ExportGroupNode[];
  /** Aktivitäts-IDs, die diesem Knoten direkt zugeordnet sind (für Leafs). */
  activityIds?: string[];
}

export interface ExportData {
  configuration: ExportConfiguration;
  summary: ExportSummary;
  groups: ExportGroupNode[];
}

export interface ExportInput {
  projects: Project[];
  workPackages: WorkPackage[];
  activities: Activity[];
  engineer: Engineer;
}

/* ------------------------------ Helpers -------------------------------- */

const monthOf = (iso: string) => (iso || "").slice(0, 7);

const round2 = (n: number) => Math.round(n * 100) / 100;

function activityAmount(a: Activity): number {
  if (!a.billable) return 0;
  const rate = a.hourlyRate ?? 0;
  return a.duration * rate;
}

/* --------------------------- Filter / Loader --------------------------- */

/**
 * Lädt die Tätigkeiten, die für den Export relevant sind.
 * Filter: Monat (YYYY-MM), optional Kunde (Name) und Projekt-ID.
 */
export function loadExportData(
  input: ExportInput,
  cfg: Pick<ExportConfiguration, "month" | "filter">,
): { activities: Activity[]; projects: Project[]; workPackages: WorkPackage[] } {
  const wpById = new Map(input.workPackages.map((w) => [w.id, w]));
  const projectById = new Map(input.projects.map((p) => [p.id, p]));

  const inMonth = (a: Activity) => monthOf(a.date) === cfg.month;

  const matchesClient = (a: Activity) => {
    if (!cfg.filter.clientName) return true;
    const wp = a.workPackageId ? wpById.get(a.workPackageId) : undefined;
    const project = wp?.projectId ? projectById.get(wp.projectId) : undefined;
    return (
      a.client === cfg.filter.clientName ||
      wp?.client === cfg.filter.clientName ||
      project?.client === cfg.filter.clientName
    );
  };

  const matchesProject = (a: Activity) => {
    if (!cfg.filter.projectId) return true;
    const wp = a.workPackageId ? wpById.get(a.workPackageId) : undefined;
    return wp?.projectId === cfg.filter.projectId;
  };

  const acts = input.activities.filter((a) => inMonth(a) && matchesClient(a) && matchesProject(a));

  // Auf tatsächlich referenzierte WPs / Projekte reduzieren — keine doppelten Schleifen.
  const wpIds = new Set<string>();
  const projectIds = new Set<string>();
  for (const a of acts) {
    if (a.workPackageId) wpIds.add(a.workPackageId);
  }
  const wps: WorkPackage[] = [];
  for (const id of wpIds) {
    const wp = wpById.get(id);
    if (wp) {
      wps.push(wp);
      if (wp.projectId) projectIds.add(wp.projectId);
    }
  }
  const projects: Project[] = [];
  for (const id of projectIds) {
    const p = projectById.get(id);
    if (p) projects.push(p);
  }

  return { activities: acts, projects, workPackages: wps };
}

/* ------------------------------ Sorting -------------------------------- */

function sortActivities(
  activities: Activity[],
  sorting: SortKey[],
  ctx: {
    wpById: Map<string, WorkPackage>;
    projectById: Map<string, Project>;
    employeeName: string;
  },
): Activity[] {
  if (sorting.length === 0) return activities;
  const arr = [...activities];
  arr.sort((a, b) => {
    for (const key of sorting) {
      const cmp = compareBy(a, b, key, ctx);
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
  return arr;
}

function compareBy(
  a: Activity,
  b: Activity,
  key: SortKey,
  ctx: { wpById: Map<string, WorkPackage>; projectById: Map<string, Project>; employeeName: string },
): number {
  switch (key) {
    case "date":
      return (a.date || "").localeCompare(b.date || "");
    case "date-desc":
      return (b.date || "").localeCompare(a.date || "");
    case "project": {
      const pa = projectName(a, ctx);
      const pb = projectName(b, ctx);
      return pa.localeCompare(pb);
    }
    case "customer":
      return customerName(a, ctx).localeCompare(customerName(b, ctx));
    case "employee":
      return ctx.employeeName.localeCompare(ctx.employeeName);
    case "duration":
      return b.duration - a.duration;
  }
}

function customerName(
  a: Activity,
  ctx: { wpById: Map<string, WorkPackage>; projectById: Map<string, Project> },
): string {
  if (a.client) return a.client;
  const wp = a.workPackageId ? ctx.wpById.get(a.workPackageId) : undefined;
  if (wp?.client) return wp.client;
  const project = wp?.projectId ? ctx.projectById.get(wp.projectId) : undefined;
  return project?.client ?? "— ohne Kunde —";
}

function projectName(
  a: Activity,
  ctx: { wpById: Map<string, WorkPackage>; projectById: Map<string, Project> },
): string {
  const wp = a.workPackageId ? ctx.wpById.get(a.workPackageId) : undefined;
  const project = wp?.projectId ? ctx.projectById.get(wp.projectId) : undefined;
  return project?.name ?? "— ohne Projekt —";
}

function workPackageName(
  a: Activity,
  ctx: { wpById: Map<string, WorkPackage> },
): string {
  const wp = a.workPackageId ? ctx.wpById.get(a.workPackageId) : undefined;
  return wp?.title ?? "— ohne Arbeitspaket —";
}

/* ------------------------------ Grouping ------------------------------- */

type DimensionKey = "customer" | "project" | "workpackage" | "activity" | "employee" | "month";

const GROUPING_DIMENSIONS: Record<GroupingId, DimensionKey[]> = {
  "customer-project-workpackage-task": ["customer", "project", "workpackage", "activity"],
  "project-workpackage-task": ["project", "workpackage", "activity"],
  "employee-project-task": ["employee", "project", "activity"],
  "customer-month-project": ["customer", "month", "project"],
};

function dimensionValue(
  dim: DimensionKey,
  a: Activity,
  ctx: { wpById: Map<string, WorkPackage>; projectById: Map<string, Project>; employeeName: string },
): { key: string; label: string } {
  switch (dim) {
    case "customer": {
      const label = customerName(a, ctx);
      return { key: `c:${label}`, label };
    }
    case "project": {
      const wp = a.workPackageId ? ctx.wpById.get(a.workPackageId) : undefined;
      const id = wp?.projectId ?? "__none__";
      return { key: `p:${id}`, label: projectName(a, ctx) };
    }
    case "workpackage": {
      const id = a.workPackageId ?? "__none__";
      return { key: `w:${id}`, label: workPackageName(a, ctx) };
    }
    case "activity":
      return { key: `a:${a.id}`, label: a.title || "— ohne Titel —" };
    case "employee":
      return { key: `e:${ctx.employeeName}`, label: ctx.employeeName };
    case "month":
      return { key: `m:${monthOf(a.date)}`, label: monthOf(a.date) || "— ohne Datum —" };
  }
}

/**
 * Baut die Gruppierungs-Baumstruktur mit Summen. Single-Pass über die Aktivitäten;
 * jede Ebene wird per Map auf-/abgestiegen.
 */
export function buildExportGroups(
  data: { activities: Activity[]; projects: Project[]; workPackages: WorkPackage[] },
  cfg: Pick<ExportConfiguration, "grouping" | "sorting">,
  employeeName: string,
): ExportGroupNode[] {
  const wpById = new Map(data.workPackages.map((w) => [w.id, w]));
  const projectById = new Map(data.projects.map((p) => [p.id, p]));
  const ctx = { wpById, projectById, employeeName };
  const dims = GROUPING_DIMENSIONS[cfg.grouping];

  const sorted = sortActivities(data.activities, cfg.sorting, ctx);

  const roots: ExportGroupNode[] = [];
  const rootIndex = new Map<string, ExportGroupNode>();

  for (const a of sorted) {
    const hours = a.duration;
    const billableHours = a.billable ? a.duration : 0;
    const amount = activityAmount(a);

    let levelNodes = roots;
    let levelIndex: Map<string, ExportGroupNode> = rootIndex;

    for (let d = 0; d < dims.length; d++) {
      const dim = dims[d];
      const { key, label } = dimensionValue(dim, a, ctx);

      let node = levelIndex.get(key);
      if (!node) {
        node = {
          key,
          label,
          level: dim,
          hours: 0,
          billableHours: 0,
          amount: 0,
          children: [],
        };
        levelIndex.set(key, node);
        levelNodes.push(node);
      }

      node.hours = round2(node.hours + hours);
      node.billableHours = round2(node.billableHours + billableHours);
      node.amount = round2(node.amount + amount);

      const isLeaf = d === dims.length - 1;
      if (isLeaf) {
        (node.activityIds ??= []).push(a.id);
      } else {
        // Lazy-Child-Index am Knoten zwischenspeichern, um O(n*depth) zu halten.
        const childIndexKey = "__idx__";
        // @ts-expect-error transient cache slot
        let childIndex: Map<string, ExportGroupNode> | undefined = node[childIndexKey];
        if (!childIndex) {
          childIndex = new Map(node.children.map((c) => [c.key, c]));
          // @ts-expect-error transient cache slot
          node[childIndexKey] = childIndex;
        }
        levelNodes = node.children;
        levelIndex = childIndex;
      }
    }
  }

  // transient Index-Caches wieder entfernen, damit das DTO sauber serialisierbar bleibt
  const cleanup = (nodes: ExportGroupNode[]) => {
    for (const n of nodes) {
      // @ts-expect-error transient cache slot
      delete n.__idx__;
      if (n.children.length) cleanup(n.children);
    }
  };
  cleanup(roots);

  return roots;
}

/* ------------------------------ Summary -------------------------------- */

export function calculateSummary(data: {
  activities: Activity[];
  projects: Project[];
  workPackages: WorkPackage[];
}): ExportSummary {
  let totalHours = 0;
  let billableHours = 0;
  let nonBillableHours = 0;
  let totalAmount = 0;
  const customers = new Set<string>();
  const wpById = new Map(data.workPackages.map((w) => [w.id, w]));
  const projectById = new Map(data.projects.map((p) => [p.id, p]));

  for (const a of data.activities) {
    totalHours += a.duration;
    if (a.billable) {
      billableHours += a.duration;
      totalAmount += a.duration * (a.hourlyRate ?? 0);
    } else {
      nonBillableHours += a.duration;
    }
    // Kunde aus Activity/WP/Project ableiten
    const wp = a.workPackageId ? wpById.get(a.workPackageId) : undefined;
    const project = wp?.projectId ? projectById.get(wp.projectId) : undefined;
    const client = a.client ?? wp?.client ?? project?.client;
    if (client) customers.add(client);
  }

  return {
    customers: customers.size,
    projects: data.projects.length,
    workPackages: data.workPackages.length,
    activities: data.activities.length,
    // In diesem Datenmodell entspricht eine Tätigkeit einer Zeitbuchung
    // (Datum/Dauer/Rate liegen am Activity-Datensatz).
    timeEntries: data.activities.length,
    totalHours: round2(totalHours),
    billableHours: round2(billableHours),
    nonBillableHours: round2(nonBillableHours),
    totalAmount: round2(totalAmount),
  };
}

/* ------------------------------- DTO ----------------------------------- */

export function createExportDTO(
  input: ExportInput,
  configuration: ExportConfiguration,
): ExportData {
  const filtered = loadExportData(input, configuration);
  const summary = calculateSummary(filtered);
  const groups = buildExportGroups(filtered, configuration, input.engineer.name);
  return { configuration, summary, groups };
}
