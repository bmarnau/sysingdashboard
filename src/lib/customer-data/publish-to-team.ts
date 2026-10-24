import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";
import {
  buildSharedDataMigrationPlan,
  normalizeLegacyCustomerName,
} from "@/lib/customer-data/migration";
import {
  prepareSharedCustomerPublishBatch,
  type SharedProjectionSkip,
  type SharedProjectionSkipReason,
  type SharedProjectionUnresolved,
} from "@/lib/customer-data/shared-projection-contract";
import type { SharedCustomerProjectionSnapshot } from "@/lib/customer-data/shared-projection-runtime";

/**
 * L0b: "An Team veröffentlichen".
 *
 * Providerneutrale Fachlogik für den Veröffentlichungsweg lokal -> gemeinsame
 * Projektion. Diese Datei schreibt nichts. Sie baut (1) die Eingabe für
 * `publishSharedCustomerProjectionFn` aus dem lokalen Bestand und (2) eine
 * Vorschau, die dieselbe Vertragslogik wie der Server verwendet.
 *
 * Sicherheitsprinzipien:
 * - Kein Raten von Kunden: nur ausdrücklich zugeordnete lokale Namen werden
 *   einem Kunden zugeordnet (siehe `LegacyNameSelection`).
 * - Fail-closed: Ungültige lokale Einträge sperren die Veröffentlichung, statt
 *   still aus dem Snapshot zu fallen. Der Server interpretiert fehlende Sources
 *   als zurückgezogen (Soft Withdraw), ein stilles Weglassen wäre daher kein
 *   neutraler Vorgang.
 * - Zurückziehungen werden vorab geschätzt und müssen bestätigt werden.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MAX_SOURCE_ID = 255;
const MAX_TEXT = 2000;
const MAX_CLIENT = 500;

export interface LocalSnapshot {
  projects: readonly Project[];
  workPackages: readonly WorkPackage[];
  activities: readonly Activity[];
}

export interface PublishCustomerScope {
  systemhouseId: string;
  customerId: string;
}

/** Ausdrücklich gewählte lokale Kundennamen, die zum Zielkunden gehören. */
export type LegacyNameSelection = readonly string[];

export interface PublishInvalidEntry {
  entityType: "project" | "workpackage" | "activity";
  sourceId: string;
  problem: string;
}

export interface PublishPayload {
  systemhouseId: string;
  customerId: string;
  snapshotComplete: true;
  customerMappings: Array<{ legacyName: string; customerId: string }>;
  projects: Array<{ id: string; name: string; client: string; status: Project["status"] }>;
  workPackages: Array<{
    id: string;
    title: string;
    projectId: string | null;
    client?: string;
    status: WorkPackage["status"];
    priority: WorkPackage["priority"];
    due?: string;
    categoryKey: string | null;
  }>;
  activities: Array<{
    id: string;
    title: string;
    workPackageId: string | null;
    engineerId?: string;
    client?: string;
    date: string;
    duration: number;
    hourlyRate: number;
    billable: boolean;
    billingStatus: Activity["billingStatus"];
  }>;
}

export type PublishReasonKey = SharedProjectionSkipReason | SharedProjectionUnresolved["reason"];

export const PUBLISH_REASON_LABEL: Record<PublishReasonKey, string> = {
  source_id_collision: "Dieselbe ID kommt lokal mehrfach vor",
  parent_missing: "Übergeordnetes Objekt fehlt lokal",
  parent_unpublishable: "Übergeordnetes Objekt ist nicht veröffentlichbar",
  engineer_missing: "Tätigkeit hat keine Ingenieur-Kennung",
  engineer_mismatch: "Tätigkeit gehört einem anderen Ingenieur",
  mapping_missing: "Lokaler Kundenname ist keinem Kunden zugeordnet",
  missing_customer_context: "Am Objekt ist kein Kunde angegeben",
  customer_context_conflict: "Am Objekt stehen widersprüchliche Kundennamen",
};

