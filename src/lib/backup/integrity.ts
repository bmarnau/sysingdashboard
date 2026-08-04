/**
 * Prüfungen: Konsistenz des Snapshots vor dem Packen und Validierung des
 * erzeugten Archivs nach dem Packen.
 */

import { strFromU8, unzipSync } from "fflate";
import { PROJECT_NAME, looksSensitive, safeKeyFileName } from "./constants";
import type { BackupCheckResult, BackupCheckStatus, Snapshot } from "./types";

export function runConsistencyCheck(snapshot: Snapshot): BackupCheckResult {
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

export function validateZip(bytes: Uint8Array, snapshot: Snapshot): BackupCheckResult {
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
    if (entries[`data/${safeKeyFileName(ex)}.json`]) {
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
