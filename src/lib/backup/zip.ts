/**
 * Erzeugung des Backup-Archivs (ZIP) inklusive kanonischer `dashboard.json`.
 */

import { strToU8, zipSync } from "fflate";
import { JsonExportService } from "../json-export-service";
import { logger } from "../logger";
import { safeKeyFileName } from "./constants";
import { ENV_EXAMPLE, INSTALL_MD, README_MD } from "./templates";
import type { Snapshot } from "./types";

export function buildZip(snapshot: Snapshot): Uint8Array {
  const files: Record<string, Uint8Array> = {};

  files["manifest.json"] = strToU8(JSON.stringify(snapshot.manifest, null, 2));
  files["README.md"] = strToU8(README_MD);
  files["INSTALL.md"] = strToU8(INSTALL_MD);
  files[".env.example"] = strToU8(ENV_EXAMPLE);
  files["archive-index.json"] = strToU8(JSON.stringify(snapshot.archive, null, 2));

  for (const [key, value] of Object.entries(snapshot.data)) {
    // Schlüssel als sicheren Dateinamen verwenden
    files[`data/${safeKeyFileName(key)}.json`] = strToU8(JSON.stringify(value, null, 2));
  }

  // Kritischer Hinweis 4 aus Stufe 1: zusätzlich eine kanonische
  // `dashboard.json` (Schema v1) einbetten. Restore bevorzugt sie,
  // fällt nur dann auf die rohen Storage-Dumps zurück, wenn sie fehlt
  // oder ungültig ist. Fehler hier brechen das ZIP NICHT — der
  // bestehende Backup-Pfad bleibt funktionsfähig.
  try {
    const res = JsonExportService.exportFullJson({ exportedBy: "backup-service" });
    files["dashboard.json"] = strToU8(JSON.stringify(res.document, null, 2));
  } catch (err) {
    // Nicht eskalieren — Backup geht ohne dashboard.json weiter.
    logger.warn("Backup: dashboard.json konnte nicht eingebettet werden", {
      reason: (err as Error)?.message,
    });
  }

  return zipSync(files, { level: 6 });
}
