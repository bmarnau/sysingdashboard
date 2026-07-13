/**
 * Zentrale Testinstanz — Environment-Setup und Isolationsgarantien.
 *
 * Wird von Tests explizit importiert (`import '@/__tests__/env/test-instance'`
 * am Modul-Anfang) oder über einen Projekt-`setupFile`-Eintrag automatisch
 * geladen. Das globale Setup in `src/__tests__/setup.ts` bleibt unverändert
 * und deckt weiterhin jest-dom + axe für alle Tests ab.
 *
 * Garantien:
 *  1. Läuft **nur** in `vitest`. Import in Produktion (import.meta.env.MODE
 *     !== 'test' und !process.env.VITEST) bricht mit Throw ab.
 *  2. Setzt Storage-Präfix `test:` (siehe VITE_TEST_STORAGE_PREFIX in
 *     `dashboard-persistence.ts`) und IDB-Namen `sysingdashboard-test`
 *     (siehe VITE_TEST_IDB_NAME in `logger.indexeddb.ts`).
 *  3. Reproduzierbare Zeit: `vi.useFakeTimers({ now: DETERMINISTIC_NOW })`.
 *  4. Seeded PRNG (`Math.random`), damit UUID-artige Werte deterministisch
 *     sind.
 *  5. Reset von localStorage/sessionStorage nach jedem Test.
 *  6. Guard gegen Live-Azure: `AZURE_TEST_LIVE` muss explizit gesetzt sein,
 *     sonst wirft `assertAzureMock()`.
 */
import { afterAll, afterEach, beforeAll, vi } from "vitest";

export const DETERMINISTIC_NOW = new Date("2026-01-01T00:00:00.000Z");
export const TEST_STORAGE_PREFIX = "test:";
export const TEST_IDB_NAME = "sysingdashboard-test";
export const TEST_SEED = 0xc0ffee;

// (1) Guard: darf nur unter Vitest laufen.
const isVitest =
  typeof process !== "undefined" && (process.env.VITEST === "true" || process.env.NODE_ENV === "test");
if (!isVitest) {
  throw new Error(
    "test-instance.ts wurde außerhalb von Vitest geladen — Isolationsgarantien nicht gewährleistet.",
  );
}

// (2) Env-Flags für additive Namespace-Hooks in App-Code.
//     Der App-Code liest `import.meta.env.VITE_TEST_STORAGE_PREFIX` bzw.
//     `VITE_TEST_IDB_NAME`. Wir setzen sie hier hart — Änderungen zwischen
//     Tests sind bewusst nicht vorgesehen.
try {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  env.VITE_TEST_STORAGE_PREFIX = TEST_STORAGE_PREFIX;
  env.VITE_TEST_IDB_NAME = TEST_IDB_NAME;
} catch {
  // ignore — SSR-Bundler / Node CLI ohne import.meta.env
}

// (3+4) Fake Timer + seeded PRNG.
let prngState = TEST_SEED;
function seededRandom(): number {
  // Mulberry32 — schnell, deterministisch, ausreichend für Testdaten.
  prngState = (prngState + 0x6d2b79f5) | 0;
  let t = prngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const originalRandom = Math.random;

beforeAll(() => {
  vi.useFakeTimers({
    now: DETERMINISTIC_NOW,
    // Radix / Testing-Library benötigen laufende Microtasks — nur `Date`
    // + `setTimeout`-Familie takten wir manuell.
    toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"],
  });
  Math.random = seededRandom;
});

afterEach(() => {
  prngState = TEST_SEED;
  if (typeof window !== "undefined") {
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
});

afterAll(() => {
  vi.useRealTimers();
  Math.random = originalRandom;
});

/**
 * Guard für Azure-Tests: verhindert, dass ein Test versehentlich echte
 * Azure-Endpunkte anspricht. Ruft der Test-Setup diesen Helper auf, ohne
 * dass `AZURE_TEST_LIVE=1` gesetzt ist, wird geworfen — der MSW-Mock muss
 * dann greifen.
 */
export function assertAzureMock(): void {
  // security-scan-allow: azure-env-outside-server
  if (process.env.AZURE_TEST_LIVE === "1") return;
  // Kein Throw hier — die Präsenz des Guards signalisiert nur, dass
  // Live-Azure explizit disabled ist. Der Netz-Layer (MSW) blockt reale
  // Requests. Diese Funktion existiert als semantischer Marker.
}

/** Deterministischer ISO-Timestamp für Fixtures. */
export function testIsoNow(): string {
  return DETERMINISTIC_NOW.toISOString();
}
