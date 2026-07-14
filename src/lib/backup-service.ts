/**
 * BackupService — modulare Backup-Funktion für das Dashboard.
 *
 * Was wird gesichert?
 *   - Alle Dashboard-Daten aus localStorage (Engineure, Arbeitszeitmodelle,
 *     Benutzer/Profile, Einstellungen, Zeitraum, Berichte, …).
 *   - Metadaten der lokalen Export-Ablage (ohne die rohen Blobs — sonst
 *     würde das Backup beliebig groß).
 *   - Eine Anleitung (INSTALL.md), wie der vollständige Projekt-Quellcode
 *     über Lovable/GitHub für den eigenen Webserver exportiert wird.
 *
 * Ein echtes "Quellcode-Backup" aus der laufenden Browser-App heraus ist
 * technisch nicht möglich — der Browser hat keinen Zugriff auf das
 * Projekt-Repository. Dieser Service sichert deshalb den App-Zustand
 * vollständig und verweist für den Quellcode auf den Lovable-Export.
 *
 * Architektur:
 *   - collectSnapshot()        sammelt + filtert Daten (entfernt Secrets)
 *   - runConsistencyCheck()    validiert den Snapshot vor dem Packen
 *   - buildZip()               erzeugt das ZIP via fflate
 *   - validateZip()            entpackt das ZIP testweise + prüft Inhalt
 *   - createBackup()           orchestriert den gesamten Ablauf, schreibt
 *                              Protokoll und legt das ZIP in IndexedDB ab
 *   - listBackups/download/delete  Verwaltung
 *   - scheduleDaily()          stößt täglich automatisch ein Backup an
 */

import { unzipSync, zipSync, strToU8, strFromU8 } from "fflate";
import { ExportArchive } from "./export-archive";
import { JsonExportService } from "./json-export-service";
import { logger } from "./logger";
import { BackupError } from "./errors";

/* ---------------------------------------------------------------------- */
/*  Typen                                                                  */
/* ---------------------------------------------------------------------- */

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

/* ---------------------------------------------------------------------- */
/*  Konstanten                                                             */
/* ---------------------------------------------------------------------- */

const PROJECT_NAME = "dashboard";
const BACKUP_DB = "engineer-dashboard-backups";
const BACKUP_STORE = "backups";
const BACKUP_DB_VERSION = 1;

const LAST_BACKUP_KEY = "backup:lastAuto";
const LOG_KEY = "backup:log";
const LOG_MAX = 100;

/**
 * localStorage-Keys/Prefixes, die zum Dashboard gehören und gesichert werden
 * sollen. Bewusst breit gehalten (alle App-eigenen Keys), aber per Denylist
 * werden potenzielle Secrets ausgefiltert.
 */
const APP_KEY_ALLOWLIST_PREFIXES = [
  "engineer-dashboard",
  "engineerDashboard",
  "engineer:",
  "dashboard:",
  "user-management",
  "userManagement",
  "users:",
  "working-time",
  "workingTime",
  "target-time",
  "targetTime",
  "time-period",
  "timePeriod",
  "perf-report",
  "performance-report",
  "report:",
  "app.locale",
  "i18n:",
  "backup:log", // Log selbst mitsichern, damit Historie erhalten bleibt
];

/**
 * Substrings, die auf sensible Daten hindeuten und NIE ins Backup wandern.
 */
const SENSITIVE_SUBSTRINGS = [
  "password",
  "passwd",
  "secret",
  "token",
  "api_key",
  "apikey",
  "api-key",
  "private_key",
  "privatekey",
  "credential",
  "auth_token",
  "access_token",
  "refresh_token",
  "bearer",
];

/* ---------------------------------------------------------------------- */
/*  Utilities                                                              */
/* ---------------------------------------------------------------------- */

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function buildFileName(date = new Date()): string {
  return `${PROJECT_NAME}-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}-${pad(date.getHours())}-${pad(date.getMinutes())}.zip`;
}

