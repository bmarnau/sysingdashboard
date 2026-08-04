/**
 * Wiederherstellung eines Backup-Archivs in den lokalen Zustand.
 *
 * Alle Modi arbeiten transaktional: vor dem Schreiben wird ein Pre-Snapshot
 * der betroffenen localStorage-Keys angelegt. Tritt beim Schreiben oder bei
 * der Nach-Validierung ein Fehler auf, wird der Snapshot zurückgespielt und
 * `rollback: true` gemeldet — keinerlei Teilzustand bleibt zurück.
 */

import { strFromU8, unzipSync } from "fflate";
import { logger } from "../logger";
import { BackupError } from "../errors";
import { writeRestoreLog } from "./audit";
import { PROJECT_NAME, looksSensitive } from "./constants";
import { applyRestoreEntries, collectTouchedKeys, type DesiredEntry } from "./merge";
import { listCurrentAppKeys, registerSnapshot, rollbackSnapshot, takeSnapshotOf } from "./rollback";
import type { RestoreOptions, RestoreResult, Snapshot } from "./types";

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

  const desiredKeyValues: DesiredEntry[] = [];
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
  const snap = takeSnapshotOf(collectTouchedKeys(opts.mode, desiredKeyValues));
  registerSnapshot(snap);

  // 8. Anwenden (transaktional inkl. Nachvalidierung)
  try {
    applyRestoreEntries(opts.mode, desiredKeyValues, counts);
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
