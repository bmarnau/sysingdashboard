import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  PROJECT_CONTROLLING_MAX_ACTIVITIES,
  type ProjectControllingCategoryState,
  type ProjectControllingFilters,
  type ProjectControllingRepository,
  type ProjectControllingRow,
  type ProjectControllingScopeOption,
} from "@/lib/project-controlling/project-controlling-contract";

type UserSupabaseClient = SupabaseClient<Database>;

interface AccessRow {
  systemhouse_id: string;
  customer_id: string;
  access_level: string;
}

interface SystemhouseRow {
  id: string;
  name: string;
  status: string;
}

interface CustomerRow {
  id: string;
  systemhouse_id: string;
  name: string;
  status: string;
}

interface ProjectRow {
  systemhouse_id: string;
  customer_id: string;
  source_id: string;
  name: string;
  published_at: string;
}

interface WorkPackageRow {
  systemhouse_id: string;
  customer_id: string;
  source_id: string;
  project_source_id: string | null;
  title: string;
  category_key: string | null;
  category_observed: boolean;
  published_at: string;
}

interface ActivityRow {
  systemhouse_id: string;
  customer_id: string;
  source_id: string;
  title: string;
  activity_date: string;
  duration_hours: number;
  billable: boolean;
  billing_status: string | null;
  work_package_source_id: string | null;
  published_at: string;
}

interface ReferenceCatalogRow {
  id: string;
}

interface ReferenceValueRow {
  systemhouse_id: string | null;
  key: string;
  label: string;
  is_active: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
}

interface AccessScope {
  systemhouseId: string;
  customerId: string;
}

interface AdapterContext {
  scopes: AccessScope[];
  systemhouses: SystemhouseRow[];
  customers: CustomerRow[];
  projects: ProjectRow[];
  workPackages: WorkPackageRow[];
  referenceValues: ReferenceValueRow[];
}

function fail(operation: string): never {
  throw new Error(`Projektcontrolling: ${operation} fehlgeschlagen.`);
}

function scopeKey(systemhouseId: string, customerId: string): string {
  return `${systemhouseId}::${customerId}`;
}

function projectKey(systemhouseId: string, customerId: string, sourceId: string): string {
  return `${scopeKey(systemhouseId, customerId)}::${sourceId}`;
}

function workPackageKey(systemhouseId: string, customerId: string, sourceId: string): string {
  return `${scopeKey(systemhouseId, customerId)}::${sourceId}`;
}

