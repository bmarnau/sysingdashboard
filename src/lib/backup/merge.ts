/**
 * Anwenden der Backup-Inhalte auf den lokalen Zustand (Modus-Logik).
 *
 * Enthält bewusst keine Protokollierung und kein Rollback — beides liegt in
 * `audit.ts` bzw. `rollback.ts`, damit die Schreibstrategie isoliert testbar
 * bleibt.
 */

import { listCurrentAppKeys } from "./rollback";
import type { RestoreMode } from "./types";

export interface DesiredEntry {
  key: string;
  raw: string;
}

export interface ApplyCounts {
  keysWritten: number;
  keysSkipped: number;
  keysConsidered: number;
}

/**
 * Schreibt die gewünschten Keys entsprechend dem Modus und validiert danach.
 * Wirft bei abweichendem Ergebnis — der Aufrufer rollt dann zurück.
 */
export function applyRestoreEntries(
  mode: RestoreMode,
  desired: DesiredEntry[],
  counts: ApplyCounts,
): void {
  if (mode === "overwrite") {
    for (const k of listCurrentAppKeys()) {
      if (!desired.some((d) => d.key === k)) {
        window.localStorage.removeItem(k);
        counts.keysSkipped++;
      }
    }
  }
  for (const { key, raw } of desired) {
    window.localStorage.setItem(key, raw);
    counts.keysWritten++;
  }

  // Nachvalidierung: jeder geschriebene Key muss exakt übereinstimmen.
  let verifyMiss = 0;
  for (const { key, raw } of desired) {
    if (window.localStorage.getItem(key) !== raw) verifyMiss++;
  }
  if (verifyMiss > 0) {
    throw new Error(`Nach-Validierung fehlgeschlagen: ${verifyMiss} Keys weichen ab.`);
  }
}

/** Ermittelt alle Keys, die vom Restore berührt werden (für den Pre-Snapshot). */
export function collectTouchedKeys(mode: RestoreMode, desired: DesiredEntry[]): string[] {
  const touchKeys = new Set<string>(desired.map((d) => d.key));
  if (mode === "overwrite") {
    for (const k of listCurrentAppKeys()) touchKeys.add(k);
  }
  return Array.from(touchKeys);
}