export interface PublishPreview {
  /** Anzahl der Objekte, die veröffentlicht werden. */
  publish: { projects: number; workPackages: number; activities: number };
  /** Vom Vertrag übersprungene Objekte mit Grund (gehören zum Zielkunden). */
  skipped: SharedProjectionSkip[];
  /** Objekte, die keinem Kunden zugeordnet sind bzw. zu keinem Zielkunden gehören. */
  unresolved: SharedProjectionUnresolved[];
  /** Geschätzte Zurückziehungen bereits veröffentlichter Objekte (eigener Publisher). */
  withdrawals: { projects: number; workPackages: number; activities: number };
  /** Lokale Einträge, die der Server ablehnen würde. Sperrt die Veröffentlichung. */
  invalid: PublishInvalidEntry[];
  /** Beobachtete lokale Kundennamen (Originalschreibweise). */
  localCustomerNames: string[];
  /** true, wenn nichts blockiert und mindestens ein Objekt veröffentlicht wird. */
  canPublish: boolean;
}

function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_RE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function checkId(
  entityType: PublishInvalidEntry["entityType"],
  id: string | undefined,
  invalid: PublishInvalidEntry[],
): boolean {
  const trimmed = (id ?? "").trim();
  if (!trimmed) {
    invalid.push({ entityType, sourceId: id ?? "", problem: "Keine ID" });
    return false;
  }
  if (trimmed.length > MAX_SOURCE_ID) {
    invalid.push({ entityType, sourceId: trimmed.slice(0, 40), problem: "ID zu lang" });
    return false;
  }
  return true;
}

function checkText(
  entityType: PublishInvalidEntry["entityType"],
  id: string,
  label: string,
  value: string | undefined,
  max: number,
  invalid: PublishInvalidEntry[],
): void {
  if ((value ?? "").length > max) {
    invalid.push({ entityType, sourceId: id, problem: `${label} länger als ${max} Zeichen` });
  }
}

/** Findet lokale Einträge, die der Server-Vertrag ablehnen würde. */
export function findInvalidEntries(snapshot: LocalSnapshot): PublishInvalidEntry[] {
  const invalid: PublishInvalidEntry[] = [];

  for (const project of snapshot.projects) {
    if (!checkId("project", project.id, invalid)) continue;
    checkText("project", project.id, "Name", project.name, MAX_TEXT, invalid);
    checkText("project", project.id, "Kunde", project.client, MAX_CLIENT, invalid);
  }

  for (const workPackage of snapshot.workPackages) {
    if (!checkId("workpackage", workPackage.id, invalid)) continue;
    checkText("workpackage", workPackage.id, "Titel", workPackage.title, MAX_TEXT, invalid);
    checkText("workpackage", workPackage.id, "Kunde", workPackage.client, MAX_CLIENT, invalid);
    const due = (workPackage.due ?? "").trim();
    if (due !== "" && !isValidIsoDate(due)) {
      invalid.push({
        entityType: "workpackage",
        sourceId: workPackage.id,
        problem: "Fälligkeit ist kein gültiges Datum (JJJJ-MM-TT)",
      });
    }
  }

  for (const activity of snapshot.activities) {
    if (!checkId("activity", activity.id, invalid)) continue;
    checkText("activity", activity.id, "Titel", activity.title, MAX_TEXT, invalid);
    checkText("activity", activity.id, "Kunde", activity.client, MAX_CLIENT, invalid);
    if (!isValidIsoDate(activity.date)) {
      invalid.push({
        entityType: "activity",
        sourceId: activity.id,
        problem: "Datum ist kein gültiges Datum (JJJJ-MM-TT)",
      });
    }
    if (!Number.isFinite(activity.duration) || activity.duration < 0) {
      invalid.push({ entityType: "activity", sourceId: activity.id, problem: "Ungültige Dauer" });
    }
    if (!Number.isFinite(activity.hourlyRate) || activity.hourlyRate < 0) {
      invalid.push({
        entityType: "activity",
        sourceId: activity.id,
        problem: "Ungültiger Stundensatz",
      });
    }
  }

  return invalid;
}

