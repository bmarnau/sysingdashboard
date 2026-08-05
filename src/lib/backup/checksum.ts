/**
 * Prüfsummen für Backup-Einträge (Backupformat 2.0).
 *
 * Bewusst WebCrypto statt einer eigenen Hash-Implementierung: in Browser,
 * Worker und Node-Testumgebung identisch verfügbar und geprüft.
 */

const HEX = "0123456789abcdef";

function toHex(buf: ArrayBuffer): string {
  const view = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < view.length; i++) {
    out += HEX[view[i] >> 4] + HEX[view[i] & 0x0f];
  }
  return out;
}

/** SHA-256 als Hex-String, ohne Präfix. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return toHex(digest);
}

/** Kanonische Prüfsummen-Notation im Manifest: `sha256:<hex>`. */
export async function checksumOf(bytes: Uint8Array): Promise<string> {
  return `sha256:${await sha256Hex(bytes)}`;
}
