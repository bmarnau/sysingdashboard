/**
 * envValidator (ESM, Backend-only) — Kompatibilitäts-Fassade.
 *
 * Re-exportiert die zentralen Helfer aus `config/secretManager.mjs`, damit
 * Aufrufer den semantisch klareren Namen `envValidator` nutzen können.
 * Die tatsächliche Logik (KNOWN-Liste, Validierung, Masking, getEnv) lebt
 * ausschließlich im secretManager — Single Source of Truth.
 *
 * WICHTIG: Niemals aus `src/` importieren (Backend-only, Secret-Scope).
 */

export {
  KNOWN,
  REQUIRED_IN_PROD,
  has,
  preview,
  status,
  mask,
  getEnv,
  validate,
  isDev,
  isProd,
} from "./secretManager.mjs";

// Alias: einige Aufrufer kennen die Funktion als `validateEnv`.
export { validate as validateEnv } from "./secretManager.mjs";
