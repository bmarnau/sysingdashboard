/**
 * Prüfungen: Konsistenz des Snapshots vor dem Packen, Validierung des
 * erzeugten Archivs nach dem Packen sowie die manifestbasierte
 * Eintragsprüfung des Backupformats 2.0.
 */

import { strFromU8, unzipSync } from "fflate";
import { checksumOf } from "./checksum";
import {
  PROJECT_NAME,
  contentTypeForPath,
  isCurrentDashboardStorageKey,
  looksSensitive,
} from "./constants";
import { loadManifest } from "./manifest";
import { validateAvkkPayload, type AvkkValidation } from "./avkk-payload";
import type { BackupCheckResult, BackupCheckStatus, BackupManifestV2, Snapshot } from "./types";

/**
 * Prüft die Zuordnungstabelle des Manifests gegen den tatsächlichen
 * Archivinhalt. Jede Abweichung ist ein harter Fehler — damit werden
 * manipulierte Manifeste erkannt.
 */
export async function validateManifestEntries(
  manifest: BackupManifestV2,
  zip: Record<string, Uint8Array>,
): Promise<BackupCheckResult> {
  const msgs: string[] = [];
  const entries = manifest.entries ?? [];

  if (entries.length === 0) {
    return { status: "failed", messages: ["Manifest enthält keine Einträge (`entries` leer)."] };
  }

  const seenLogical = new Set<string>();
  const seenStorage = new Set<string>();
  const seenPath = new Set<string>();

  for (const e of entries) {
    if (seenLogical.has(e.logicalName)) {
      msgs.push(`Doppelter logischer Name im Manifest: ${e.logicalName}`);
    }
    seenLogical.add(e.logicalName);

    if (e.storageKey !== null) {
      if (seenStorage.has(e.storageKey)) {
        msgs.push(`Doppelter Storage-Key im Manifest: ${e.storageKey}`);
      }
      seenStorage.add(e.storageKey);
    }

    if (seenPath.has(e.path)) {
      msgs.push(`Doppelte Speicheradresse im Manifest: ${e.path}`);
    }
    seenPath.add(e.path);

    const bytes = zip[e.path];
    if (!bytes) {
      msgs.push(`Im Manifest gelistete Datei fehlt im Archiv: ${e.path}`);
      continue;
    }
    if (bytes.length !== e.size) {
      msgs.push(`Größe weicht ab für ${e.path}: erwartet ${e.size}, gefunden ${bytes.length}.`);
    }
    const actual = await checksumOf(bytes);
    if (actual !== e.checksum) {
      msgs.push(`Prüfsumme weicht ab für ${e.path}.`);
    }
    const expectedType = contentTypeForPath(e.path);
    if (e.contentType !== expectedType) {
      msgs.push(
        `Dateityp unplausibel für ${e.path}: Manifest meldet ${e.contentType}, erwartet ${expectedType}.`,
      );
    }
  }

  for (const path of Object.keys(zip)) {
    if (path === "manifest.json") continue;
    if (!seenPath.has(path)) {
      msgs.push(`Datei ohne Manifest-Eintrag im Archiv: ${path}`);
    }
  }

  return msgs.length > 0 ? { status: "failed", messages: msgs } : { status: "ok", messages: [] };
}

/**
 * Liest die AVKK-Nutzdaten aus dem Archiv und prüft sie vollständig.
 * Beide Dateien gehören zusammen: fehlt eine, ist das ein harter Fehler.
 */