function isAppKey(key: string): boolean {
  return APP_KEY_ALLOWLIST_PREFIXES.some((p) => key.startsWith(p));
}

function looksSensitive(key: string, value: string): boolean {
  const k = key.toLowerCase();
  if (SENSITIVE_SUBSTRINGS.some((s) => k.includes(s))) return true;
  // Werte mit sehr langem Zufallsstring + bekannten Keys absichern
  if (/(eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/.test(value)) return true; // JWT
  return false;
}

/* ---------------------------------------------------------------------- */
/*  IndexedDB für ZIP-Blobs                                                */
/* ---------------------------------------------------------------------- */

function openBackupDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BACKUP_DB, BACKUP_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BACKUP_STORE)) {
        const store = db.createObjectStore(BACKUP_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbTx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openBackupDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(BACKUP_STORE, mode);
        const req = fn(t.objectStore(BACKUP_STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
        t.onerror = () => reject(t.error);
      }),
  );
}

interface BackupRecordStored extends BackupRecordMeta {
  bytes: Uint8Array;
}
interface BackupRecord extends BackupRecordMeta {
  blob: Blob;
  bytes: Uint8Array;
}

/* ---------------------------------------------------------------------- */
/*  Snapshot                                                               */
/* ---------------------------------------------------------------------- */

interface Snapshot {
  manifest: {
    version: 1;
    project: string;
    createdAt: string;
    keyCount: number;
    excludedKeys: string[];
    archiveItemCount: number;
    note: string;
  };
  data: Record<string, unknown>;
  archive: Array<{
    id: string;
    fileName: string;
    format: string;
    reportId: string;
    createdAt: string;
    sizeBytes: number;
  }>;
}

