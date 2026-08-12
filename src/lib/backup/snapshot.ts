/**
 * Sammeln des zu sichernden App-Zustands (localStorage + Export-Ablage-Index).
 */

import { ExportArchive } from "../export-archive";
import { collectAvkkPayload } from "./avkk-payload";
import { MANIFEST_VERSION, PROJECT_NAME, isAppKey, looksSensitive } from "./constants";
import type { Snapshot } from "./types";

export async function collectSnapshot(): Promise<Snapshot> {
  const data: Record<string, unknown> = {};
  const excluded: string[] = [];

  // localStorage durchgehen
  if (typeof window !== "undefined" && window.localStorage) {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (!isAppKey(key)) continue;
      const raw = window.localStorage.getItem(key) ?? "";
      if (looksSensitive(key, raw)) {
        excluded.push(key);
        continue;
      }
      // Versuche JSON, sonst als String ablegen
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
  }

  // Metadaten der Export-Ablage (ohne die Blobs)
  let archive: Snapshot["archive"] = [];
  try {
    if (ExportArchive.isSupported()) {
      const items = await ExportArchive.list();
      archive = items.map((it) => ({
        id: it.id,
        fileName: it.fileName,
        format: it.format,
        reportId: it.reportId,
        createdAt: it.createdAt,
        sizeBytes: it.sizeBytes,
      }));
    }
  } catch {
    // Ablage optional — Fehler hier nicht eskalieren
  }

  // Cloud-Nutzdaten (AVKK + Reference Data). Fehler brechen das Backup NICHT
  // ab, werden aber ausdrücklich im Manifest/Protokoll ausgewiesen.
  const { payload: avkk, warnings: avkkWarnings } = await collectAvkkPayload();

  return {
    manifest: {
      version: MANIFEST_VERSION,
      project: PROJECT_NAME,
      createdAt: new Date().toISOString(),
      keyCount: Object.keys(data).length,
      excludedKeys: excluded,
      archiveItemCount: archive.length,
      note:
        "App-Datenbackup. Quellcode/Projektdateien werden NICHT mitgesichert — " +
        "siehe INSTALL.md für den vollständigen Projekt-Export via Lovable/GitHub.",
    },
    data,
    archive,
    avkk,
    avkkWarnings,
  };
}