export function checkAvkkArchive(
  manifest: BackupManifestV2,
  zip: Record<string, Uint8Array>,
  options: { knownSubjects?: ReadonlySet<string> } = {},
): { present: boolean; validation: AvkkValidation | null; errors: string[] } {
  const errors: string[] = [];
  const find = (logicalName: string): Uint8Array | null => {
    const entry = manifest.entries.find((e) => e.logicalName === logicalName);
    return entry ? (zip[entry.path] ?? null) : null;
  };

  const avkkBytes = find("avkk-dataset");
  const refBytes = find("reference-data");
  if (!avkkBytes && !refBytes) return { present: false, validation: null, errors };
  if (!avkkBytes || !refBytes) {
    errors.push(
      "AVKK-Nutzdaten unvollständig: `avkk.json` und `reference-data.json` müssen beide vorhanden sein.",
    );
    return { present: true, validation: null, errors };
  }

  let avkkRaw: unknown;
  let refRaw: unknown;
  try {
    avkkRaw = JSON.parse(strFromU8(avkkBytes));
    refRaw = JSON.parse(strFromU8(refBytes));
  } catch (err) {
    errors.push(`AVKK-Nutzdaten sind kein gültiges JSON: ${(err as Error).message}`);
    return { present: true, validation: null, errors };
  }

  const validation = validateAvkkPayload(avkkRaw, refRaw, options);
  errors.push(...validation.errors);
  return { present: true, validation, errors };
}

export function runConsistencyCheck(snapshot: Snapshot): BackupCheckResult {
  const msgs: string[] = [];
  let status: BackupCheckStatus = "ok";

  if (snapshot.manifest.keyCount === 0) {
    msgs.push("Keine Dashboard-Daten gefunden — Backup wird trotzdem erstellt.");
    status = "warning";
  }

  // Aktueller Local-First-Vertrag plus bekannte Legacy-Top-Level-Keys.
  const importantHints = ["engineer", "user", "working", "target"];
  const keys = Object.keys(snapshot.data);
  const hasCurrentDashboardState = keys.some(isCurrentDashboardStorageKey);
  const hits = importantHints.filter((h) => keys.some((k) => k.toLowerCase().includes(h)));
  if (snapshot.manifest.keyCount > 0 && !hasCurrentDashboardState && hits.length === 0) {
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

  for (const w of snapshot.avkkWarnings) {
    msgs.push(w);
    if (status === "ok") status = "warning";
  }

  if (snapshot.manifest.excludedKeys.length > 0) {
    msgs.push(
      `${snapshot.manifest.excludedKeys.length} Schlüssel als sensibel ausgeschlossen: ` +
        snapshot.manifest.excludedKeys.join(", "),
    );
  }

  return { status, messages: msgs };
}

export async function validateZip(
  bytes: Uint8Array,
  snapshot: Snapshot,
): Promise<BackupCheckResult> {
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

  // Manifest laden und Zuordnungstabelle prüfen
  let manifest: BackupManifestV2 | null = null;
  try {
    manifest = (await loadManifest(entries)).manifest;
    if (manifest.project !== PROJECT_NAME) {
      msgs.push("Projektname im Manifest stimmt nicht überein.");
      status = "failed";
    }
  } catch (err) {
    msgs.push(`Manifest konnte nicht gelesen werden: ${(err as Error).message}`);
    status = "failed";
  }

  if (manifest) {
    const entryCheck = await validateManifestEntries(manifest, entries);
    if (entryCheck.status === "failed") {
      msgs.push(...entryCheck.messages);
      status = "failed";
    }

    // Datenkeys vollständig?
    const expected = Object.keys(snapshot.data).length;
    const actual = manifest.entries.filter((e) => e.storageKey !== null).length;
    if (expected !== actual) {
      msgs.push(`Erwartet ${expected} Datendateien, im Manifest gefunden: ${actual}.`);
      status = "failed";
    }

    // AVKK-Nutzdaten müssen in sich stimmig sein, sonst ist das Archiv wertlos.
    const avkkCheck = checkAvkkArchive(manifest, entries);
    if (avkkCheck.errors.length > 0) {
      msgs.push(...avkkCheck.errors);
      status = "failed";
    }
    if (snapshot.avkk && !avkkCheck.present) {
      msgs.push("AVKK-Nutzdaten fehlen im Archiv, obwohl sie gesichert werden sollten.");
      status = "failed";
    }

    // Ausgeschlossene Schlüssel dürfen wirklich nicht enthalten sein
    const storageKeys = new Set(
      manifest.entries.map((e) => e.storageKey).filter((k): k is string => k !== null),
    );
    for (const ex of snapshot.manifest.excludedKeys) {
      if (storageKeys.has(ex)) {
        msgs.push(`Sensibler Schlüssel doch im Backup: ${ex}`);
        status = "failed";
      }
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