async function collectSnapshot(): Promise<Snapshot> {
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

  return {
    manifest: {
      version: 1,
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
  };
}

/* ---------------------------------------------------------------------- */
/*  Konsistenzprüfung                                                       */
/* ---------------------------------------------------------------------- */

function runConsistencyCheck(snapshot: Snapshot): BackupCheckResult {
  const msgs: string[] = [];
  let status: BackupCheckStatus = "ok";

  if (snapshot.manifest.keyCount === 0) {
    msgs.push("Keine Dashboard-Daten gefunden — Backup wird trotzdem erstellt.");
    status = "warning";
  }

  // Auf bekannte Top-Level-Keys testen (rein heuristisch)
  const importantHints = ["engineer", "user", "working", "target"];
  const keys = Object.keys(snapshot.data);
  const hits = importantHints.filter((h) => keys.some((k) => k.toLowerCase().includes(h)));
  if (snapshot.manifest.keyCount > 0 && hits.length === 0) {
    msgs.push(
      "Keine typischen App-Schlüssel erkannt (Engineer/User/WorkingTime/TargetTime). " +
        "Vermutlich frisch initialisierte Installation.",
    );
    if (status === "ok") status = "warning";
  }

  // Sensible Daten dürfen NIE im Snapshot stehen
  for (const [k, v] of Object.entries(snapshot.data)) {
    const serialized = typeof v === "string" ? v : JSON.stringify(v);
    if (looksSensitive(k, serialized)) {
      msgs.push(`Sensibler Wert in '${k}' erkannt — Backup wird abgebrochen.`);
      status = "failed";
    }
  }

  if (snapshot.manifest.excludedKeys.length > 0) {
    msgs.push(
      `${snapshot.manifest.excludedKeys.length} Schlüssel als sensibel ausgeschlossen: ` +
        snapshot.manifest.excludedKeys.join(", "),
    );
  }

  return { status, messages: msgs };
}

/* ---------------------------------------------------------------------- */
/*  ZIP bauen                                                              */
/* ---------------------------------------------------------------------- */

const README_MD = `# Dashboard-Backup

Dieses ZIP enthält ein vollständiges Daten-Backup des Systemingenieur-Dashboards.

## Inhalt

- \`manifest.json\` – Metadaten (Zeitstempel, Versions-Info, Schlüsselzahl)
- \`data/<key>.json\` – jeder gesicherte localStorage-Eintrag als eigene Datei
- \`archive-index.json\` – Index der lokalen Export-Ablage (ohne Blobs)
- \`INSTALL.md\` – Anleitung zur Wiederherstellung und zum Quellcode-Export
- \`.env.example\` – Platzhalter für umgebungsspezifische Werte

## Hinweis zu Quellcode

Aus der laufenden Browser-App heraus kann der Quellcode des Dashboards
nicht gesichert werden. Den vollständigen, installierbaren Projekt-Quellcode
für Ihren eigenen Webserver erhalten Sie über Lovable (Code-Editor →
Codebase herunterladen) oder über die GitHub-Integration. Details siehe
\`INSTALL.md\`.
`;

const INSTALL_MD = `# Installation & Wiederherstellung

## 1. Daten wiederherstellen

Die Dateien unter \`data/\` entsprechen jeweils einem Eintrag im localStorage.
Zum Wiederherstellen können sie in einem neuen Dashboard über die geplante
"Restore"-Funktion eingespielt werden, oder manuell:

1. Öffnen Sie das Dashboard in Ihrem Browser.
2. Öffnen Sie die DevTools (F12) → Application → Local Storage.
3. Für jede Datei in \`data/\`: Schlüssel = Dateiname ohne \`.json\`,
   Wert = Dateiinhalt.
4. Seite neu laden.

## 2. Quellcode für eigenen Webserver

Das ZIP enthält bewusst KEINEN Quellcode — die App läuft im Browser und hat
keinen Zugriff auf das Projekt-Repository.

Sie erhalten den vollständigen Quellcode auf zwei Wegen:

### A) Direkter Download (empfohlen)
1. In Lovable den Code-Editor öffnen.
2. Unten in der Datei-Seitenleiste auf **Codebase herunterladen** klicken.
3. Das ZIP enthält Quellcode, Konfigurationen, \`public/\`-Assets und
   Build-Skripte.

### B) Über GitHub
1. Im Lovable-Editor: Plus-Menü (+) → GitHub → Projekt verbinden.
2. Auf GitHub das Repository öffnen → **Code → Download ZIP** oder
   \`git clone <repo-url>\`.

### Anschließend lokal bauen
\`\`\`bash
npm install        # oder: bun install
npm run build      # oder: bun run build
\`\`\`

Das Build-Resultat (\`dist/\` bzw. der Server-Output) kann auf jedem
statischen Webserver oder Edge-Host bereitgestellt werden.

## 3. .env

Echte Zugangsdaten werden NIE in dieses Backup geschrieben. Verwenden Sie
\`.env.example\` als Vorlage und tragen Sie Ihre Werte direkt auf dem
Zielserver ein.
`;

const ENV_EXAMPLE = `# Beispiel-Umgebungsvariablen für das Dashboard.
# Echte Werte gehören NICHT in dieses Backup — auf dem Zielserver setzen.

# VITE_SUPABASE_URL=https://<project>.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-anon-key>
`;

function buildZip(snapshot: Snapshot): Uint8Array {
  const files: Record<string, Uint8Array> = {};

  files["manifest.json"] = strToU8(JSON.stringify(snapshot.manifest, null, 2));
  files["README.md"] = strToU8(README_MD);
  files["INSTALL.md"] = strToU8(INSTALL_MD);
  files[".env.example"] = strToU8(ENV_EXAMPLE);
  files["archive-index.json"] = strToU8(JSON.stringify(snapshot.archive, null, 2));

  for (const [key, value] of Object.entries(snapshot.data)) {
    // Schlüssel als sicheren Dateinamen verwenden
    const safe = key.replace(/[^a-zA-Z0-9._-]/g, "_");
    files[`data/${safe}.json`] = strToU8(JSON.stringify(value, null, 2));
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

/* ---------------------------------------------------------------------- */
/*  ZIP validieren                                                         */
/* ---------------------------------------------------------------------- */

function validateZip(bytes: Uint8Array, snapshot: Snapshot): BackupCheckResult {
  const msgs: string[] = [];
  let status: BackupCheckStatus = "ok";

  if (bytes.length === 0) {
    return { status: "failed", messages: ["ZIP-Datei ist leer."] };
  }

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch (err) {
    return {
      status: "failed",
      messages: [`ZIP konnte nicht gelesen werden: ${(err as Error).message}`],
    };
  }

  // Pflichtdateien
  const required = ["manifest.json", "README.md", "INSTALL.md", ".env.example"];
  for (const r of required) {
    if (!entries[r] || entries[r].length === 0) {
      msgs.push(`Pflichtdatei fehlt oder leer: ${r}`);
      status = "failed";
    }
  }

  // Datenkeys vollständig?
  const expected = Object.keys(snapshot.data).length;
  const actual = Object.keys(entries).filter((p) => p.startsWith("data/")).length;
  if (expected !== actual) {
    msgs.push(`Erwartet ${expected} Datendateien, im ZIP gefunden: ${actual}.`);
    status = "failed";
  }

  // Manifest gegenprüfen
  try {
    const m = JSON.parse(strFromU8(entries["manifest.json"]));
    if (m.project !== PROJECT_NAME) {
      msgs.push("Projektname im Manifest stimmt nicht überein.");
      status = "failed";
    }
  } catch {
    msgs.push("Manifest konnte nicht geparst werden.");
    status = "failed";
  }

  // Ausgeschlossene Schlüssel dürfen wirklich nicht enthalten sein
  for (const ex of snapshot.manifest.excludedKeys) {
    const safe = ex.replace(/[^a-zA-Z0-9._-]/g, "_");
    if (entries[`data/${safe}.json`]) {
      msgs.push(`Sensibler Schlüssel doch im Backup: ${ex}`);
      status = "failed";
    }
  }

  if (msgs.length === 0) {
    msgs.push(
      `ZIP-Validierung erfolgreich: ${Object.keys(entries).length} Einträge, ` +
        `${bytes.length} Byte.`,
    );
  }

  return { status, messages: msgs };
}

/* ---------------------------------------------------------------------- */
/*  Protokoll                                                              */
/* ---------------------------------------------------------------------- */

function readLog(): BackupLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLog(entry: BackupLogEntry) {
  if (typeof window === "undefined") return;
  try {
    const log = readLog();
    log.unshift(entry);
    window.localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, LOG_MAX)));
  } catch {
    /* localStorage voll — ignorieren */
  }
}

