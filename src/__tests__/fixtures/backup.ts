/**
 * Fixtures für die Backup-/Restore-/IO-Test-Suite (Prompt 2A.6).
 *
 * Erzeugt deterministische Snapshots im gleichen Format, das
 * `BackupService.createBackup()` schreibt, und liefert Helfer, um
 * absichtlich kaputte ZIPs zu bauen.
 */
import { strToU8, zipSync, unzipSync, strFromU8 } from "fflate";
import type { PerformanceStatementBackupPayload } from "@/lib/backup/performance-statement-payload";

export interface BackupFixtureOptions {
  projectName?: string;
  version?: number;
  createdAt?: string;
  extraData?: Record<string, unknown>;
  includeManifest?: boolean;
  includeReadme?: boolean;
  includeInstall?: boolean;
  includeEnv?: boolean;
  archive?: Array<Record<string, unknown>>;
}

export function buildValidBackupZip(opts: BackupFixtureOptions = {}): Uint8Array {
  const project = opts.projectName ?? "dashboard";
  const data: Record<string, unknown> = {
    "engineer-dashboard:profile": { name: "Alice", role: "Systemingenieur" },
    "engineer-dashboard:settings": { locale: "de", period: "month" },
    ...(opts.extraData ?? {}),
  };
  const manifest = {
    version: opts.version ?? 1,
    project,
    createdAt: opts.createdAt ?? "2026-01-01T00:00:00.000Z",
    keyCount: Object.keys(data).length,
    excludedKeys: [] as string[],
    archiveItemCount: (opts.archive ?? []).length,
    note: "Fixture backup for tests",
  };
  const files: Record<string, Uint8Array> = {};
  if (opts.includeManifest ?? true)
    files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
  if (opts.includeReadme ?? true) files["README.md"] = strToU8("# Test\n");
  if (opts.includeInstall ?? true) files["INSTALL.md"] = strToU8("# Install\n");
  if (opts.includeEnv ?? true) files[".env.example"] = strToU8("# env\n");
  files["archive-index.json"] = strToU8(JSON.stringify(opts.archive ?? [], null, 2));
  for (const [key, value] of Object.entries(data)) {
    const safe = key.replace(/[^a-zA-Z0-9._-]/g, "_");
    files[`data/${safe}.json`] = strToU8(JSON.stringify(value, null, 2));
  }
  return zipSync(files, { level: 6 });
}

export function corruptZip(bytes: Uint8Array): Uint8Array {
  // Nulle die letzten 128 Byte — zerstört die Central-Directory-Struktur.
  const copy = new Uint8Array(bytes);
  const len = Math.min(128, copy.length);
  for (let i = copy.length - len; i < copy.length; i++) copy[i] = 0;
  return copy;
}

export function stripEntry(bytes: Uint8Array, entryPath: string): Uint8Array {
  const entries = unzipSync(bytes);
  delete entries[entryPath];
  return zipSync(entries, { level: 6 });
}

export function replaceManifest(
  bytes: Uint8Array,
  patch: (m: Record<string, unknown>) => Record<string, unknown>,
): Uint8Array {
  const entries = unzipSync(bytes);
  const raw = entries["manifest.json"];
  const current = raw ? (JSON.parse(strFromU8(raw)) as Record<string, unknown>) : {};
  const next = patch(current);
  entries["manifest.json"] = strToU8(JSON.stringify(next, null, 2));
  return zipSync(entries, { level: 6 });
}

export function injectDataFile(bytes: Uint8Array, key: string, value: unknown): Uint8Array {
  const entries = unzipSync(bytes);
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, "_");
  entries[`data/${safe}.json`] = strToU8(JSON.stringify(value, null, 2));
  return zipSync(entries, { level: 6 });
}

export function readZipEntries(bytes: Uint8Array): Record<string, string> {
  const out: Record<string, string> = {};
  const entries = unzipSync(bytes);
  for (const [k, v] of Object.entries(entries)) out[k] = strFromU8(v);
  return out;
}

/* ---------------------------------------------------------------------------
 * Backupformat 2.0 — manifestbasierte Zuordnung (Sprint 06A)
 * ------------------------------------------------------------------------- */

