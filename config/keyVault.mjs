/**
 * Key Vault Readiness (ESM, Backend-only) — Platzhalter.
 *
 * Architektonische Vorbereitung für Azure Key Vault. Heute liest die App
 * Secrets ausschließlich aus Prozess-ENV via `secretManager`. Sobald Key
 * Vault aktiviert wird, kann hier ein Provider registriert werden, der
 * Werte lazy nachlädt (Managed Identity bevorzugt, sonst Client-Secret).
 *
 * Aktivierung später:
 *   1) ENV setzen: AZURE_KEY_VAULT_URL, optional AZURE_CLIENT_SECRET
 *   2) `@azure/identity` + `@azure/keyvault-secrets` installieren
 *   3) `resolveSecret` mit echter Implementierung ersetzen
 *   4) `secretManager.consume()` bei Vault-Treffer bevorzugen
 *
 * Niemals aus `src/` importieren.
 */

import { getEnv } from "./secretManager.mjs";

export function isKeyVaultConfigured() {
  return Boolean(getEnv("AZURE_KEY_VAULT_URL", false));
}

/**
 * Platzhalter — gibt heute immer `null` zurück. Aufrufer fallen automatisch
 * auf ENV-basierte Secrets zurück. Wirft bewusst nicht, damit DEV ohne
 * Vault stabil bleibt.
 *
 * @param {string} _name
 * @returns {Promise<string | null>}
 */
export async function resolveSecret(_name) {
  return null;
}

export default { isKeyVaultConfigured, resolveSecret };