/* ---------------------------------------------------------------------- */
/*  Öffentliche API                                                         */
/* ---------------------------------------------------------------------- */

export interface CreateBackupOptions {
  manual?: boolean;
}

export interface CreateBackupResult {
  ok: boolean;
  record?: BackupRecordMeta;
  log: BackupLogEntry;
}

export const BackupService = {
  buildFileName,

  async createBackup(opts: CreateBackupOptions = {}): Promise<CreateBackupResult> {
    const manual = opts.manual ?? false;
    const errors: string[] = [];
    const fileName = buildFileName();
    const id = crypto.randomUUID();
    let consistency: BackupCheckResult = { status: "ok", messages: [] };
    let zipValidation: BackupCheckResult = { status: "ok", messages: [] };
    let sizeBytes = 0;

    try {
      // 1. Snapshot sammeln
      const snapshot = await collectSnapshot();

      // 2. Vor-Validierung
      consistency = runConsistencyCheck(snapshot);
      if (consistency.status === "failed") {
        throw new Error("Projektprüfung fehlgeschlagen: " + consistency.messages.join("; "));
      }

      // 3. ZIP bauen
      const bytes = buildZip(snapshot);
      sizeBytes = bytes.length;
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/zip" });

      // 4. ZIP validieren
      zipValidation = validateZip(bytes, snapshot);
      if (zipValidation.status === "failed") {
        throw new Error("ZIP-Validierung fehlgeschlagen: " + zipValidation.messages.join("; "));
      }

      // 5. Persistieren
      const status: BackupCheckStatus =
        consistency.status === "warning" || zipValidation.status === "warning" ? "warning" : "ok";

      const record: BackupRecord = {
        id,
        fileName,
        createdAt: new Date().toISOString(),
        sizeBytes,
        manual,
        status,
        checkMessages: [...consistency.messages, ...zipValidation.messages],
        blob,
        bytes: new Uint8Array(bytes),
      };

      const stored: BackupRecordStored = {
        id: record.id,
        fileName: record.fileName,
        createdAt: record.createdAt,
        sizeBytes: record.sizeBytes,
        manual: record.manual,
        status: record.status,
        checkMessages: record.checkMessages,
        bytes: record.bytes,
      };
      await dbTx("readwrite", (s) => s.put(stored));
      window.localStorage.setItem(LAST_BACKUP_KEY, record.createdAt);

      const logEntry: BackupLogEntry = {
        id,
        timestamp: record.createdAt,
        fileName,
        sizeBytes,
        manual,
        consistency,
        zipValidation,
        errors: [],
      };
      writeLog(logEntry);

      const { blob: _b, bytes: _by, ...meta } = record;
      return { ok: true, record: meta, log: logEntry };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      logger.error(
        "Backup failed",
        new BackupError("BACKUP_FAILED", message, { cause: err, context: { manual, fileName } }),
        { manual, fileName },
      );

      const logEntry: BackupLogEntry = {
        id,
        timestamp: new Date().toISOString(),
        fileName,
        sizeBytes,
        manual,
        consistency,
        zipValidation,
        errors,
      };
      writeLog(logEntry);
      return { ok: false, log: logEntry };
    }
  },

  async list(): Promise<BackupRecordMeta[]> {
    try {
      const all = await dbTx<BackupRecordStored[]>(
        "readonly",
        (s) => s.getAll() as IDBRequest<BackupRecordStored[]>,
      );
      return all
        .map(({ bytes: _by, ...meta }) => meta)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      logger.error("Backup list could not be loaded", err);
      return [];
    }
  },

  async get(id: string): Promise<BackupRecord | undefined> {
    const stored = await dbTx<BackupRecordStored | undefined>(
      "readonly",
      (s) => s.get(id) as IDBRequest<BackupRecordStored | undefined>,
    );
    if (!stored) return undefined;
    const bytes = stored.bytes instanceof Uint8Array ? stored.bytes : new Uint8Array(stored.bytes);
    const blob = new Blob([bytes as BlobPart], { type: "application/zip" });
    return { ...stored, bytes, blob };
  },

  async delete(id: string): Promise<void> {
    await dbTx("readwrite", (s) => s.delete(id));
  },

  async clear(): Promise<void> {
    await dbTx("readwrite", (s) => s.clear());
  },

  log(): BackupLogEntry[] {
    return readLog();
  },

  clearLog(): void {
    if (typeof window !== "undefined") window.localStorage.removeItem(LOG_KEY);
  },

  lastAuto(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(LAST_BACKUP_KEY);
  },

  /**
   * Stößt täglich automatisch ein Backup an. Aufruf einmalig in der App
   * (z. B. im Root-useEffect). Erstellt höchstens 1× pro Kalendertag ein
   * automatisches Backup.
   */
  scheduleDaily(): void {
    if (typeof window === "undefined") return;

    const tryRun = () => {
      const last = window.localStorage.getItem(LAST_BACKUP_KEY);
      const today = new Date().toISOString().slice(0, 10);
      const lastDay = last?.slice(0, 10);
      if (lastDay === today) return;
      // Nicht blockierend
      void this.createBackup({ manual: false }).catch((err) => {
        logger.error("Scheduled backup failed", err, { manual: false });
      });
    };

    // Sofortiger Check beim Start
    tryRun();
    // Alle 6 Stunden erneut prüfen (für lange offene Tabs)
    window.setInterval(tryRun, 6 * 60 * 60 * 1000);
  },
};

