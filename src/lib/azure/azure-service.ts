/**
 * azureService — Frontend-Fassade für den Azure-Datenbereich.
 *
 * Vertragskontrakt für Prompt 11: **noch keine Backend-Logik.**
 * Alle Aktionen sind Stubs, die dem UI ein konsistentes, secret-freies
 * Ergebnis zurückgeben. Sie fangen intern jeden Fehler und antworten mit
 * `{ ok: false, message }` — es wird **niemals** in die UI geworfen,
 * damit ein Azure-Ausfall das Dashboard nicht beeinträchtigt.
 *
 * Die echten Aufrufe folgen später über `/api/azure/*` und ersetzen
 * ausschließlich die Rümpfe unterhalb — die Signaturen bleiben stabil.
 */

import { AzureHistoryStore, newHistoryId } from "./azure-history-store";
import type { AzureActionKind, AzureActionResult, AzureImportPreview } from "./types";
import { logger } from "@/lib/logger";

const NOT_IMPLEMENTED =
  "Azure-Backend ist in dieser Version noch nicht angebunden. Ausführung wurde nicht gestartet.";

interface RunOpts {
  actor: string;
  kind: AzureActionKind;
}

function record({ actor, kind }: RunOpts, result: AzureActionResult): AzureActionResult {
  try {
    AzureHistoryStore.add({
      id: newHistoryId(),
      kind,
      at: result.at,
      ok: result.ok,
      message: result.message,
      actor,
      durationMs: result.durationMs,
    });
  } catch {
    // Historie ist nur UI-Komfort — Fehler hier eskalieren nie.
  }
  return result;
}

function stub(kind: AzureActionKind, actor: string, message = NOT_IMPLEMENTED): AzureActionResult {
  const at = new Date().toISOString();
  logger.warn("Azure action skipped (stub)", { kind, actor, reason: "not-implemented" });
  return record({ actor, kind }, { ok: false, message, at, durationMs: 0 });
}

export const azureService = {
  /**
   * Verbindungstest — Stub. Aufruf ist manuell und läuft nicht automatisch.
   */
  async testConnection(actor: string): Promise<AzureActionResult> {
    return stub("connection-test", actor);
  },

  /**
   * Datenbank aufbauen — Stub. Nur Systemadministrator; Bestätigung im UI.
   */
  async buildDatabase(actor: string): Promise<AzureActionResult> {
    return stub("database-build", actor);
  },

  /**
   * Nach Azure exportieren — Stub. Manuelle Aktion mit Bestätigung.
   */
  async runExport(actor: string): Promise<AzureActionResult> {
    return stub("export", actor);
  },

  /**
   * Import-Vorschau — Stub. Liefert leere, deutlich als Beispiel markierte
   * Zählwerte, damit die UI-Vorschau vollständig testbar ist.
   */
  async fetchImportPreview(): Promise<AzureImportPreview> {
    return {
      scope: "Alle Bereiche (Beispiel)",
      counts: { toCreate: 0, toUpdate: 0, toDelete: 0, conflicts: 0 },
      conflictSamples: [],
      generatedAt: new Date().toISOString(),
    };
  },

  /**
   * Import ausführen — Stub. Setzt voraus, dass die UI zuvor Vorschau
   * gezeigt und ein Backup erstellt hat (siehe `AzureImportPreviewDialog`).
   */
  async runImport(actor: string, opts: { backupId: string }): Promise<AzureActionResult> {
    if (!opts.backupId) {
      return stub("import", actor, "Import abgebrochen: kein Backup-Referenz übergeben.");
    }
    return stub("import", actor);
  },
};

export type AzureService = typeof azureService;
