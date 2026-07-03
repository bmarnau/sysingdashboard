/**
 * Azure-Service — Typen (Frontend-Fassade, keine Backend-Logik).
 *
 * Diese Datei definiert ausschließlich UI-nahe Vertragstypen für den
 * Azure-Datenbereich. Die tatsächlichen Azure-Aufrufe folgen später
 * über `/api/azure/*`. Aktuell werden Aktionen von der Fassade in
 * `azure-service.ts` als "not implemented" beantwortet.
 *
 * Sicherheit: Es werden bewusst KEINE Secrets, Connection-Strings,
 * SAS-Tokens oder Roh-Fehler modelliert — nur Booleans, Namen,
 * Zählwerte, generische Meldungen.
 */

export type AzureActionKind =
  | "connection-test"
  | "database-build"
  | "export"
  | "import";

export interface AzureActionResult {
  ok: boolean;
  /** Kurze, für Endanwender verständliche Meldung. Nie Stacktrace, nie Secret. */
  message: string;
  /** Server-Zeitpunkt (ISO); im Stub Client-Zeitpunkt. */
  at: string;
  /** Dauer in ms (falls messbar). */
  durationMs?: number;
}

export interface AzureImportPreviewCounts {
  toCreate: number;
  toUpdate: number;
  toDelete: number;
  conflicts: number;
}

export interface AzureImportPreview {
  /** Fachbereich (z. B. "Projekte", "Arbeitspakete", "Tätigkeiten"). */
  scope: string;
  counts: AzureImportPreviewCounts;
  /** Kurze textuelle Konfliktbeschreibungen für die Vorschau. Keine Rohdaten. */
  conflictSamples: string[];
  /** Zeitpunkt der Vorschauerstellung. */
  generatedAt: string;
}

export interface AzureHistoryEntry {
  id: string;
  kind: AzureActionKind;
  at: string;
  ok: boolean;
  message: string;
  actor: string;
  durationMs?: number;
}

export interface AzureHistorySnapshot {
  connectionTests: AzureHistoryEntry[];
  exports: AzureHistoryEntry[];
  imports: AzureHistoryEntry[];
}
