/**
 * Typen der zentralen Refresh-Schicht (Sprint 09C).
 *
 * Ein Refresh-Schritt ist eine reine Leseoperation einer bestehenden
 * Fachfassade. Der Koordinator kennt keine Provider (Supabase, Azure, …) —
 * Providerwechsel finden ausschließlich unterhalb der Services statt.
 */

export interface RefreshStep {
  /** Stabile technische Kennung, z. B. `reference-data`. */
  id: string;
  /** Für Benutzer verständliche Bereichsbezeichnung, z. B. „Kataloge“. */
  label: string;
  /**
   * Reihenfolgestufe: Schritte einer Stufe laufen parallel, Stufen werden
   * nacheinander abgearbeitet (Kataloge vor AVKK-Auswertung).
   */
  stage?: number;
  /** Reine Leseoperation. Darf keine Schreibpfade aufrufen. */
  run: () => void | Promise<void>;
}

export interface RefreshFailure {
  id: string;
  label: string;
  message: string;
}

export interface RefreshResult {
  ok: boolean;
  failed: RefreshFailure[];
  finishedAt: string;
}