export interface V2Entry {
  logicalName: string;
  storageKey: string | null;
  path: string;
  checksum: string;
  size: number;
  contentType: string;
  createdAt: string;
}

async function sha256Prefixed(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return (
    "sha256:" +
    Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function contentType(path: string): string {
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".md")) return "text/markdown";
  return "text/plain";
}

/** Deterministische AVKK-Nutzdaten inkl. passendem Katalogstand. */
export function avkkFixture(): {
  avkk: Record<string, unknown>;
  referenceData: Record<string, unknown>;
} {
  const capturedAt = "2026-01-01T00:00:00.000Z";
  const value = (catalogKey: string, key: string, id: string) => ({
    id,
    catalogKey,
    key,
    label: key,
    sortOrder: 1,
    isActive: true,
    isDefault: false,
    validFrom: capturedAt,
    validTo: null,
  });
  return {
    avkk: {
      payloadVersion: 1,
      capturedAt,
      subjects: [
        {
          id: "s-1",
          subjectType: "workpackage",
          subjectId: "wp-1",
          titleSnapshot: "Arbeitspaket 1",
          status: "active",
          version: 1,
          createdAt: capturedAt,
          updatedAt: capturedAt,
        },
      ],
      responsibilities: [
        {
          id: "r-1",
          subjectRef: "s-1",
          personId: "p-1",
          roleKey: "owner",
          typeKeys: ["execution"],
          note: "",
          validFrom: capturedAt,
          validTo: null,
        },
      ],
      competences: [
        {
          id: "k-1",
          subjectRef: "s-1",
          dimensionKey: "technical",
          ratingKey: "full",
          supportNeeded: false,
          note: "",
          supersededAt: null,
          createdAt: capturedAt,
        },
      ],
      consequences: [
        {
          id: "c-1",
          subjectRef: "s-1",
          areaKey: "quality",
          severityKey: "high",
          scheduleImpactKey: "none",
          description: "",
          supersededAt: null,
        },
      ],
      catalogRefs: [{ key: "avkk.responsibility_role", version: 1 }],
    },
    referenceData: {
      payloadVersion: 1,
      capturedAt,
      catalogs: [
        {
          id: "cat-1",
          key: "avkk.responsibility_role",
          name: "Rollen",
          domain: "avkk",
          version: 1,
          isSystem: true,
        },
      ],
      values: [
        value("avkk.responsibility_role", "owner", "v-1"),
        value("avkk.responsibility_type", "execution", "v-2"),
        value("avkk.competence_dimension", "technical", "v-3"),
        value("avkk.competence_rating", "full", "v-4"),
        value("avkk.consequence_area", "quality", "v-5"),
        value("avkk.consequence_severity", "high", "v-6"),
        value("avkk.schedule_impact", "none", "v-7"),
      ],
    },
  };
}

