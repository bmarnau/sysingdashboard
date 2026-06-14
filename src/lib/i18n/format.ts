/**
 * Datums-/Zahlenformatierung gebunden an die aktive Locale.
 * Bestehende `toLocaleDateString("de-DE", …)`-Aufrufe bleiben funktional
 * (immer deutsch). Neue Stellen sollten diese Helfer verwenden, damit ein
 * späterer Sprachwechsel automatisch durchschlägt.
 */
import { getLocale } from "./locale";

export function formatDate(d: Date, opts?: Intl.DateTimeFormatOptions): string {
  return d.toLocaleDateString(getLocale(), opts);
}

export function formatTime(d: Date, opts?: Intl.DateTimeFormatOptions): string {
  return d.toLocaleTimeString(getLocale(), opts);
}

export function formatNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  return n.toLocaleString(getLocale(), opts);
}