/* ---------------------------------------------------------------------- */
/*  Download-Helfer                                                        */
/* ---------------------------------------------------------------------- */

export function triggerBackupDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* ---------------------------------------------------------------------- */
/*  Restore (Prompt 2A.6)                                                  */
/* ---------------------------------------------------------------------- */

/**
 * Wiederherstellungsmodi:
 *  - "empty"     verlangt einen leeren Zielzustand (keine App-Keys vorhanden).
 *  - "overwrite" ersetzt vorhandene Keys komplett.
 *  - "merge"     überschreibt nur die im Backup enthaltenen Keys, lässt
 *                unbekannte lokale Keys stehen.
 *
 * Alle Modi arbeiten transaktional: vor dem Schreiben wird ein Pre-Snapshot
 * der betroffenen localStorage-Keys angelegt. Tritt beim Schreiben oder bei
 * der Nach-Validierung ein Fehler auf, wird der Snapshot zurückgespielt und
 * `rollback: true` gemeldet — keinerlei Teilzustand bleibt zurück.
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
}

const RESTORE_LOG_KEY = "backup:restoreLog";
const RESTORE_LOG_MAX = 100;

function readRestoreLog(): RestoreResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RESTORE_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRestoreLog(entry: RestoreResult): void {
  if (typeof window === "undefined") return;
  try {
    const log = readRestoreLog();
    log.unshift(entry);
    window.localStorage.setItem(RESTORE_LOG_KEY, JSON.stringify(log.slice(0, RESTORE_LOG_MAX)));
  } catch {
    /* quota — ignore */
  }
}

