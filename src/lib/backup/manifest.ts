/**
 * Laden und Normalisieren des Backup-Manifests.
 *
 * Ergebnis ist immer eine Struktur der Version 2.0. Archive der Version 1
 * (oder Archive ohne `entries[]`) werden rein lesend migriert: die Einträge
 * werden aus den vorhandenen Speicheradressen synthetisiert. Bestehende
 * Archive werden dabei NICHT verändert.
 */

import { strFromU8 } from "fflate";
import { checksumOf } from "./checksum";
import { DATA_DIR, MANIFEST_VERSION, contentTypeForPath } from "./constants";
import type { BackupEntryV2, BackupManifestV2 } from "./types";

export interface LoadedManifest {
  manifest: BackupManifestV2;
  /** true, wenn die Einträge aus einem Altformat abgeleitet wurden. */
  migrated: boolean;
  /** Version, wie sie im Archiv stand. */
  sourceVersion: string;
}

function isEntry(value: unknown): value is BackupEntryV2 {
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.logicalName === "string" &&
    typeof e.path === "string" &&
    typeof e.checksum === "string" &&
    typeof e.size === "number" &&
    typeof e.contentType === "string" &&
    (typeof e.storageKey === "string" || e.storageKey === null)
  );
}

/**
 * Synthetisiert Einträge aus den Archivinhalten (Migrationspfad v1 → v2).
 * Der Storage-Key wird für Datendateien wie bisher aus dem Dateinamen
 * abgeleitet — Bestandsschutz, kein neuer Vertrag.
 */
async function synthesizeEntries(
  zip: Record<string, Uint8Array>,
  createdAt: string,
): Promise<BackupEntryV2[]> {
  const out: BackupEntryV2[] = [];
  for (const [path, bytes] of Object.entries(zip)) {
    if (path === "manifest.json") continue;
    const isData = path.startsWith(DATA_DIR);
    const storageKey = isData ? path.slice(DATA_DIR.length).replace(/\.json$/, "") : null;
    out.push({
      logicalName: isData ? `storage:${storageKey}` : path,
      storageKey,
      path,
      checksum: await checksumOf(bytes),
      size: bytes.length,
      contentType: contentTypeForPath(path),
      createdAt,
      description: isData ? undefined : "Aus Altformat migriert",
    });
  }
  return out;
}

/**
 * Liest `manifest.json` und liefert stets eine v2-Struktur.
 * Wirft bei fehlendem oder beschädigtem Manifest.
 */
export async function loadManifest(zip: Record<string, Uint8Array>): Promise<LoadedManifest> {
  const raw = zip["manifest.json"];
  if (!raw) throw new Error("Pflichtdatei fehlt: manifest.json");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(strFromU8(raw)) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`Manifest ist beschädigt: ${(err as Error).message}`);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Manifest ist beschädigt: kein Objekt.");
  }

  const sourceVersion = String(parsed.version ?? "1");
  const createdAt =
    typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString();

  const rawEntries = parsed.entries;
  const hasEntries = Array.isArray(rawEntries) && rawEntries.length > 0;
  if (hasEntries && !(rawEntries as unknown[]).every(isEntry)) {
    throw new Error("Manifest enthält ungültige Einträge in `entries`.");
  }

  const entries = hasEntries
    ? (rawEntries as BackupEntryV2[])
    : await synthesizeEntries(zip, createdAt);

  const manifest: BackupManifestV2 = {
    version: MANIFEST_VERSION as "2.0",
    project: String(parsed.project ?? ""),
    createdAt,
    keyCount: typeof parsed.keyCount === "number" ? parsed.keyCount : entries.length,
    excludedKeys: Array.isArray(parsed.excludedKeys) ? (parsed.excludedKeys as string[]) : [],
    archiveItemCount: typeof parsed.archiveItemCount === "number" ? parsed.archiveItemCount : 0,
    note: typeof parsed.note === "string" ? parsed.note : "",
    entries,
  };

  return { manifest, migrated: !hasEntries, sourceVersion };
}
