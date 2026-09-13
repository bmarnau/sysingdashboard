import type {
  SharedActivityRecord,
  SharedCustomerProjectionSnapshot,
  SharedProjectRecord,
  SharedWorkPackageRecord,
} from "@/lib/customer-data/shared-projection-runtime";

/**
 * BSF-03 „Meine Kunden“ — providerneutrale Fachschicht.
 *
 * Ein Customer ist nur dann „mein Kunde“, wenn für den angemeldeten Benutzer
 * gleichzeitig gilt (Design §4, fail-closed):
 *   aktives Konto ∩ dashboard.view ∩ aktive Membership ∩ aktive aktuelle
 *   Responsibility ∩ Customer Access >= read ∩ Customer per RLS lesbar.
 *
 * Diese Datei kennt weder Supabase noch HTTP. Die Sicherheitsgrenze bleibt
 * serverseitig (RLS + `is_my_customer`); die Helfer hier bündeln nur das
 * Ergebnis für die Darstellung.
 */

/** Effektive Stufe des eigenen Customer Access (`write` schließt `read` ein). */
export type CustomerAccessLevel = "read" | "write";

export interface MyCustomerSummary {
  systemhouseId: string;
  customerId: string;
  name: string;
  status: string;
  /** Eigener Verantwortungsstatus (Lifecycle-Wert der eigenen Responsibility). */
  responsibilityStatus: string;
  /** Beginn der eigenen aktuellen Verantwortung (ISO-Zeitstempel). */
  responsibleSince: string;
  /** Read-/Write-Indikator aus dem eigenen, aktiven Customer Access. */
  accessLevel: CustomerAccessLevel;
}

export interface MyCustomerCandidate {
  systemhouseId: string;
  customerId: string;
  responsibilityStatus: string;
  responsibleSince: string;
  /**
   * `null`, wenn der Customer im Benutzerkontext nicht lesbar war (z. B.
   * fehlender Customer Access). Solche Kandidaten werden verworfen.
   */
  customer: { name: string; status: string } | null;
  /** `null`, wenn kein eigener aktiver, zeitlich gültiger Access existiert. */
  accessLevel: CustomerAccessLevel | null;
}

export interface MyCustomerDetail {
  customer: MyCustomerSummary;
  /**
   * Verantwortlicher Systemingenieur. Da „mein Kunde“ die eigene aktive
   * Verantwortung voraussetzt und je Kunde höchstens eine aktive aktuelle
   * Verantwortung existiert, ist dies stets der angemeldete Benutzer.
   */
  responsible: { userId: string; displayName: string };
  projection: SharedCustomerProjectionSnapshot;
}

/**
 * Persistenz-Port. Jede Methode läuft im Kontext des angemeldeten Benutzers;
 * ein Provider darf hier keinen privilegierten Client verwenden.
 */
export interface MyCustomersRepository {
  /** Eigene aktive Responsibilities inkl. per RLS lesbarem Customer und eigenem Access. */
  listCandidates(userId: string): Promise<MyCustomerCandidate[]>;
  /** Autoritative DB-Schnittmenge (`is_my_customer`). */
  isMyCustomer(input: {
    userId: string;
    systemhouseId: string;
    customerId: string;
  }): Promise<boolean>;
  /** Kundenkopf für einen bereits freigegebenen Scope. */
  readCustomer(input: {
    systemhouseId: string;
    customerId: string;
  }): Promise<{ name: string; status: string } | null>;
  /** Eigene aktive aktuelle Responsibility für einen freigegebenen Scope. */
  readOwnResponsibility(input: {
    userId: string;
    systemhouseId: string;
    customerId: string;
  }): Promise<{ status: string; validFrom: string } | null>;
  /** Effektive Stufe des eigenen aktiven Customer Access (nur eigene Zeilen). */
  readOwnAccessLevel(input: {
    userId: string;
    systemhouseId: string;
    customerId: string;
  }): Promise<CustomerAccessLevel | null>;
  /** Anzeigename des angemeldeten Benutzers (eigenes Profil). */
  readOwnDisplayName(userId: string): Promise<string | null>;
}

/** Höchste Stufe aus mehreren (eigenen) Access-Zeilen; `write` dominiert. */
export function effectiveAccessLevel(levels: readonly string[]): CustomerAccessLevel | null {
  if (levels.includes("write")) return "write";
  if (levels.includes("read")) return "read";
  return null;
}

function scopeKey(systemhouseId: string, customerId: string): string {
  return `${systemhouseId}::${customerId}`;
}

/**
 * Reine Auswahl-/Normalisierungslogik: verwirft Kandidaten ohne lesbaren
 * Customer, ohne eigenen aktiven Access oder ohne bestätigte DB-Schnittmenge,
 * dedupliziert je `(systemhouseId, customerId)` und sortiert stabil nach Name.
 */
