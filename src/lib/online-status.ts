/**
 * Zentrale, testbare Online-Erkennung.
 *
 * Bewusst minimal: `navigator.onLine` ist nur ein Indikator für „kein Netz",
 * kein Beweis für Erreichbarkeit der Plattform. Schreibvorgänge scheitern im
 * Zweifel serverseitig — diese Funktion verhindert lediglich sinnlose
 * Requests und erlaubt verständliche Meldungen.
 */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

/** Registriert einen Reconnect-Handler und liefert die Abmeldefunktion. */
export function onReconnect(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}