/** Beobachtete lokale Kundennamen, je normalisiertem Namen eine Originalschreibweise. */
export function collectLocalCustomerNames(snapshot: LocalSnapshot): string[] {
  const byNormalized = new Map<string, string>();
  const add = (value: string | undefined) => {
    const observed = value?.trim();
    if (!observed) return;
    const key = normalizeLegacyCustomerName(observed);
    if (key && !byNormalized.has(key)) byNormalized.set(key, observed);
  };
  snapshot.projects.forEach((project) => add(project.client));
  snapshot.workPackages.forEach((workPackage) => add(workPackage.client));
  snapshot.activities.forEach((activity) => add(activity.client));
  return [...byNormalized.values()].sort((a, b) => a.localeCompare(b, "de"));
}

/**
 * Entscheidung 2026-10-24: Der lokale Bestand ist Single-Engineer; Tätigkeiten ohne echte
 * Kennung (leer oder lokale Kosmetik wie "MH") gehören dem Veröffentlichenden. Eine echte
 * fremde Kennung bleibt erhalten und wird vom Server weiter als `engineer_mismatch`
 * übersprungen, damit niemand Tätigkeiten anderer Konten veröffentlicht.
 */
export function effectiveEngineerId(
  activity: Pick<Activity, "engineerId">,
  publisherUserId: string,
): string {
  const own = activity.engineerId?.trim();
  return own && UUID_RE.test(own) ? own : publisherUserId;
}

/**
 * Baut die Server-Eingabe. Aufrufer müssen vorher `findInvalidEntries` prüfen;
 * Texte werden hier bewusst NICHT gekürzt, damit nichts still verändert wird.
 */