export function selectMyCustomers(
  candidates: readonly MyCustomerCandidate[],
  confirmed: ReadonlySet<string>,
): MyCustomerSummary[] {
  const byScope = new Map<string, MyCustomerSummary>();
  for (const candidate of candidates) {
    if (!candidate.customer) continue;
    if (!candidate.accessLevel) continue;
    const key = scopeKey(candidate.systemhouseId, candidate.customerId);
    if (!confirmed.has(key)) continue;
    if (byScope.has(key)) continue;
    byScope.set(key, {
      systemhouseId: candidate.systemhouseId,
      customerId: candidate.customerId,
      name: candidate.customer.name,
      status: candidate.customer.status,
      responsibilityStatus: candidate.responsibilityStatus,
      responsibleSince: candidate.responsibleSince,
      accessLevel: candidate.accessLevel,
    });
  }
  return [...byScope.values()].sort(
    (a, b) => a.name.localeCompare(b.name, "de") || a.customerId.localeCompare(b.customerId),
  );
}

export function myCustomerScopeKey(systemhouseId: string, customerId: string): string {
  return scopeKey(systemhouseId, customerId);
}

/**
 * Liste „Meine Kunden“: Kandidaten aus dem Repository (RLS-gefiltert) werden
 * zusätzlich einzeln über `is_my_customer` bestätigt. Fehler bei der
 * Bestätigung führen fail-closed zum Ausschluss des Kandidaten.
 */
export async function listMyCustomers(
  repository: MyCustomersRepository,
  userId: string,
): Promise<MyCustomerSummary[]> {
  const candidates = await repository.listCandidates(userId);
  const readable = candidates.filter((candidate) => candidate.customer !== null);
  const checks = await Promise.all(
    readable.map(async (candidate) => {
      try {
        const ok = await repository.isMyCustomer({
          userId,
          systemhouseId: candidate.systemhouseId,
          customerId: candidate.customerId,
        });
        return ok ? scopeKey(candidate.systemhouseId, candidate.customerId) : null;
      } catch {
        return null;
      }
    }),
  );
  const confirmed = new Set(checks.filter((key): key is string => key !== null));
  return selectMyCustomers(readable, confirmed);
}

/* ------------------------------ Detail-Baum ------------------------------ */

export interface WorkPackageNode {
  workPackage: SharedWorkPackageRecord;
  activities: SharedActivityRecord[];
}

export interface ProjectNode {
  project: SharedProjectRecord;
  workPackages: WorkPackageNode[];
}

export interface CustomerProjectionTree {
  projects: ProjectNode[];
  /** Aktive Arbeitspakete ohne (aktive) Projektverknüpfung. */
  unassignedWorkPackages: WorkPackageNode[];
  /** Aktive Tätigkeiten ohne (aktive) Arbeitspaketverknüpfung. */
  unassignedActivities: SharedActivityRecord[];
  counts: { projects: number; workPackages: number; activities: number };
}

function byDateDesc(a: SharedActivityRecord, b: SharedActivityRecord): number {
  return b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "de");
}

/**
 * Baut aus dem flachen Shared-Projection-Snapshot die Hierarchie
 * Projekt -> Arbeitspaket -> Tätigkeit. Verknüpfungen laufen ausschließlich
 * über die vorhandenen `sourceId`-Referenzen; nicht auflösbare Verknüpfungen
 * werden sichtbar als „ohne Zuordnung“ geführt, nie verworfen.
 */
export function buildCustomerProjectionTree(
  snapshot: SharedCustomerProjectionSnapshot,
): CustomerProjectionTree {
  const activitiesByWorkPackage = new Map<string, SharedActivityRecord[]>();
  const unassignedActivities: SharedActivityRecord[] = [];
  const workPackageSourceIds = new Set(snapshot.workPackages.map((wp) => wp.sourceId));

  for (const activity of snapshot.activities) {
    const parent = activity.workPackageSourceId;
    if (parent && workPackageSourceIds.has(parent)) {
      const list = activitiesByWorkPackage.get(parent) ?? [];
      list.push(activity);
      activitiesByWorkPackage.set(parent, list);
    } else {
      unassignedActivities.push(activity);
    }
  }

  const projectSourceIds = new Set(snapshot.projects.map((project) => project.sourceId));
  const nodesByProject = new Map<string, WorkPackageNode[]>();
  const unassignedWorkPackages: WorkPackageNode[] = [];

  for (const workPackage of snapshot.workPackages) {
    const node: WorkPackageNode = {
      workPackage,
      activities: (activitiesByWorkPackage.get(workPackage.sourceId) ?? []).sort(byDateDesc),
    };
    const parent = workPackage.projectSourceId;
    if (parent && projectSourceIds.has(parent)) {
      const list = nodesByProject.get(parent) ?? [];
      list.push(node);
      nodesByProject.set(parent, list);
    } else {
      unassignedWorkPackages.push(node);
    }
  }

  const sortWorkPackages = (nodes: WorkPackageNode[]) =>
    nodes.sort((a, b) => a.workPackage.title.localeCompare(b.workPackage.title, "de"));

  const projects: ProjectNode[] = [...snapshot.projects]
    .sort((a, b) => a.name.localeCompare(b.name, "de"))
    .map((project) => ({
      project,
      workPackages: sortWorkPackages(nodesByProject.get(project.sourceId) ?? []),
    }));

  return {
    projects,
    unassignedWorkPackages: sortWorkPackages(unassignedWorkPackages),
    unassignedActivities: unassignedActivities.sort(byDateDesc),
    counts: {
      projects: snapshot.projects.length,
      workPackages: snapshot.workPackages.length,
      activities: snapshot.activities.length,
    },
  };
}
