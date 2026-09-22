import type { PerformanceStatementBackupPayload } from "./performance-statement-payload";

export interface PerformanceStatementCollectResult {
  payload: PerformanceStatementBackupPayload | null;
  warnings: string[];
}

/**
 * Sammelt BSF-03B Cloud-Nutzdaten über den authentifizierten Server-Function-
 * Pfad. Fehlt Berechtigung/Verbindung, bleibt das lokale Backup gültig, aber
 * die unvollständige Cloud-Sicherung wird ausdrücklich ausgewiesen.
 */
export async function collectPerformanceStatementBackupPayload(): Promise<PerformanceStatementCollectResult> {
  try {
    const { exportPerformanceStatementBackupFn } =
      await import("@/lib/performance-statement-runtime/performance-statement.functions");
    const payload = await exportPerformanceStatementBackupFn();
    return { payload, warnings: [] };
  } catch (error) {
    return {
      payload: null,
      warnings: [
        `Leistungsnachweis-Cloud-Daten konnten nicht gesichert werden: ${(error as Error)?.message ?? "unbekannt"}`,
      ],
    };
  }
}
