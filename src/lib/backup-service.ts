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
  if (/(eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+)/.test(value)) return true; // JWT
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

interface BackupRecord extends BackupRecordMeta {
  blob: Blob;
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
    // Lazy import, um Zyklen zu vermeiden und Schema-Drift abzufangen.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JsonExportService } = require("./json-export-service") as typeof import("./json-export-service");
    const res = JsonExportService.exportFullJson({ exportedBy: "backup-service" });
    files["dashboard.json"] = strToU8(JSON.stringify(res.document, null, 2));
  } catch (err) {
    // Nicht eskalieren — Backup geht ohne dashboard.json weiter.
    console.warn("[Backup] dashboard.json konnte nicht eingebettet werden:", err);
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
        throw new Error(
          "Projektprüfung fehlgeschlagen: " + consistency.messages.join("; "),
        );
      }

      // 3. ZIP bauen
      const bytes = buildZip(snapshot);
      sizeBytes = bytes.length;
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/zip" });

      // 4. ZIP validieren
      zipValidation = validateZip(bytes, snapshot);
      if (zipValidation.status === "failed") {
        throw new Error(
          "ZIP-Validierung fehlgeschlagen: " + zipValidation.messages.join("; "),
        );
      }

      // 5. Persistieren
      const status: BackupCheckStatus =
        consistency.status === "warning" || zipValidation.status === "warning"
          ? "warning"
          : "ok";

      const record: BackupRecord = {
        id,
        fileName,
        createdAt: new Date().toISOString(),
        sizeBytes,
        manual,
        status,
        checkMessages: [...consistency.messages, ...zipValidation.messages],
        blob,
      };

      await dbTx("readwrite", (s) => s.put(record));
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

      const { blob: _b, ...meta } = record;
      return { ok: true, record: meta, log: logEntry };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      console.error("[Backup] fehlgeschlagen:", err);

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
      const all = await dbTx<BackupRecord[]>(
        "readonly",
        (s) => s.getAll() as IDBRequest<BackupRecord[]>,
      );
      return all
        .map(({ blob: _b, ...meta }) => meta)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      console.error("[Backup] Liste konnte nicht geladen werden:", err);
      return [];
    }
  },

  async get(id: string): Promise<BackupRecord | undefined> {
    return dbTx<BackupRecord | undefined>(
      "readonly",
      (s) => s.get(id) as IDBRequest<BackupRecord | undefined>,
    );
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
        console.error("[Backup] geplanter Lauf fehlgeschlagen:", err);
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
