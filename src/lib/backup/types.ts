/**
 * Gemeinsame Typen des Backup-/Restore-Moduls.
 *
 * Bewusst frei von Laufzeitcode, damit jedes Teilmodul die Typen importieren
 * kann, ohne Zyklen zu erzeugen.
 */

import type { AvkkBackupPayload } from "./avkk-payload";

export type BackupCheckStatus = "ok" | "warning" | "failed";

export interface BackupCheckResult {
  status: BackupCheckStatus;
  messages: string[];
}

export interface BackupRecordMeta {
  id: string;
  fileName: string;
  createdAt: string;
  sizeBytes: number;
  manual: boolean;
  status: BackupCheckStatus;
  checkMessages: string[];
}

export interface BackupLogEntry {
  id: string;
  timestamp: string;
  fileName: string;
  sizeBytes: number;
  manual: boolean;
  consistency: BackupCheckResult;
  zipValidation: BackupCheckResult;
  errors: string[];
}

export interface BackupRecordStored extends BackupRecordMeta {
  bytes: Uint8Array;
}

export interface BackupRecord extends BackupRecordMeta {
  blob: Blob;
  bytes: Uint8Array;
}

/**
 * Ein Eintrag im Manifest 2.0. Die fachliche Zuordnung erfolgt ausschließlich
 * über dieses Objekt — der Pfad im Archiv ist reine Speicheradresse.
 */
export interface BackupEntryV2 {
  /** Fachlicher Name des Inhalts (eindeutig im Archiv). */
  logicalName: string;
  /** Ziel-Schlüssel im localStorage; `null` für reine Dokumente. */
  storageKey: string | null;
  /** Speicheradresse innerhalb des ZIP. */
  path: string;
  /** `sha256:<hex>` über den unkomprimierten Dateiinhalt. */
  checksum: string;
  /** Größe in Byte (unkomprimiert). */
  size: number;
  contentType: string;
  createdAt: string;
  description?: string;
}

/** Manifest-Kopf ohne Einträge — gemeinsame Basis von v1 und v2. */
export interface BackupManifestBase {
  version: string;
  project: string;
  createdAt: string;
  keyCount: number;
  excludedKeys: string[];
  archiveItemCount: number;
  note: string;
}

/** Manifest der Version 2.0 mit vollständiger Zuordnungstabelle. */
export interface BackupManifestV2 extends BackupManifestBase {
  version: "2.0";
  entries: BackupEntryV2[];
}

/** Historisches Manifest (nur noch lesend, wird intern migriert). */
export interface BackupManifestV1 {
  version: number | string;
  project: string;
  createdAt: string;
  keyCount: number;
  excludedKeys: string[];
  archiveItemCount: number;
  note: string;
}

export interface Snapshot {
  manifest: BackupManifestBase;
  data: Record<string, unknown>;
  /**
   * Cloud-Nutzdaten (AVKK + Reference Data). `null`, wenn sie nicht geladen
   * werden konnten — das Backup bleibt dann gültig, meldet aber eine Warnung.
   */
  avkk: AvkkBackupPayload | null;
  /** Gründe, warum Cloud-Nutzdaten fehlen. */
  avkkWarnings: string[];
  archive: Array<{
    id: string;
    fileName: string;
    format: string;
    reportId: string;
    createdAt: string;
    sizeBytes: number;
  }>;
}

export interface CreateBackupOptions {
  manual?: boolean;
}

export interface CreateBackupResult {
  ok: boolean;
  record?: BackupRecordMeta;
  log: BackupLogEntry;
}

/**
 * Wiederherstellungsmodi:
 *  - "empty"     verlangt einen leeren Zielzustand (keine App-Keys vorhanden).
 *  - "overwrite" ersetzt vorhandene Keys komplett.
 *  - "merge"     überschreibt nur die im Backup enthaltenen Keys, lässt
 *                unbekannte lokale Keys stehen.
 */
export type RestoreMode = "empty" | "overwrite" | "merge";

export interface RestoreOptions {
  actor: string;
  mode: RestoreMode;
  /** Ältere MINOR/PATCH akzeptieren (Default true). */
  allowOlderMinor?: boolean;
  /** Neuere MAJOR/MINOR akzeptieren (Default false — Vorsicht). */
  allowNewer?: boolean;
  /** Erwarteter Projektname. Default `dashboard`. */
  expectedProject?: string;
  /**
   * Lokal vorhandene Aufgaben als `"<typ>:<id>"`. Nur damit kann der
   * Aufgabenbezug der AVKK-Daten geprüft werden; fehlt die Menge, wird das
   * als Warnung ausgewiesen.
   */
  knownSubjects?: ReadonlySet<string>;
}

/**
 * Ergebnis der AVKK-Prüfung beim Restore. AVKK-Daten werden ausschließlich
 * geprüft und berichtet — sie werden NICHT in die Datenbank zurückgeschrieben
 * (ADR-0026).
 */
export interface AvkkRestoreReport {
  present: boolean;
  validated: boolean;
  counts: { subjects: number; responsibilities: number; competences: number; consequences: number };
  quarantine: Array<{ subjectRef: string; reason: string }>;
  messages: string[];
}

export interface RestoreResult {
  ok: boolean;
  runId: string;
  snapshotId: string | null;
  startedAt: string;
  finishedAt: string;
  actor: string;
  mode: RestoreMode;
  fileName?: string;
  counts: { keysWritten: number; keysSkipped: number; keysConsidered: number };
  warnings: string[];
  errors: string[];
  rollback: boolean;
  /** Prüfbericht der mitgelieferten AVKK-Daten (kein DB-Schreibvorgang). */
  avkk: AvkkRestoreReport;
}

export interface RestoreSnapshot {
  id: string;
  keys: Array<{ key: string; value: string | null }>;
}