function referenceKey(systemhouseId: string, key: string): string {
  return `${systemhouseId}::${key}`;
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function isReferenceActive(row: ReferenceValueRow, nowIso: string): boolean {
  if (!row.is_active) return false;
  if (row.valid_from && row.valid_from > nowIso) return false;
  if (row.valid_to && row.valid_to <= nowIso) return false;
  return true;
}

function categoryState(
  workPackage: WorkPackageRow,
  reference: ReferenceValueRow | undefined,
  nowIso: string,
): ProjectControllingCategoryState {
  if (!workPackage.category_observed) return "unobserved";
  if (workPackage.category_key === null) return "none";
  if (!reference) return "unknown";
  return isReferenceActive(reference, nowIso) ? "known" : "inactive";
}

function sortRows(rows: ProjectControllingRow[]): ProjectControllingRow[] {
  return rows.sort(
    (left, right) =>
      left.activityDate.localeCompare(right.activityDate) ||
      left.activityId.localeCompare(right.activityId) ||
      left.systemhouseId.localeCompare(right.systemhouseId) ||
      left.customerId.localeCompare(right.customerId),
  );
}

function sortOptions(options: ProjectControllingScopeOption[]): ProjectControllingScopeOption[] {
  const kindOrder = new Map([
    ["systemhouse", 0],
    ["customer", 1],
    ["project", 2],
    ["workPackage", 3],
    ["category", 4],
  ]);

  return options.sort((left, right) => {
    const kindDifference = (kindOrder.get(left.kind) ?? 99) - (kindOrder.get(right.kind) ?? 99);
    if (kindDifference !== 0) return kindDifference;
    return (
      left.systemhouseId.localeCompare(right.systemhouseId) ||
      (left.customerId ?? "").localeCompare(right.customerId ?? "") ||
      left.label.localeCompare(right.label) ||
      (left.categoryKey ?? "").localeCompare(right.categoryKey ?? "")
    );
  });
}

export function createSupabaseProjectControllingRepository(
  client: UserSupabaseClient,
  userId: string,
): ProjectControllingRepository {
  async function loadAccessScopes(filters: ProjectControllingFilters): Promise<AccessScope[]> {
    const nowIso = new Date().toISOString();
    let query = client
      .from("customer_access")
      .select("systemhouse_id, customer_id, access_level")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("access_level", ["read", "write"])
      .or(`valid_from.is.null,valid_from.lte.${nowIso}`)
      .or(`valid_to.is.null,valid_to.gt.${nowIso}`);

    if (filters.systemhouseId) query = query.eq("systemhouse_id", filters.systemhouseId);
    if (filters.customerId) query = query.eq("customer_id", filters.customerId);

    const { data, error } = await query;
    if (error) fail("Kundenzugriffe lesen");

    const rows = (data ?? []) as AccessRow[];
    const seen = new Set<string>();
    const scopes: AccessScope[] = [];
    for (const row of rows) {
      const key = scopeKey(row.systemhouse_id, row.customer_id);
      if (seen.has(key)) continue;
      seen.add(key);
      scopes.push({ systemhouseId: row.systemhouse_id, customerId: row.customer_id });
    }
    return scopes;
  }

  async function loadContext(filters: ProjectControllingFilters): Promise<AdapterContext> {
    const scopes = await loadAccessScopes(filters);
    if (scopes.length === 0) {
      return {
        scopes: [],
        systemhouses: [],
        customers: [],
        projects: [],
        workPackages: [],
        referenceValues: [],
      };
    }

    const allowedScopeKeys = new Set(
      scopes.map((scope) => scopeKey(scope.systemhouseId, scope.customerId)),
    );
    const systemhouseIds = unique(scopes.map((scope) => scope.systemhouseId));
    const customerIds = unique(scopes.map((scope) => scope.customerId));

    const [systemhouseResult, customerResult] = await Promise.all([
      client
        .from("systemhouse")
        .select("id, name, status")
        .eq("status", "active")
        .in("id", systemhouseIds),
      client
        .from("customer")
        .select("id, systemhouse_id, name, status")
        .eq("status", "active")
        .in("id", customerIds),
    ]);
    if (systemhouseResult.error) fail("Systemhäuser lesen");
    if (customerResult.error) fail("Kunden lesen");

    const systemhouses = (systemhouseResult.data ?? []) as SystemhouseRow[];
    const readableSystemhouseIds = new Set(systemhouses.map((row) => row.id));
    const customers = ((customerResult.data ?? []) as CustomerRow[]).filter((row) =>
      allowedScopeKeys.has(scopeKey(row.systemhouse_id, row.id)),
    );
    const readableScopeKeys = new Set(
      customers
        .filter((row) => readableSystemhouseIds.has(row.systemhouse_id))
        .map((row) => scopeKey(row.systemhouse_id, row.id)),
    );
    const readableScopes = scopes.filter((scope) =>
      readableScopeKeys.has(scopeKey(scope.systemhouseId, scope.customerId)),
    );

    if (readableScopes.length === 0) {
      return {
        scopes: [],
        systemhouses,
        customers: [],
        projects: [],
        workPackages: [],
        referenceValues: [],
      };
    }

    let projectQuery = client
      .from("shared_project_projection")
      .select("systemhouse_id, customer_id, source_id, name, published_at")
      .eq("is_active", true)
      .in("systemhouse_id", unique(readableScopes.map((scope) => scope.systemhouseId)))
      .in("customer_id", unique(readableScopes.map((scope) => scope.customerId)));
    if (filters.projectSourceId)
      projectQuery = projectQuery.eq("source_id", filters.projectSourceId);

    let workPackageQuery = client
      .from("shared_work_package_projection")
      .select(
        "systemhouse_id, customer_id, source_id, project_source_id, title, category_key, category_observed, published_at",
      )
      .eq("is_active", true)
      .in("systemhouse_id", unique(readableScopes.map((scope) => scope.systemhouseId)))
      .in("customer_id", unique(readableScopes.map((scope) => scope.customerId)));
    if (filters.projectSourceId) {
      workPackageQuery = workPackageQuery.eq("project_source_id", filters.projectSourceId);
    }
    if (filters.workPackageSourceId) {
      workPackageQuery = workPackageQuery.eq("source_id", filters.workPackageSourceId);
    }
    if (filters.categoryKey) {
      workPackageQuery = workPackageQuery
        .eq("category_observed", true)
        .eq("category_key", filters.categoryKey);
    }

    const [projectResult, workPackageResult, catalogResult] = await Promise.all([
      projectQuery,
      workPackageQuery,
      client
        .from("reference_catalog")
        .select("id")
        .eq("key", "workpackage.category")
        .eq("scope_type", "systemhouse")
        .limit(1)
        .maybeSingle(),
    ]);
    if (projectResult.error) fail("Projekte lesen");
    if (workPackageResult.error) fail("Arbeitspakete lesen");
    if (catalogResult.error) fail("AP-Kategoriekatalog lesen");

    const projects = ((projectResult.data ?? []) as ProjectRow[]).filter((row) =>
      readableScopeKeys.has(scopeKey(row.systemhouse_id, row.customer_id)),
    );
    const workPackages = ((workPackageResult.data ?? []) as WorkPackageRow[]).filter((row) =>
      readableScopeKeys.has(scopeKey(row.systemhouse_id, row.customer_id)),
    );

    const catalog = catalogResult.data as ReferenceCatalogRow | null;
    let referenceValues: ReferenceValueRow[] = [];
    if (catalog) {
      const referenceResult = await client
        .from("reference_value")
        .select("systemhouse_id, key, label, is_active, valid_from, valid_to")
        .eq("catalog_id", catalog.id)
        .in("systemhouse_id", unique(readableScopes.map((scope) => scope.systemhouseId)));
      if (referenceResult.error) fail("AP-Kategorien lesen");
      referenceValues = ((referenceResult.data ?? []) as ReferenceValueRow[]).filter(
        (row) => row.systemhouse_id !== null && readableSystemhouseIds.has(row.systemhouse_id),
      );
    }

    return {
      scopes: readableScopes,
      systemhouses,
      customers,
      projects,
      workPackages,
      referenceValues,
    };
  }

  async function loadActivities(
    filters: ProjectControllingFilters,
    context: AdapterContext,
  ): Promise<ActivityRow[]> {
    const workPackageIdsByScope = new Map<string, string[]>();
    for (const row of context.workPackages) {
      const key = scopeKey(row.systemhouse_id, row.customer_id);
      workPackageIdsByScope.set(key, [...(workPackageIdsByScope.get(key) ?? []), row.source_id]);
    }

    const parentFilterRequired = Boolean(
      filters.projectSourceId || filters.workPackageSourceId || filters.categoryKey,
    );
    const rows: ActivityRow[] = [];

    for (const scope of context.scopes) {
      if (rows.length >= PROJECT_CONTROLLING_MAX_ACTIVITIES + 1) break;

      const scopedWorkPackageIds = unique(
        workPackageIdsByScope.get(scopeKey(scope.systemhouseId, scope.customerId)) ?? [],
      );
      if (parentFilterRequired && scopedWorkPackageIds.length === 0) continue;

      let offset = 0;
      while (rows.length < PROJECT_CONTROLLING_MAX_ACTIVITIES + 1) {
        const remaining = PROJECT_CONTROLLING_MAX_ACTIVITIES + 1 - rows.length;
        const pageSize = Math.min(1_000, remaining);

        let query = client
          .from("shared_activity_projection")
          .select(
            "systemhouse_id, customer_id, source_id, title, activity_date, duration_hours, billable, billing_status, work_package_source_id, published_at",
          )
          .eq("is_active", true)
          .eq("systemhouse_id", scope.systemhouseId)
          .eq("customer_id", scope.customerId)
          .gte("activity_date", filters.from)
          .lte("activity_date", filters.to);

        if (filters.billable === "billable") query = query.eq("billable", true);
        if (filters.billable === "nonBillable") query = query.eq("billable", false);

        if (parentFilterRequired) {
          query =
            scopedWorkPackageIds.length === 1
              ? query.eq("work_package_source_id", scopedWorkPackageIds[0])
              : query.in("work_package_source_id", scopedWorkPackageIds);
        }

        const { data, error } = await query
          .order("activity_date", { ascending: true })
          .order("source_id", { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) fail("Tätigkeiten lesen");

        const batch = (data ?? []) as ActivityRow[];
        rows.push(...batch);
        if (batch.length < pageSize) break;
        offset += pageSize;
      }
    }

    return rows.slice(0, PROJECT_CONTROLLING_MAX_ACTIVITIES + 1);
  }

  return {
    async listRows(filters) {
      const context = await loadContext(filters);
      if (context.scopes.length === 0) return [];

      const activities = await loadActivities(filters, context);
      const allowedScopeKeys = new Set(
        context.scopes.map((scope) => scopeKey(scope.systemhouseId, scope.customerId)),
      );
      const systemhouseById = new Map(context.systemhouses.map((row) => [row.id, row]));
      const customerByScope = new Map(
        context.customers.map((row) => [scopeKey(row.systemhouse_id, row.id), row]),
      );
      const projectBySource = new Map(
        context.projects.map((row) => [
          projectKey(row.systemhouse_id, row.customer_id, row.source_id),
          row,
        ]),
      );
      const workPackageBySource = new Map(
        context.workPackages.map((row) => [
          workPackageKey(row.systemhouse_id, row.customer_id, row.source_id),
          row,
        ]),
      );
      const referenceByKey = new Map(
        context.referenceValues
          .filter((row): row is ReferenceValueRow & { systemhouse_id: string } =>
            Boolean(row.systemhouse_id),
          )
          .map((row) => [referenceKey(row.systemhouse_id, row.key), row]),
      );
      const nowIso = new Date().toISOString();
      const result: ProjectControllingRow[] = [];

      for (const activity of activities) {
        const currentScopeKey = scopeKey(activity.systemhouse_id, activity.customer_id);
        if (!allowedScopeKeys.has(currentScopeKey)) continue;

        const systemhouse = systemhouseById.get(activity.systemhouse_id);
        const customer = customerByScope.get(currentScopeKey);
        if (!systemhouse || !customer) continue;

        const workPackage = activity.work_package_source_id
          ? workPackageBySource.get(
              workPackageKey(
                activity.systemhouse_id,
                activity.customer_id,
                activity.work_package_source_id,
              ),
            )
          : undefined;
        const project = workPackage?.project_source_id
          ? projectBySource.get(
              projectKey(
                activity.systemhouse_id,
                activity.customer_id,
                workPackage.project_source_id,
              ),
            )
          : undefined;
        const reference =
          workPackage?.category_observed && workPackage.category_key
            ? referenceByKey.get(referenceKey(activity.systemhouse_id, workPackage.category_key))
            : undefined;
        const state = workPackage ? categoryState(workPackage, reference, nowIso) : "unobserved";

        result.push({
          activityId: activity.source_id,
          activityDate: activity.activity_date,
          activityTitle: activity.title,
          durationHours: activity.duration_hours,
          billable: activity.billable,
          billingStatus: activity.billing_status,
          systemhouseId: systemhouse.id,
          systemhouseName: systemhouse.name,
          customerId: customer.id,
          customerName: customer.name,
          projectSourceId: project?.source_id ?? null,
          projectName: project?.name ?? null,
          workPackageSourceId: workPackage?.source_id ?? null,
          workPackageTitle: workPackage?.title ?? null,
          categoryObserved: workPackage?.category_observed ?? false,
          categoryKey: workPackage?.category_observed ? (workPackage.category_key ?? null) : null,
          categoryLabel: reference?.label ?? null,
          categoryState: state,
          projectPublishedAt: project?.published_at ?? null,
          workPackagePublishedAt: workPackage?.published_at ?? null,
          activityPublishedAt: activity.published_at,
          projectPublishedAt: project?.published_at ?? null,
          workPackagePublishedAt: workPackage?.published_at ?? null,
          activityPublishedAt: activity.published_at ?? null,
        });
      }

      return sortRows(result).slice(0, PROJECT_CONTROLLING_MAX_ACTIVITIES + 1);
    },

    async listScopeOptions(filters) {
      const context = await loadContext(filters);
      const options: ProjectControllingScopeOption[] = [];
      const seen = new Set<string>();
      const nowIso = new Date().toISOString();
      const systemhouseById = new Map(context.systemhouses.map((row) => [row.id, row]));
      const customerByScope = new Map(
        context.customers.map((row) => [scopeKey(row.systemhouse_id, row.id), row]),
      );
      const projectBySource = new Map(
        context.projects.map((row) => [
          projectKey(row.systemhouse_id, row.customer_id, row.source_id),
          row,
        ]),
      );
      const referenceByKey = new Map(
        context.referenceValues
          .filter((row): row is ReferenceValueRow & { systemhouse_id: string } =>
            Boolean(row.systemhouse_id),
          )
          .map((row) => [referenceKey(row.systemhouse_id, row.key), row]),
      );

      const add = (key: string, option: ProjectControllingScopeOption): void => {
        if (seen.has(key)) return;
        seen.add(key);
        options.push(option);
      };

      for (const scope of context.scopes) {
        const systemhouse = systemhouseById.get(scope.systemhouseId);
        const customer = customerByScope.get(scopeKey(scope.systemhouseId, scope.customerId));
        if (systemhouse) {
          add(`systemhouse:${systemhouse.id}`, {
            kind: "systemhouse",
            systemhouseId: systemhouse.id,
            label: systemhouse.name,
          });
        }
        if (customer) {
          add(`customer:${scopeKey(scope.systemhouseId, customer.id)}`, {
            kind: "customer",
            systemhouseId: scope.systemhouseId,
            customerId: customer.id,
            label: customer.name,
          });
        }
      }

      for (const project of context.projects) {
        add(
          `project:${projectKey(project.systemhouse_id, project.customer_id, project.source_id)}`,
          {
            kind: "project",
            systemhouseId: project.systemhouse_id,
            customerId: project.customer_id,
            projectSourceId: project.source_id,
            label: project.name,
          },
        );
      }

      for (const workPackage of context.workPackages) {
        const project = workPackage.project_source_id
          ? projectBySource.get(
              projectKey(
                workPackage.systemhouse_id,
                workPackage.customer_id,
                workPackage.project_source_id,
              ),
            )
          : undefined;
        add(
          `workPackage:${workPackageKey(
            workPackage.systemhouse_id,
            workPackage.customer_id,
            workPackage.source_id,
          )}`,
          {
            kind: "workPackage",
            systemhouseId: workPackage.systemhouse_id,
            customerId: workPackage.customer_id,
            projectSourceId: project?.source_id,
            workPackageSourceId: workPackage.source_id,
            label: workPackage.title,
          },
        );

        if (workPackage.category_observed && workPackage.category_key) {
          const reference = referenceByKey.get(
            referenceKey(workPackage.systemhouse_id, workPackage.category_key),
          );
          add(`category:${referenceKey(workPackage.systemhouse_id, workPackage.category_key)}`, {
            kind: "category",
            systemhouseId: workPackage.systemhouse_id,
            categoryKey: workPackage.category_key,
            label: reference?.label ?? workPackage.category_key,
            active: reference ? isReferenceActive(reference, nowIso) : false,
          });
        }
      }

      for (const reference of context.referenceValues) {
        if (!reference.systemhouse_id) continue;
        add(`category:${referenceKey(reference.systemhouse_id, reference.key)}`, {
          kind: "category",
          systemhouseId: reference.systemhouse_id,
          categoryKey: reference.key,
          label: reference.label,
          active: isReferenceActive(reference, nowIso),
        });
      }

      return sortOptions(options);
    },
  };
}