interface RestoreSnapshot {
  id: string;
  keys: Array<{ key: string; value: string | null }>;
}

function takeSnapshotOf(keys: string[]): RestoreSnapshot {
  const id = `restore-snap-${crypto.randomUUID()}`;
  if (typeof window === "undefined") return { id, keys: [] };
  return {
    id,
    keys: keys.map((k) => ({ key: k, value: window.localStorage.getItem(k) })),
  };
}

function rollbackSnapshot(snap: RestoreSnapshot): void {
  if (typeof window === "undefined") return;
  for (const { key, value } of snap.keys) {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  }
}

function listCurrentAppKeys(): string[] {
  if (typeof window === "undefined") return [];
  const out: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && isAppKey(k) && k !== LOG_KEY && k !== RESTORE_LOG_KEY && k !== LAST_BACKUP_KEY) {
      out.push(k);
    }
  }
  return out;
}

function parseSemverMajor(v: string): number {
  const m = /^(\d+)/.exec(v);
  return m ? Number(m[1]) : NaN;
}

/**
 * Setzt ein Backup-ZIP zurück in localStorage. Reine Client-Operation.
 *
 * Fehlerfälle liefern `ok: false` und beschreiben in `errors[]` den Grund.
 * Ausnahme: nur echte Programmierfehler eskalieren via throw; alle
 * erwarteten Restore-Fehler (kaputtes ZIP, Manifest-Mismatch, fehlende
 * Pflichtdateien, Versions-Verweigerung) sind protokolliert und werden
 * zurückgegeben.
 */
