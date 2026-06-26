/**
 * Lazy einmaliger ENV-Validation-Guard für TanStack Server-Routes.
 *
 * In Workern gibt es keinen klassischen Boot-Hook — daher prüfen wir
 * beim ersten Request und cachen das Ergebnis. In PROD führt eine
 * fehlende Pflicht-ENV zu einem aggregierten Throw (vom Route-Handler
 * in eine generische 500-Antwort übersetzt). In DEV nur Warnung.
 */

import { validateEnv } from "../../config/envValidator.mjs";

let cached = null;

export function ensureEnv() {
  if (cached) return cached;
  // validateEnv() wirft in PROD bei Fehlen — bewusst NICHT cachen, damit
  // ein nachgelagerter Fix beim nächsten Request erneut greift.
  const result = validateEnv();
  cached = result;
  return result;
}
