/**
 * BSF-03B Cloud-Nutzdaten für Backup/Restore und administrativen JSON-Gesamtexport.
 *
 * Sicherheitsgrenze:
 * - Enthält interne Provenienz (Source-Revision/-Hash, Engineer-ID) und ist daher
 *   ausschließlich administrativer Sicherungsinhalt, nicht Kundenausgabe.
 * - Browser-Restore validiert dieses Paket vollständig, schreibt es aber NICHT
 *   nach Supabase zurück. Ein Cloud-Disaster-Restore erfolgt über den
 *   Datenbank-/Provider-Restorepfad.
 * - Keine Secrets, Tokens oder Zugangsdaten.
 */

export const PERFORMANCE_STATEMENT_BACKUP_VERSION = 1;

export interface PerformanceStatementBackupOverride {
  id: string;
  systemhouseId: string;
  customerId: string;
  activitySourceId: string;
  sourceRevision: number;
  sourceHash: string;
  sourceBillable: boolean;
  effectiveBillable: boolean;
  note: string;
  changedBy: string;
  changedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceStatementBackupRequest {
  id: string;
  systemhouseId: string;
  customerId: string;
  periodStart: string;
  periodEnd: string;
  action: "finalize" | "replace";
  replacesStatementId: string | null;
  expectedReviewFingerprint: string;
  requestedBy: string;
  requestedAt: string;
  resultStatementId: string | null;
}

export interface PerformanceStatementBackupStatement {
  id: string;
  seriesId: string;
  version: number;
  systemhouseId: string;
  customerId: string;
  customerNameSnapshot: string;
  periodStart: string;
  periodEnd: string;
  status: "finalized" | "superseded";
  finalizedBy: string;
  finalizedAt: string;
  sourceOldestPublishedAt: string | null;
  sourceLatestPublishedAt: string | null;
  reviewFingerprint: string;
  snapshotHash: string;
  itemCount: number;
  billableItemCount: number;
  billableHours: number;
  nonBillableHours: number;
  replacesStatementId: string | null;
  supersededByStatementId: string | null;
  createdAt: string;
}

export interface PerformanceStatementBackupItem {
  id: string;
  statementId: string;
  position: number;
  activitySourceId: string;
  sourceRevision: number;
  sourceHash: string;
  sourcePublishedAt: string;
  sourceEngineerId: string | null;
  activityDate: string;
  titleSnapshot: string;
  durationHours: number;
  sourceBillable: boolean;
  effectiveBillable: boolean;
  billingStatusSnapshot: string;
  projectSourceId: string | null;
  projectNameSnapshot: string;
  workPackageSourceId: string | null;
  workPackageTitleSnapshot: string;
  categoryKeySnapshot: string | null;
  categoryLabelSnapshot: string;
  createdAt: string;
}

export interface PerformanceStatementBackupClaim {
  id: string;
  systemhouseId: string;
  customerId: string;
  activitySourceId: string;
  statementId: string;
  claimedAt: string;
}

export interface PerformanceStatementBackupPayload {
  payloadVersion: number;
  capturedAt: string;
  overrides: PerformanceStatementBackupOverride[];
  requests: PerformanceStatementBackupRequest[];
  statements: PerformanceStatementBackupStatement[];
  items: PerformanceStatementBackupItem[];
  claims: PerformanceStatementBackupClaim[];
}

export interface PerformanceStatementBackupValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  counts: {
    overrides: number;
    requests: number;
    statements: number;
    items: number;
    claims: number;
  };
  activeClaims: Array<{ activitySourceId: string; statementId: string }>;
  snapshotHashes: Record<string, string>;
}

const SHA256 = /^[0-9a-f]{64}$/u;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const EPSILON = 0.000_001;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireArray(
  root: Record<string, unknown>,
  key: string,
  errors: string[],
): unknown[] {
  const value = root[key];
  if (!Array.isArray(value)) {
    errors.push(`Leistungsnachweis-Backup: '${key}' muss eine Liste sein.`);
    return [];
  }
  return value;
}