/** Deterministische BSF-03B-Serie: v1 ersetzt durch v2, Claims zeigen nur auf v2. */
export function performanceStatementFixture(): PerformanceStatementBackupPayload {
  const capturedAt = "2026-09-30T12:00:00.000Z";
  const fingerprint = "a".repeat(64);
  const commonItem = {
    sourceRevision: 2,
    sourcePublishedAt: "2026-09-29T09:00:00.000Z",
    sourceEngineerId: "engineer-internal",
    activityDate: "2026-09-15",
    projectSourceId: "project-1",
    projectNameSnapshot: "Projekt Alpha",
    workPackageSourceId: "wp-1",
    workPackageTitleSnapshot: "Analyse",
    categoryKeySnapshot: "regelbetrieb",
    categoryLabelSnapshot: "Regelbetrieb",
    createdAt: capturedAt,
  };

  return {
    payloadVersion: 1,
    capturedAt,
    overrides: [
      {
        id: "override-1",
        systemhouseId: "systemhouse-1",
        customerId: "customer-1",
        activitySourceId: "ACT-2",
        sourceRevision: 2,
        sourceHash: "source-hash-2",
        sourceBillable: true,
        effectiveBillable: false,
        note: "Teamlead Review",
        changedBy: "teamlead-1",
        changedAt: capturedAt,
        createdAt: capturedAt,
        updatedAt: capturedAt,
      },
    ],
    requests: [
      {
        id: "request-v1",
        systemhouseId: "systemhouse-1",
        customerId: "customer-1",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        action: "finalize",
        replacesStatementId: null,
        expectedReviewFingerprint: fingerprint,
        requestedBy: "teamlead-1",
        requestedAt: "2026-09-30T10:00:00.000Z",
        resultStatementId: "statement-v1",
      },
      {
        id: "request-v2",
        systemhouseId: "systemhouse-1",
        customerId: "customer-1",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        action: "replace",
        replacesStatementId: "statement-v1",
        expectedReviewFingerprint: fingerprint,
        requestedBy: "teamlead-1",
        requestedAt: capturedAt,
        resultStatementId: "statement-v2",
      },
    ],
    statements: [
      {
        id: "statement-v1",
        seriesId: "series-1",
        version: 1,
        systemhouseId: "systemhouse-1",
        customerId: "customer-1",
        customerNameSnapshot: "Kunde Alpha",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        status: "superseded",
        finalizedBy: "teamlead-1",
        finalizedAt: "2026-09-30T10:00:00.000Z",
        sourceOldestPublishedAt: "2026-09-01T08:00:00.000Z",
        sourceLatestPublishedAt: "2026-09-29T09:00:00.000Z",
        reviewFingerprint: fingerprint,
        snapshotHash: "1".repeat(64),
        itemCount: 2,
        billableItemCount: 2,
        billableHours: 3,
        nonBillableHours: 0,
        replacesStatementId: null,
        supersededByStatementId: "statement-v2",
        createdAt: "2026-09-30T10:00:00.000Z",
      },
      {
        id: "statement-v2",
        seriesId: "series-1",
        version: 2,
        systemhouseId: "systemhouse-1",
        customerId: "customer-1",
        customerNameSnapshot: "Kunde Alpha",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        status: "finalized",
        finalizedBy: "teamlead-1",
        finalizedAt: capturedAt,
        sourceOldestPublishedAt: "2026-09-01T08:00:00.000Z",
        sourceLatestPublishedAt: "2026-09-29T09:00:00.000Z",
        reviewFingerprint: fingerprint,
        snapshotHash: "2".repeat(64),
        itemCount: 2,
        billableItemCount: 1,
        billableHours: 2,
        nonBillableHours: 1,
        replacesStatementId: "statement-v1",
        supersededByStatementId: null,
        createdAt: capturedAt,
      },
    ],
    items: [
      {
        id: "item-v1-1",
        statementId: "statement-v1",
        position: 1,
        activitySourceId: "ACT-1",
        sourceHash: "source-hash-1",
        titleSnapshot: "Analyse",
        durationHours: 2,
        sourceBillable: true,
        effectiveBillable: true,
        billingStatusSnapshot: "offen",
        ...commonItem,
      },
      {
        id: "item-v1-2",
        statementId: "statement-v1",
        position: 2,
        activitySourceId: "ACT-2",
        sourceHash: "source-hash-2",
        titleSnapshot: "Dokumentation",
        durationHours: 1,
        sourceBillable: true,
        effectiveBillable: true,
        billingStatusSnapshot: "offen",
        ...commonItem,
      },
      {
        id: "item-v2-1",
        statementId: "statement-v2",
        position: 1,
        activitySourceId: "ACT-1",
        sourceHash: "source-hash-1",
        titleSnapshot: "Analyse",
        durationHours: 2,
        sourceBillable: true,
        effectiveBillable: true,
        billingStatusSnapshot: "offen",
        ...commonItem,
      },
      {
        id: "item-v2-2",
        statementId: "statement-v2",
        position: 2,
        activitySourceId: "ACT-2",
        sourceHash: "source-hash-2",
        titleSnapshot: "Dokumentation",
        durationHours: 1,
        sourceBillable: true,
        effectiveBillable: false,
        billingStatusSnapshot: "offen",
        ...commonItem,
      },
    ],
    claims: [
      {
        id: "claim-1",
        systemhouseId: "systemhouse-1",
        customerId: "customer-1",
        activitySourceId: "ACT-1",
        statementId: "statement-v2",
        claimedAt: capturedAt,
      },
      {
        id: "claim-2",
        systemhouseId: "systemhouse-1",
        customerId: "customer-1",
        activitySourceId: "ACT-2",
        statementId: "statement-v2",
        claimedAt: capturedAt,
      },
    ],
  };
}

