/**
 * Test-Environment-Bootstrap — läuft als ERSTE `setupFile`, also vor jedem
 * Testmodul und damit vor dem ersten Import von `@/integrations/supabase/client`.
 *
 * Hintergrund: Der generierte Supabase-Client wirft beim ersten Property-Zugriff,
 * wenn weder `VITE_SUPABASE_*` noch `SUPABASE_*` gesetzt sind. Lokal sind diese
 * Variablen über `.env` vorhanden, in der CI nicht — dort schlugen Tests mit
 * "Missing Supabase environment variable(s)" fehl.
 *
 * Lösung: nicht geheime, rein lokale Platzhalter. Sie zeigen bewusst auf einen
 * Loopback-Port, damit ein versehentlicher Request NIEMALS eine produktive
 * Supabase-Instanz erreicht (Connection refused statt echter Traffic).
 * Es werden ausschließlich fehlende Werte gesetzt — eine bereits gesetzte
 * Umgebung (z. B. lokale `.env`) bleibt unverändert.
 */

/** Loopback-Platzhalter — kein echter Endpunkt, kein Secret. */
export const TEST_SUPABASE_URL = "http://127.0.0.1:54321";
/** Nicht geheimer Platzhalter-Key im Publishable-Format. */
export const TEST_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test-placeholder-key";

function setIfMissing(name: string, value: string): void {
  const current = process.env[name];
  if (typeof current !== "string" || current.length === 0) {
    process.env[name] = value;
  }
}

setIfMissing("SUPABASE_URL", TEST_SUPABASE_URL);
setIfMissing("SUPABASE_PUBLISHABLE_KEY", TEST_SUPABASE_PUBLISHABLE_KEY);