function requireString(
  row: Record<string, unknown>,
  key: string,
  where: string,
  errors: string[],
): string {
  const value = row[key];
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${where}: Pflichtfeld '${key}' fehlt oder ist ungültig.`);
    return "";
  }
  return value;
}

function requireNullableString(
  row: Record<string, unknown>,
  key: string,
  where: string,
  errors: string[],
): string | null {
  const value = row[key];
  if (value === null) return null;
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${where}: Feld '${key}' muss String oder null sein.`);
    return null;
  }
  return value;
}

function requireNumber(
  row: Record<string, unknown>,
  key: string,
  where: string,
  errors: string[],
): number {
  const value = row[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${where}: Pflichtfeld '${key}' muss eine endliche Zahl sein.`);
    return 0;
  }
  return value;
}

function requireBoolean(
  row: Record<string, unknown>,
  key: string,
  where: string,
  errors: string[],
): boolean {
  const value = row[key];
  if (typeof value !== "boolean") {
    errors.push(`${where}: Pflichtfeld '${key}' muss boolean sein.`);
    return false;
  }
  return value;
}

function requireSha256(value: string, field: string, where: string, errors: string[]): void {
  if (value && !SHA256.test(value)) {
    errors.push(`${where}: '${field}' ist kein kanonischer SHA-256-Hash.`);
  }
}

function requireIsoDate(value: string, field: string, where: string, errors: string[]): void {
  if (value && !ISO_DATE.test(value)) {
    errors.push(`${where}: '${field}' ist kein ISO-Datum YYYY-MM-DD.`);
  }
}

function checkUniqueId(
  id: string,
  seen: Set<string>,
  where: string,
  errors: string[],
): void {
  if (!id) return;
  if (seen.has(id)) errors.push(`${where}: doppelte ID '${id}'.`);
  seen.add(id);
}

function sameScope(
  left: PerformanceStatementBackupStatement,
  right: PerformanceStatementBackupStatement,
): boolean {
  return (
    left.systemhouseId === right.systemhouseId &&
    left.customerId === right.customerId &&
    left.periodStart === right.periodStart &&
    left.periodEnd === right.periodEnd
  );
}

function sumHours(items: readonly PerformanceStatementBackupItem[], billable: boolean): number {
  return items
    .filter((item) => item.effectiveBillable === billable)
    .reduce((sum, item) => sum + item.durationHours, 0);
}

export function validatePerformanceStatementBackupPayload(
  raw: unknown,
): PerformanceStatementBackupValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const counts = { overrides: 0, requests: 0, statements: 0, items: 0, claims: 0 };
  const activeClaims: Array<{ activitySourceId: string; statementId: string }> = [];
  const snapshotHashes: Record<string, string> = {};

  if (!isRecord(raw)) {
    return {
      ok: false,
      errors: ["Leistungsnachweis-Backup enthält kein gültiges Objekt."],
      warnings,
      counts,
      activeClaims,
      snapshotHashes,
    };
  }

  const payloadVersion = raw.payloadVersion;
  if (typeof payloadVersion !== "number" || !Number.isInteger(payloadVersion)) {
    errors.push("Leistungsnachweis-Backup ohne gültige payloadVersion.");
  } else if (payloadVersion > PERFORMANCE_STATEMENT_BACKUP_VERSION) {
    errors.push(
      `Leistungsnachweis-Backup nutzt Version ${payloadVersion}, unterstützt wird ${PERFORMANCE_STATEMENT_BACKUP_VERSION}.`,
    );
  }

  if (typeof raw.capturedAt !== "string" || raw.capturedAt.length === 0) {
    errors.push("Leistungsnachweis-Backup ohne capturedAt.");
  }

  const statementIds = new Set<string>();
  const itemIds = new Set<string>();
  const requestIds = new Set<string>();
  const overrideIds = new Set<string>();
  const claimIds = new Set<string>();
  const seriesVersions = new Set<string>();

  const statements: PerformanceStatementBackupStatement[] = [];
  for (const [index, candidate] of requireArray(raw, "statements", errors).entries()) {
    const where = `Leistungsnachweis-Statement #${index + 1}`;
    if (!isRecord(candidate)) {
      errors.push(`${where}: kein gültiges Objekt.`);
      continue;
    }

    const id = requireString(candidate, "id", where, errors);
    checkUniqueId(id, statementIds, where, errors);
    const seriesId = requireString(candidate, "seriesId", where, errors);
    const version = requireNumber(candidate, "version", where, errors);
    const systemhouseId = requireString(candidate, "systemhouseId", where, errors);
    const customerId = requireString(candidate, "customerId", where, errors);
    const customerNameSnapshot = requireString(
      candidate,
      "customerNameSnapshot",
      where,
      errors,
    );
    const periodStart = requireString(candidate, "periodStart", where, errors);
    const periodEnd = requireString(candidate, "periodEnd", where, errors);
    requireIsoDate(periodStart, "periodStart", where, errors);
    requireIsoDate(periodEnd, "periodEnd", where, errors);
    const status = requireString(candidate, "status", where, errors);
    if (status !== "finalized" && status !== "superseded") {
      errors.push(`${where}: Status '${status}' ist ungültig.`);
    }
    const finalizedBy = requireString(candidate, "finalizedBy", where, errors);
    const finalizedAt = requireString(candidate, "finalizedAt", where, errors);
    const sourceOldestPublishedAt = requireNullableString(
      candidate,
      "sourceOldestPublishedAt",
      where,
      errors,
    );
    const sourceLatestPublishedAt = requireNullableString(
      candidate,
      "sourceLatestPublishedAt",
      where,
      errors,
    );
    const reviewFingerprint = requireString(candidate, "reviewFingerprint", where, errors);
    const snapshotHash = requireString(candidate, "snapshotHash", where, errors);
    requireSha256(reviewFingerprint, "reviewFingerprint", where, errors);
    requireSha256(snapshotHash, "snapshotHash", where, errors);
    const itemCount = requireNumber(candidate, "itemCount", where, errors);
    const billableItemCount = requireNumber(candidate, "billableItemCount", where, errors);
    const billableHours = requireNumber(candidate, "billableHours", where, errors);
    const nonBillableHours = requireNumber(candidate, "nonBillableHours", where, errors);
    const replacesStatementId = requireNullableString(
      candidate,
      "replacesStatementId",
      where,
      errors,
    );
    const supersededByStatementId = requireNullableString(
      candidate,
      "supersededByStatementId",
      where,
      errors,
    );
    const createdAt = requireString(candidate, "createdAt", where, errors);

    if (!Number.isInteger(version) || version < 1) {
      errors.push(`${where}: version muss eine positive Ganzzahl sein.`);
    }
    for (const [field, value] of [
      ["itemCount", itemCount],
      ["billableItemCount", billableItemCount],
    ] as const) {
      if (!Number.isInteger(value) || value < 0) {
        errors.push(`${where}: ${field} muss eine nichtnegative Ganzzahl sein.`);
      }
    }
    if (billableHours < 0 || nonBillableHours < 0) {
      errors.push(`${where}: Stunden dürfen nicht negativ sein.`);
    }

    const seriesVersion = `${seriesId}:${version}`;
    if (seriesVersions.has(seriesVersion)) {
      errors.push(`${where}: doppelte Serienversion ${seriesVersion}.`);
    }
    seriesVersions.add(seriesVersion);

    const typed: PerformanceStatementBackupStatement = {
      id,
      seriesId,
      version,
      systemhouseId,
      customerId,
      customerNameSnapshot,
      periodStart,
      periodEnd,
      status: status === "superseded" ? "superseded" : "finalized",
      finalizedBy,
      finalizedAt,
      sourceOldestPublishedAt,
      sourceLatestPublishedAt,
      reviewFingerprint,
      snapshotHash,
      itemCount,
      billableItemCount,
      billableHours,
      nonBillableHours,
      replacesStatementId,
      supersededByStatementId,
      createdAt,
    };
    statements.push(typed);
    snapshotHashes[id] = snapshotHash;
    counts.statements++;
  }

  const statementById = new Map(statements.map((statement) => [statement.id, statement]));

  const items: PerformanceStatementBackupItem[] = [];
  for (const [index, candidate] of requireArray(raw, "items", errors).entries()) {
    const where = `Leistungsnachweis-Item #${index + 1}`;
    if (!isRecord(candidate)) {
      errors.push(`${where}: kein gültiges Objekt.`);
      continue;
    }
    const id = requireString(candidate, "id", where, errors);
    checkUniqueId(id, itemIds, where, errors);
    const statementId = requireString(candidate, "statementId", where, errors);
    if (statementId && !statementById.has(statementId)) {
      errors.push(`${where}: verweist auf unbekanntes Statement '${statementId}'.`);
    }
    const position = requireNumber(candidate, "position", where, errors);
    const activitySourceId = requireString(candidate, "activitySourceId", where, errors);
    const sourceRevision = requireNumber(candidate, "sourceRevision", where, errors);
    const sourceHash = requireString(candidate, "sourceHash", where, errors);
    const sourcePublishedAt = requireString(candidate, "sourcePublishedAt", where, errors);
    const sourceEngineerId = requireNullableString(
      candidate,
      "sourceEngineerId",
      where,
      errors,
    );
    const activityDate = requireString(candidate, "activityDate", where, errors);
    requireIsoDate(activityDate, "activityDate", where, errors);
    const titleSnapshot = requireString(candidate, "titleSnapshot", where, errors);
    const durationHours = requireNumber(candidate, "durationHours", where, errors);
    const sourceBillable = requireBoolean(candidate, "sourceBillable", where, errors);
    const effectiveBillable = requireBoolean(candidate, "effectiveBillable", where, errors);
    const billingStatusSnapshot = requireString(
      candidate,
      "billingStatusSnapshot",
      where,
      errors,
    );
    const projectSourceId = requireNullableString(
      candidate,
      "projectSourceId",
      where,
      errors,
    );
    const projectNameSnapshot = requireString(
      candidate,
      "projectNameSnapshot",
      where,
      errors,
    );
    const workPackageSourceId = requireNullableString(
      candidate,
      "workPackageSourceId",
      where,
      errors,
    );
    const workPackageTitleSnapshot = requireString(
      candidate,
      "workPackageTitleSnapshot",
      where,
      errors,
    );
    const categoryKeySnapshot = requireNullableString(
      candidate,
      "categoryKeySnapshot",
      where,
      errors,
    );
    const categoryLabelSnapshot = requireString(
      candidate,
      "categoryLabelSnapshot",
      where,
      errors,
    );
    const createdAt = requireString(candidate, "createdAt", where, errors);

    if (!Number.isInteger(position) || position < 1) {
      errors.push(`${where}: position muss eine positive Ganzzahl sein.`);
    }
    if (!Number.isInteger(sourceRevision) || sourceRevision < 1) {
      errors.push(`${where}: sourceRevision muss eine positive Ganzzahl sein.`);
    }
    if (durationHours < 0) {
      errors.push(`${where}: durationHours darf nicht negativ sein.`);
    }

    items.push({
      id,
      statementId,
      position,
      activitySourceId,
      sourceRevision,
      sourceHash,
      sourcePublishedAt,
      sourceEngineerId,
      activityDate,
      titleSnapshot,
      durationHours,
      sourceBillable,
      effectiveBillable,
      billingStatusSnapshot,
      projectSourceId,
      projectNameSnapshot,
      workPackageSourceId,
      workPackageTitleSnapshot,
      categoryKeySnapshot,
      categoryLabelSnapshot,
      createdAt,
    });
    counts.items++;
  }

  const itemsByStatement = new Map<string, PerformanceStatementBackupItem[]>();
  for (const item of items) {
    const rows = itemsByStatement.get(item.statementId) ?? [];
    rows.push(item);
    itemsByStatement.set(item.statementId, rows);
  }

  for (const statement of statements) {
    const statementItems = itemsByStatement.get(statement.id) ?? [];
    if (statement.itemCount !== statementItems.length) {
      errors.push(
        `Statement ${statement.id}: itemCount=${statement.itemCount}, vorhanden=${statementItems.length}.`,
      );
    }
    const billableItems = statementItems.filter((item) => item.effectiveBillable);
    if (statement.billableItemCount !== billableItems.length) {
      errors.push(
        `Statement ${statement.id}: billableItemCount=${statement.billableItemCount}, vorhanden=${billableItems.length}.`,
      );
    }
    const billableHours = sumHours(statementItems, true);
    const nonBillableHours = sumHours(statementItems, false);
    if (Math.abs(statement.billableHours - billableHours) > EPSILON) {
      errors.push(
        `Statement ${statement.id}: billableHours=${statement.billableHours}, aus Items=${billableHours}.`,
      );
    }
    if (Math.abs(statement.nonBillableHours - nonBillableHours) > EPSILON) {
      errors.push(
        `Statement ${statement.id}: nonBillableHours=${statement.nonBillableHours}, aus Items=${nonBillableHours}.`,
      );
    }

    if (statement.replacesStatementId) {
      const previous = statementById.get(statement.replacesStatementId);
      if (!previous) {
        errors.push(
          `Statement ${statement.id}: replacesStatementId '${statement.replacesStatementId}' existiert nicht.`,
        );
      } else {
        if (previous.seriesId !== statement.seriesId) {
          errors.push(`Statement ${statement.id}: Ersatz verweist auf eine andere Serie.`);
        }
        if (!sameScope(previous, statement)) {
          errors.push(`Statement ${statement.id}: Ersatz-Scope/Zeitraum weicht ab.`);
        }
        if (statement.version !== previous.version + 1) {
          errors.push(
            `Statement ${statement.id}: Version folgt nicht direkt auf die ersetzte Version.`,
          );
        }
        if (previous.supersededByStatementId !== statement.id) {
          errors.push(
            `Statement ${previous.id}: supersededByStatementId ist nicht invers zu replacesStatementId.`,
          );
        }
        if (previous.status !== "superseded") {
          errors.push(`Statement ${previous.id}: ersetzte Version ist nicht 'superseded'.`);
        }
      }
    } else if (statement.version !== 1) {
      errors.push(`Statement ${statement.id}: Version > 1 ohne replacesStatementId.`);
    }

    if (statement.status === "finalized" && statement.supersededByStatementId !== null) {
      errors.push(`Statement ${statement.id}: finalized darf keinen supersededBy-Zeiger haben.`);
    }
    if (statement.status === "superseded" && statement.supersededByStatementId === null) {
      errors.push(`Statement ${statement.id}: superseded benötigt supersededByStatementId.`);
    }
  }

  for (const [index, candidate] of requireArray(raw, "claims", errors).entries()) {
    const where = `Leistungsnachweis-Claim #${index + 1}`;
    if (!isRecord(candidate)) {
      errors.push(`${where}: kein gültiges Objekt.`);
      continue;
    }
    const id = requireString(candidate, "id", where, errors);
    checkUniqueId(id, claimIds, where, errors);
    requireString(candidate, "systemhouseId", where, errors);
    requireString(candidate, "customerId", where, errors);
    const activitySourceId = requireString(candidate, "activitySourceId", where, errors);
    const statementId = requireString(candidate, "statementId", where, errors);
    requireString(candidate, "claimedAt", where, errors);

    const statement = statementById.get(statementId);
    if (!statement) {
      errors.push(`${where}: Claim verweist auf unbekanntes Statement '${statementId}'.`);
    } else if (
      statement.status !== "finalized" ||
      statement.supersededByStatementId !== null
    ) {
      errors.push(
        `${where}: Claim darf nur auf die aktive finalisierte Statement-Version verweisen.`,
      );
    } else {
      activeClaims.push({ activitySourceId, statementId });
    }
    counts.claims++;
  }

  for (const [index, candidate] of requireArray(raw, "requests", errors).entries()) {
    const where = `Leistungsnachweis-Request #${index + 1}`;
    if (!isRecord(candidate)) {
      errors.push(`${where}: kein gültiges Objekt.`);
      continue;
    }
    const id = requireString(candidate, "id", where, errors);
    checkUniqueId(id, requestIds, where, errors);
    const systemhouseId = requireString(candidate, "systemhouseId", where, errors);
    const customerId = requireString(candidate, "customerId", where, errors);
    const periodStart = requireString(candidate, "periodStart", where, errors);
    const periodEnd = requireString(candidate, "periodEnd", where, errors);
    const action = requireString(candidate, "action", where, errors);
    const replacesStatementId = requireNullableString(
      candidate,
      "replacesStatementId",
      where,
      errors,
    );
    const expectedReviewFingerprint = requireString(
      candidate,
      "expectedReviewFingerprint",
      where,
      errors,
    );
    requireSha256(
      expectedReviewFingerprint,
      "expectedReviewFingerprint",
      where,
      errors,
    );
    requireString(candidate, "requestedBy", where, errors);
    requireString(candidate, "requestedAt", where, errors);
    const resultStatementId = requireNullableString(
      candidate,
      "resultStatementId",
      where,
      errors,
    );

    if (action !== "finalize" && action !== "replace") {
      errors.push(`${where}: action '${action}' ist ungültig.`);
    }
    if (action === "finalize" && replacesStatementId !== null) {
      errors.push(`${where}: finalize darf kein replacesStatementId enthalten.`);
    }
    if (action === "replace" && replacesStatementId === null) {
      errors.push(`${where}: replace benötigt replacesStatementId.`);
    }
    if (resultStatementId) {
      const result = statementById.get(resultStatementId);
      if (!result) {
        errors.push(
          `${where}: resultStatementId '${resultStatementId}' existiert nicht.`,
        );
      } else if (
        result.systemhouseId !== systemhouseId ||
        result.customerId !== customerId ||
        result.periodStart !== periodStart ||
        result.periodEnd !== periodEnd
      ) {
        errors.push(`${where}: Ergebnis-Statement liegt außerhalb des Request-Scopes.`);
      } else if (result.reviewFingerprint !== expectedReviewFingerprint) {
        errors.push(`${where}: Review-Fingerprint stimmt nicht mit dem Ergebnis überein.`);
      }
    }
    counts.requests++;
  }

  for (const [index, candidate] of requireArray(raw, "overrides", errors).entries()) {
    const where = `Leistungsnachweis-Override #${index + 1}`;
    if (!isRecord(candidate)) {
      errors.push(`${where}: kein gültiges Objekt.`);
      continue;
    }
    const id = requireString(candidate, "id", where, errors);
    checkUniqueId(id, overrideIds, where, errors);
    requireString(candidate, "systemhouseId", where, errors);
    requireString(candidate, "customerId", where, errors);
    requireString(candidate, "activitySourceId", where, errors);
    const sourceRevision = requireNumber(candidate, "sourceRevision", where, errors);
    if (!Number.isInteger(sourceRevision) || sourceRevision < 1) {
      errors.push(`${where}: sourceRevision muss eine positive Ganzzahl sein.`);
    }
    requireString(candidate, "sourceHash", where, errors);
    requireBoolean(candidate, "sourceBillable", where, errors);
    requireBoolean(candidate, "effectiveBillable", where, errors);
    if (typeof candidate.note !== "string") {
      errors.push(`${where}: note muss ein String sein.`);
    }
    requireString(candidate, "changedBy", where, errors);
    requireString(candidate, "changedAt", where, errors);
    requireString(candidate, "createdAt", where, errors);
    requireString(candidate, "updatedAt", where, errors);
    counts.overrides++;
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    counts,
    activeClaims: activeClaims.sort((a, b) =>
      a.activitySourceId.localeCompare(b.activitySourceId),
    ),
    snapshotHashes,
  };
}