/** Erzeugt ein Archiv im Format 2.0 mit gültiger Zuordnungstabelle. */
export async function buildValidBackupZipV2(
  opts: BackupFixtureOptions & {
    storagePaths?: Record<string, string>;
    avkk?: { avkk: unknown; referenceData: unknown } | null;
    performanceStatements?: PerformanceStatementBackupPayload | null;
  } = {},
): Promise<Uint8Array> {
  const createdAt = opts.createdAt ?? "2026-01-01T00:00:00.000Z";
  const data: Record<string, unknown> = {
    "engineer-dashboard:profile": { name: "Alice", role: "Systemingenieur" },
    "engineer-dashboard:settings": { locale: "de", period: "month" },
    ...(opts.extraData ?? {}),
  };

  const files: Record<string, Uint8Array> = {
    "README.md": strToU8("# Test\n"),
    "INSTALL.md": strToU8("# Install\n"),
    ".env.example": strToU8("# env\n"),
    "archive-index.json": strToU8(JSON.stringify(opts.archive ?? [], null, 2)),
  };
  const meta: Array<{ logicalName: string; storageKey: string | null; path: string }> = [
    { logicalName: "readme", storageKey: null, path: "README.md" },
    { logicalName: "install-guide", storageKey: null, path: "INSTALL.md" },
    { logicalName: "env-example", storageKey: null, path: ".env.example" },
    { logicalName: "archive-index", storageKey: null, path: "archive-index.json" },
  ];

  if (opts.avkk !== null) {
    const payload = opts.avkk ?? avkkFixture();
    files["avkk.json"] = strToU8(JSON.stringify(payload.avkk, null, 2));
    files["reference-data.json"] = strToU8(JSON.stringify(payload.referenceData, null, 2));
    meta.push({ logicalName: "avkk-dataset", storageKey: null, path: "avkk.json" });
    meta.push({ logicalName: "reference-data", storageKey: null, path: "reference-data.json" });
  }

  if (opts.performanceStatements !== undefined && opts.performanceStatements !== null) {
    const payload = opts.performanceStatements;
    files["performance-statements.json"] = strToU8(JSON.stringify(payload, null, 2));
    meta.push({
      logicalName: "performance-statement-dataset",
      storageKey: null,
      path: "performance-statements.json",
    });
  }

  let i = 0;
  for (const [key, value] of Object.entries(data)) {
    // Speicheradressen sind bewusst bedeutungslos (UUID-artig).
    const path = opts.storagePaths?.[key] ?? `data/blob-${++i}.json`;
    files[path] = strToU8(JSON.stringify(value, null, 2));
    meta.push({ logicalName: `storage:${key}`, storageKey: key, path });
  }

  const entries: V2Entry[] = [];
  for (const m of meta) {
    const bytes = files[m.path];
    entries.push({
      ...m,
      checksum: await sha256Prefixed(bytes),
      size: bytes.length,
      contentType: contentType(m.path),
      createdAt,
    });
  }

  const manifest = {
    version: opts.version ?? "2.0",
    project: opts.projectName ?? "dashboard",
    createdAt,
    keyCount: Object.keys(data).length,
    excludedKeys: [] as string[],
    archiveItemCount: (opts.archive ?? []).length,
    note: "Fixture backup v2 for tests",
    entries,
  };
  files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
  return zipSync(files, { level: 6 });
}

/** Manipuliert die Zuordnungstabelle eines v2-Archivs. */
export function patchManifestEntries(
  bytes: Uint8Array,
  patch: (entries: V2Entry[]) => V2Entry[] | undefined,
): Uint8Array {
  const zip = unzipSync(bytes);
  const manifest = JSON.parse(strFromU8(zip["manifest.json"])) as Record<string, unknown>;
  const next = patch((manifest.entries as V2Entry[]) ?? []);
  manifest.entries = next;
  zip["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
  return zipSync(zip, { level: 6 });
}
