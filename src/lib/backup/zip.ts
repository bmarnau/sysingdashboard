/**
 * Erzeugung des Backup-Archivs (ZIP) im Backupformat 2.0.
 *
 * Jede Datei wird im Manifest unter `entries[]` beschrieben. Der Pfad im
 * Archiv ist reine Speicheradresse; die fachliche Zuordnung (Storage-Key)
 * steht ausschließlich im Manifest.
 */

import { strToU8, zipSync } from "fflate";
import { JsonExportService } from "../json-export-service";
import { logger } from "../logger";
import { DATA_DIR, MANIFEST_VERSION, contentTypeForPath, safeKeyFileName } from "./constants";
import { checksumOf } from "./checksum";
import { ENV_EXAMPLE, INSTALL_MD, README_MD } from "./templates";
import type { BackupEntryV2, BackupManifestV2, Snapshot } from "./types";

interface PendingFile {
  logicalName: string;
  storageKey: string | null;
  path: string;
  bytes: Uint8Array;
  description?: string;
}

/** Eindeutige Speicheradresse für einen Storage-Key erzeugen. */
function uniqueDataPath(key: string, taken: Set<string>): string {
  const base = safeKeyFileName(key);
  let candidate = `${DATA_DIR}${base}.json`;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${DATA_DIR}${base}__${n}.json`;
    n++;
  }
  taken.add(candidate);
  return candidate;
}

export async function buildZip(snapshot: Snapshot): Promise<Uint8Array> {
  const createdAt = snapshot.manifest.createdAt;
  const pending: PendingFile[] = [
    {
      logicalName: "readme",
      storageKey: null,
      path: "README.md",
      bytes: strToU8(README_MD),
      description: "Kurzbeschreibung des Archivs",
    },
    {
      logicalName: "install-guide",
      storageKey: null,
      path: "INSTALL.md",
      bytes: strToU8(INSTALL_MD),
      description: "Wiederherstellungs- und Installationsanleitung",
    },
    {
      logicalName: "env-example",
      storageKey: null,
      path: ".env.example",
      bytes: strToU8(ENV_EXAMPLE),
      description: "Vorlage für Umgebungsvariablen (ohne echte Werte)",
    },
    {
      logicalName: "archive-index",
      storageKey: null,
      path: "archive-index.json",
      bytes: strToU8(JSON.stringify(snapshot.archive, null, 2)),
      description: "Index der lokalen Export-Ablage (ohne Blobs)",
    },
  ];

  const takenPaths = new Set<string>(pending.map((p) => p.path));
  for (const [key, value] of Object.entries(snapshot.data)) {
    pending.push({
      logicalName: `storage:${key}`,
      storageKey: key,
      path: uniqueDataPath(key, takenPaths),
      bytes: strToU8(JSON.stringify(value, null, 2)),
    });
  }

  // AVKK und Reference Data als eigene, fachlich benannte Einträge.
  if (snapshot.avkk) {
    pending.push({
      logicalName: "avkk-dataset",
      storageKey: null,
      path: "avkk.json",
      bytes: strToU8(JSON.stringify(snapshot.avkk.avkk, null, 2)),
      description: "AVKK-Führungsdaten (Prüfdaten, kein Restore-Ziel)",
    });
    pending.push({
      logicalName: "reference-data",
      storageKey: null,
      path: "reference-data.json",
      bytes: strToU8(JSON.stringify(snapshot.avkk.referenceData, null, 2)),
      description: "Katalogstand (Reference Data) zum Sicherungszeitpunkt",
    });
  }

  // Kanonische `dashboard.json` (Schema v1) zusätzlich einbetten. Fehler hier
  // brechen das Archiv NICHT — der Backup-Pfad bleibt funktionsfähig.
  try {
    const res = JsonExportService.exportFullJson({
      exportedBy: "backup-service",
      avkk: snapshot.avkk ?? undefined,
    });
    pending.push({
      logicalName: "dashboard-export",
      storageKey: null,
      path: "dashboard.json",
      bytes: strToU8(JSON.stringify(res.document, null, 2)),
      description: "Kanonischer Datenexport (Schema v1)",
    });
  } catch (err) {
    logger.warn("Backup: dashboard.json konnte nicht eingebettet werden", {
      reason: (err as Error)?.message,
    });
  }

  const entries: BackupEntryV2[] = [];
  const files: Record<string, Uint8Array> = {};
  for (const file of pending) {
    files[file.path] = file.bytes;
    entries.push({
      logicalName: file.logicalName,
      storageKey: file.storageKey,
      path: file.path,
      checksum: await checksumOf(file.bytes),
      size: file.bytes.length,
      contentType: contentTypeForPath(file.path),
      createdAt,
      ...(file.description ? { description: file.description } : {}),
    });
  }

  const manifest: BackupManifestV2 = {
    ...snapshot.manifest,
    version: MANIFEST_VERSION as "2.0",
    entries,
  };
  files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));

  return zipSync(files, { level: 6 });
}
