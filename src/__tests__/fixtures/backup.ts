/**
 * Fixtures für die Backup-/Restore-/IO-Test-Suite (Prompt 2A.6).
 *
 * Erzeugt deterministische Snapshots im gleichen Format, das
 * `BackupService.createBackup()` schreibt, und liefert Helfer, um
 * absichtlich kaputte ZIPs zu bauen.
 */
import { strToU8, zipSync, unzipSync, strFromU8 } from "fflate";

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

export function injectDataFile(
  bytes: Uint8Array,
  key: string,
  value: unknown,
): Uint8Array {
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
