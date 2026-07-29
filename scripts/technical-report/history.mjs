/**
 * Unveränderbare Berichtshistorie für den technischen Prüfbericht 2.0.
 *
 * - Jeder Lauf schreibt eine neue Datei unter test-report/history/.
 * - Der Index bleibt append-only; freigegebene Berichte (released) werden
 *   zusätzlich schreibgeschützt und im Index als `released: true` markiert.
 * - Löschungen erfolgen nur über archive.mjs (siehe Prompt-§5), damit ein
 *   Audit-Nachweis erzwungen bleibt.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import path from "node:path";

export const HISTORY_DIR = "test-report/history";
export const RELEASED_DIR = "test-report/history/released";
export const INDEX_FILE = "test-report/history/index.json";

function readJsonSafe(p, fallback) {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

export function loadIndex(root = process.cwd()) {
  const p = path.join(root, INDEX_FILE);
  const data = readJsonSafe(p, { schemaVersion: "1.0.0", entries: [] });
  if (!Array.isArray(data.entries)) data.entries = [];
  return data;
}

export function nextReportVersion(index) {
  const max = index.entries.reduce((acc, e) => Math.max(acc, Number(e.version) || 0), 0);
  return max + 1;
}

export function findParentReportId(index) {
  if (index.entries.length === 0) return null;
  // Sortiert absteigend nach version; jüngster Eintrag ist der Vorgänger.
  const sorted = [...index.entries].sort((a, b) => (b.version || 0) - (a.version || 0));
  return sorted[0]?.id ?? null;
}

export function loadParentReport(index, root = process.cwd()) {
  const parentId = findParentReportId(index);
  if (!parentId) return null;
  const entry = index.entries.find((e) => e.id === parentId);
  if (!entry?.file) return null;
  return readJsonSafe(path.join(root, entry.file), null);
}

/**
 * Schreibt einen Report als Historie-Snapshot und aktualisiert den Index.
 * Gibt den relativen Pfad des Snapshots zurück.
 */
export function appendHistory(report, root = process.cwd()) {
  const dir = path.join(root, HISTORY_DIR);
  mkdirSync(dir, { recursive: true });
  const stamp = (report.generatedAt || new Date().toISOString()).replace(/[:.]/g, "-");
  const fileRel = `${HISTORY_DIR}/${stamp}-${report.id}.json`;
  const fileAbs = path.join(root, fileRel);
  writeFileSync(fileAbs, JSON.stringify(report, null, 2));
  // Snapshot ist read-only (0o444) — Aggregator darf nie überschreiben.
  try {
    chmodSync(fileAbs, 0o444);
  } catch {
    /* ignore auf FS ohne POSIX-Rechte */
  }

  const index = loadIndex(root);
  index.entries.push({
    id: report.id,
    version: report.version,
    parentReportId: report.parentReportId ?? null,
    generatedAt: report.generatedAt,
    dashboardVersion: report.identity?.dashboardVersion,
    commit: report.identity?.commit,
    status: report.status,
    releaseStage: {
      proposed: report.releaseStage?.proposed ?? null,
      effective: report.releaseStage?.effective ?? null,
    },
    integrityHash: report.integrity?.value ?? null,
    released: false,
    file: fileRel,
  });
  writeFileSync(path.join(root, INDEX_FILE), JSON.stringify(index, null, 2));
  return fileRel;
}

/** Markiert einen Historie-Eintrag als freigegeben. */
export function markReleased(reportId, actor, root = process.cwd()) {
  const index = loadIndex(root);
  const entry = index.entries.find((e) => e.id === reportId);
  if (!entry) throw new Error(`Report nicht gefunden: ${reportId}`);
  entry.released = true;
  entry.releasedAt = new Date().toISOString();
  entry.releasedBy = actor ?? "unknown";
  writeFileSync(path.join(root, INDEX_FILE), JSON.stringify(index, null, 2));
  mkdirSync(path.join(root, RELEASED_DIR), { recursive: true });
  const link = path.join(root, RELEASED_DIR, path.basename(entry.file));
  if (!existsSync(link)) {
    writeFileSync(link, readFileSync(path.join(root, entry.file)));
    try {
      chmodSync(link, 0o444);
    } catch {
      /* ignore */
    }
  }
  return entry;
}