export function buildPublishPayload(input: {
  scope: PublishCustomerScope;
  snapshot: LocalSnapshot;
  selectedLegacyNames: LegacyNameSelection;
  /** Konto des Veröffentlichenden; Tätigkeiten ohne echte Ingenieur-Kennung werden ihm zugeordnet. */
  publisherUserId: string;
}): PublishPayload {
  const { scope, snapshot } = input;
  const seen = new Set<string>();
  const customerMappings: PublishPayload["customerMappings"] = [];
  for (const name of input.selectedLegacyNames) {
    const trimmed = name.trim();
    const key = normalizeLegacyCustomerName(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    customerMappings.push({ legacyName: trimmed, customerId: scope.customerId });
  }

  return {
    systemhouseId: scope.systemhouseId,
    customerId: scope.customerId,
    snapshotComplete: true,
    customerMappings,
    projects: snapshot.projects.map((project) => ({
      id: project.id.trim(),
      name: project.name,
      client: project.client ?? "",
      status: project.status,
    })),
    workPackages: snapshot.workPackages.map((workPackage) => ({
      id: workPackage.id.trim(),
      title: workPackage.title,
      projectId: workPackage.projectId ? workPackage.projectId.trim() : null,
      client: workPackage.client,
      status: workPackage.status,
      priority: workPackage.priority,
      due: workPackage.due?.trim() || undefined,
      categoryKey: workPackage.categoryKey ?? null,
    })),
    activities: snapshot.activities.map((activity) => ({
      id: activity.id.trim(),
      title: activity.title,
      workPackageId: activity.workPackageId ? activity.workPackageId.trim() : null,
      // Nur echte Kennungen weiterreichen; lokale Kosmetik-IDs würden den Server-Vertrag brechen.
      engineerId: effectiveEngineerId(activity, input.publisherUserId),
      client: activity.client,
      date: activity.date,
      duration: activity.duration,
      hourlyRate: activity.hourlyRate,
      billable: activity.billable,
      billingStatus: activity.billingStatus,
    })),
  };
}

/**
 * Vorschau mit demselben Vertragscode wie der Server. Der Server rechnet bei der
 * Veröffentlichung erneut und bleibt maßgeblich.
 */
export function previewPublish(input: {
  scope: PublishCustomerScope;
  snapshot: LocalSnapshot;
  selectedLegacyNames: LegacyNameSelection;
  publisherUserId: string;
  /** Aktuell veröffentlichter Stand des Zielkunden; `null`, wenn unbekannt. */
  current: SharedCustomerProjectionSnapshot | null;
}): PublishPreview {
  const invalid = findInvalidEntries(input.snapshot);
  const localCustomerNames = collectLocalCustomerNames(input.snapshot);

  if (invalid.length > 0) {
    return {
      publish: { projects: 0, workPackages: 0, activities: 0 },
      skipped: [],
      unresolved: [],
      withdrawals: { projects: 0, workPackages: 0, activities: 0 },
      invalid,
      localCustomerNames,
      canPublish: false,
    };
  }

  const payload = buildPublishPayload({
    scope: input.scope,
    snapshot: input.snapshot,
    selectedLegacyNames: input.selectedLegacyNames,
    publisherUserId: input.publisherUserId,
  });
  const plan = buildSharedDataMigrationPlan({
    systemhouseId: payload.systemhouseId,
    projects: input.snapshot.projects as Project[],
    workPackages: input.snapshot.workPackages.map((workPackage) => ({
      ...workPackage,
      due: workPackage.due?.trim() || undefined,
    })) as WorkPackage[],
    activities: input.snapshot.activities.map((activity) => ({
      ...activity,
      engineerId: effectiveEngineerId(activity, input.publisherUserId),
    })) as Activity[],
    customerMappings: payload.customerMappings,
  });
  const batch = prepareSharedCustomerPublishBatch({
    plan,
    customerId: input.scope.customerId,
    publisherUserId: input.publisherUserId,
  });

  const observed = {
    projects: new Set(plan.projects.map((entry) => entry.id)),
    workPackages: new Set(plan.workPackages.map((entry) => entry.id)),
    activities: new Set(plan.activities.map((entry) => entry.id)),
  };
  const mine = <T extends { sourceId: string; publishedBy: string }>(
    rows: readonly T[] | undefined,
    seenIds: ReadonlySet<string>,
  ) =>
    (rows ?? []).filter(
      (row) => row.publishedBy === input.publisherUserId && !seenIds.has(row.sourceId),
    ).length;

  const withdrawals = {
    projects: mine(input.current?.projects, observed.projects),
    workPackages: mine(input.current?.workPackages, observed.workPackages),
    activities: mine(input.current?.activities, observed.activities),
  };

  const publish = {
    projects: batch.projects.length,
    workPackages: batch.workPackages.length,
    activities: batch.activities.length,
  };

  return {
    publish,
    skipped: batch.skipped,
    unresolved: batch.unresolved,
    withdrawals,
    invalid,
    localCustomerNames,
    canPublish: publish.projects + publish.workPackages + publish.activities > 0,
  };
}

/** Zählt Gründe für die kompakte Anzeige. */
export function groupByReason<T extends { reason: PublishReasonKey }>(
  entries: readonly T[],
): Array<{ reason: PublishReasonKey; label: string; count: number }> {
  const counts = new Map<PublishReasonKey, number>();
  for (const entry of entries) counts.set(entry.reason, (counts.get(entry.reason) ?? 0) + 1);
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, label: PUBLISH_REASON_LABEL[reason], count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "de"));
}

/* ------------------- Gemerkte Zuordnung (nur dieses Gerät) ------------------- */

const MAPPING_KEY_PREFIX = "sysing.publish-name-selection.v1";

function mappingKey(userId: string, customerId: string): string {
  return `${MAPPING_KEY_PREFIX}:${userId}:${customerId}`;
}

/** Gemerkte Namensauswahl je Benutzer und Kunde; nie ein Fehler, nie ein Raten. */
export function readStoredNameSelection(userId: string, customerId: string): string[] {
  try {
    const raw = window.localStorage.getItem(mappingKey(userId, customerId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeStoredNameSelection(
  userId: string,
  customerId: string,
  names: readonly string[],
): void {
  try {
    window.localStorage.setItem(mappingKey(userId, customerId), JSON.stringify([...names]));
  } catch {
    // Speicher nicht verfügbar: Auswahl gilt nur für diese Sitzung.
  }
}