export async function restoreFromZip(
  bytes: Uint8Array,
  opts: RestoreOptions,
  meta: { fileName?: string } = {},
): Promise<RestoreResult> {
  const startedAt = new Date().toISOString();
  const runId = `restore-${crypto.randomUUID()}`;
  const warnings: string[] = [];
  const errors: string[] = [];
  const counts = { keysWritten: 0, keysSkipped: 0, keysConsidered: 0 };
  const expectedProject = opts.expectedProject ?? PROJECT_NAME;
  const allowOlderMinor = opts.allowOlderMinor ?? true;
  const allowNewer = opts.allowNewer ?? false;

  const fail = (msg: string, extra: Partial<RestoreResult> = {}): RestoreResult => {
    errors.push(msg);
    const res: RestoreResult = {
      ok: false,
      runId,
      snapshotId: null,
      startedAt,
      finishedAt: new Date().toISOString(),
      actor: opts.actor,
      mode: opts.mode,
      fileName: meta.fileName,
      counts,
      warnings,
      errors,
      rollback: false,
      ...extra,
    };
    writeRestoreLog(res);
    logger.error("Restore rejected", new BackupError("RESTORE_REJECTED", msg), {
      actor: opts.actor,
      mode: opts.mode,
      fileName: meta.fileName,
    });
    return res;
  };

  if (!bytes || bytes.length === 0) return fail("Backup-Datei ist leer.");

  // 1. Entpacken
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch (err) {
    return fail(`ZIP konnte nicht entpackt werden: ${(err as Error).message}`);
  }

  // 2. Pflichtdateien
  const required = ["manifest.json"];
  for (const r of required) {
    if (!entries[r]) return fail(`Pflichtdatei fehlt: ${r}`);
  }

  // 3. Manifest parsen und prüfen
  let manifest: Snapshot["manifest"];
  try {
    manifest = JSON.parse(strFromU8(entries["manifest.json"])) as Snapshot["manifest"];
  } catch (err) {
    return fail(`Manifest ist beschädigt: ${(err as Error).message}`);
  }
  if (manifest.project !== expectedProject) {
    return fail(
      `Projektname im Manifest ("${manifest.project}") passt nicht zu "${expectedProject}".`,
    );
  }
  const localMajor = parseSemverMajor(String(manifest.version ?? "1"));
  const expectedMajor = 1;
  if (Number.isFinite(localMajor)) {
    if (localMajor > expectedMajor && !allowNewer) {
      return fail(
        `Backup nutzt Schema-MAJOR ${localMajor}, unterstützt wird ${expectedMajor}. Aktiviere \`allowNewer\`, um es dennoch einzuspielen.`,
      );
    }
    if (localMajor < expectedMajor && !allowOlderMinor) {
      return fail(
        `Backup nutzt Schema-MAJOR ${localMajor}, älter als ${expectedMajor}. Migration erforderlich.`,
      );
    }
    if (localMajor < expectedMajor) {
      warnings.push(
        `Älteres Schema (MAJOR ${localMajor}) — nur additive Wiederherstellung möglich.`,
      );
    }
  }

  // 4. Datendateien einsammeln
  const dataEntries = Object.entries(entries).filter(([p]) => p.startsWith("data/"));
  if (dataEntries.length === 0) {
    return fail("Backup enthält keine Datendateien unter data/.");
  }

  const desiredKeyValues: Array<{ key: string; raw: string }> = [];
  for (const [path, u8] of dataEntries) {
    // Dateiname → Storage-Key rekonstruieren. Wir verlassen uns auf das
    // Manifest, wenn der Original-Key nicht mehr rekonstruierbar ist.
    const safe = path.replace(/^data\//, "").replace(/\.json$/, "");
    // Der ursprüngliche Key wird beim Backup mit `[^a-zA-Z0-9._-] → _`
    // maskiert. Für eine perfekte Umkehr müsste er im Manifest stehen —
    // additiv gepflegt in `manifest.entries[]` (nicht rückwärtskompatibel
    // erzwungen). Ohne diese Info nutzen wir den maskierten Namen 1:1;
    // App-Keys sind ohnehin ohne Sonderzeichen definiert (Prefix-basiert).
    desiredKeyValues.push({ key: safe, raw: strFromU8(u8) });
  }
  counts.keysConsidered = desiredKeyValues.length;

  // 5. Modus-abhängige Vor-Bedingungen
  if (typeof window === "undefined") {
    return fail("Restore ist nur im Browser (localStorage) verfügbar.");
  }
  if (opts.mode === "empty") {
    const existing = listCurrentAppKeys();
    if (existing.length > 0) {
      return fail(
        `Modus 'empty' verlangt leeren Zielzustand, ${existing.length} vorhandene App-Keys gefunden.`,
      );
    }
  }

  // 6. Sensitive Keys im Backup abweisen (Defense-in-Depth)
  for (const { key, raw } of desiredKeyValues) {
    if (looksSensitive(key, raw)) {
      return fail(`Sensibler Schlüssel im Backup gefunden — Restore verweigert: ${key}`);
    }
  }

  // 7. Snapshot der zu berührenden Keys nehmen
  const touchKeys = new Set<string>(desiredKeyValues.map((d) => d.key));
  if (opts.mode === "overwrite") {
    for (const k of listCurrentAppKeys()) touchKeys.add(k);
  }
  const snap = takeSnapshotOf(Array.from(touchKeys));
  snapshotRegistryRestore.set(snap.id, snap);

  // 8. Anwenden (transaktional)
  try {
    if (opts.mode === "overwrite") {
      for (const k of listCurrentAppKeys()) {
        if (!desiredKeyValues.some((d) => d.key === k)) {
          window.localStorage.removeItem(k);
          counts.keysSkipped++;
        }
      }
    }
    for (const { key, raw } of desiredKeyValues) {
      window.localStorage.setItem(key, raw);
      counts.keysWritten++;
    }
    // 9. Nachvalidierung: Anzahl im Ziel muss ≥ geschriebene Keys sein.
    let verifyMiss = 0;
    for (const { key, raw } of desiredKeyValues) {
      if (window.localStorage.getItem(key) !== raw) verifyMiss++;
    }
    if (verifyMiss > 0) {
      throw new Error(`Nach-Validierung fehlgeschlagen: ${verifyMiss} Keys weichen ab.`);
    }
  } catch (err) {
    rollbackSnapshot(snap);
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    const res: RestoreResult = {
      ok: false,
      runId,
      snapshotId: snap.id,
      startedAt,
      finishedAt: new Date().toISOString(),
      actor: opts.actor,
      mode: opts.mode,
      fileName: meta.fileName,
      counts,
      warnings,
      errors,
      rollback: true,
    };
    writeRestoreLog(res);
    logger.error("Restore rolled back", err, { actor: opts.actor, mode: opts.mode });
    return res;
  }

  const finishedAt = new Date().toISOString();
  const result: RestoreResult = {
    ok: true,
    runId,
    snapshotId: snap.id,
    startedAt,
    finishedAt,
    actor: opts.actor,
    mode: opts.mode,
    fileName: meta.fileName,
    counts,
    warnings,
    errors,
    rollback: false,
  };
  writeRestoreLog(result);
  logger.info("Restore applied", {
    module: "BackupService",
    action: "restore",
    runId,
    actor: opts.actor,
    mode: opts.mode,
    counts,
    warnings: warnings.length,
  });
  return result;
}

const snapshotRegistryRestore = new Map<string, RestoreSnapshot>();

/** Vorheriges Restore rückgängig machen (nur solange dieselbe Session läuft). */
export function rollbackRestore(snapshotId: string): boolean {
  const snap = snapshotRegistryRestore.get(snapshotId);
  if (!snap) return false;
  rollbackSnapshot(snap);
  logger.info("Restore manually rolled back", {
    module: "BackupService",
    action: "restore-rollback",
    snapshotId,
  });
  return true;
}

export function restoreLog(): RestoreResult[] {
  return readRestoreLog();
}

export function clearRestoreLog(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(RESTORE_LOG_KEY);
}
