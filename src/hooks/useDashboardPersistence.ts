/**
 * Facade für die Dashboard-Persistenz (Sprint 06B, Layer-Trennung).
 *
 * Die UI-Schicht (`src/routes`, `src/components`) darf die Persistenz-Schicht
 * `@/lib/store/dashboard-persistence` nicht direkt importieren — siehe
 * `docs/PROJECT-GOVERNANCE.md` Abschnitt 4 und den Detektor
 * `scripts/tech-debt/detectors/layer-violations.mjs` (Finding
 * `td-layer-d1e551ce`).
 *
 * Die Facade kapselt den Hydrations-Start, ohne das Verhalten zu ändern:
 * ein Aufruf pro Mount, synchron im Mount-Effekt, damit direkt danach ein
 * normalisiertes Zurückschreiben auf dem hydratisierten Store möglich ist.
 */
import { useCallback } from "react";
import { initDashboardPersistence } from "@/lib/store/dashboard-persistence";

/**
 * Startet die Store-Hydration (user-scoped Blob, storage-Event, User-Wechsel).
 * Direkt im Mount-Effekt aufrufen — nicht während des Renderns.
 */
export function hydrateDashboardStore(): void {
  initDashboardPersistence();
}

/** Hook-Variante mit stabiler Referenz für Effekt-Abhängigkeitslisten. */
export function useDashboardPersistence(): () => void {
  return useCallback(hydrateDashboardStore, []);
}
