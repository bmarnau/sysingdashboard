/**
 * Facade-Hook für die Dashboard-Persistenz (Sprint 06B, Layer-Trennung).
 *
 * Die UI-Schicht (`src/routes`, `src/components`) darf die Persistenz-Schicht
 * `@/lib/store/dashboard-persistence` nicht direkt importieren — siehe
 * `docs/PROJECT-GOVERNANCE.md` Abschnitt 4 und den Detektor
 * `scripts/tech-debt/detectors/layer-violations.mjs` (Finding
 * `td-layer-d1e551ce`).
 *
 * Der Hook kapselt den einmaligen Hydrations-Start. Verhalten identisch zum
 * bisherigen direkten `initDashboardPersistence()`-Aufruf im Mount-Effekt:
 * genau ein Aufruf pro Mount, synchron vor der weiteren Effektlogik.
 */
import { useRef } from "react";
import { initDashboardPersistence } from "@/lib/store/dashboard-persistence";

/**
 * Startet die Store-Hydration idempotent und liefert `true` zurück,
 * sobald sie in diesem Komponentenbaum ausgelöst wurde.
 */
export function useDashboardPersistence(): boolean {
  const started = useRef(false);
  if (!started.current) {
    // Kein useEffect: der Aufrufer erwartet einen hydratisierten Store,
    // bevor er im selben Mount-Effekt normalisiert zurückschreibt.
    started.current = true;
    initDashboardPersistence();
  }
  return started.current;
}
