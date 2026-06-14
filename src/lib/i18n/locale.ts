/**
 * Zentrale Locale-/Sprachkonfiguration.
 *
 * Standardsprache ist Deutsch (de-DE). Englisch (en-US) ist als zweite
 * Locale vorbereitet, aber Übersetzungen sind noch nicht vollständig.
 * Fehlende Schlüssel fallen auf Deutsch zurück.
 *
 * Architektur-Hinweis: Bewusst minimal gehalten, ohne externe i18n-Bibliothek.
 * Komponenten können `t("key")` aufrufen oder direkt aus `useLocale()` lesen.
 * Spracheinstellung wird in localStorage gespeichert (Key: `app.locale`).
 */

import { useSyncExternalStore } from "react";
import { de } from "./de";
import { en } from "./en";

export type LocaleCode = "de-DE" | "en-US";

export const DEFAULT_LOCALE: LocaleCode = "de-DE";
export const SUPPORTED_LOCALES: LocaleCode[] = ["de-DE", "en-US"];
const STORAGE_KEY = "app.locale";

const dictionaries: Record<LocaleCode, Record<string, string>> = {
  "de-DE": de,
  "en-US": en,
};

function readStored(): LocaleCode {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v && (SUPPORTED_LOCALES as string[]).includes(v)) return v as LocaleCode;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

let currentLocale: LocaleCode = readStored();
const listeners = new Set<() => void>();

export function getLocale(): LocaleCode {
  return currentLocale;
}

export function setLocale(loc: LocaleCode): void {
  if (!SUPPORTED_LOCALES.includes(loc)) return;
  currentLocale = loc;
  try {
    window.localStorage.setItem(STORAGE_KEY, loc);
    document.documentElement.lang = loc.split("-")[0];
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** React-Hook: liefert die aktive Locale und reagiert auf Wechsel. */
export function useLocale(): LocaleCode {
  return useSyncExternalStore(
    subscribe,
    () => currentLocale,
    () => DEFAULT_LOCALE,
  );
}

/** Übersetzungsfunktion mit Fallback auf Deutsch und dann Schlüssel. */
export function t(key: string, locale: LocaleCode = currentLocale): string {
  return dictionaries[locale]?.[key] ?? dictionaries["de-DE"][key] ?? key;
}

/** React-Hook für Übersetzungen — reagiert auf Sprachwechsel. */
export function useT(): (key: string) => string {
  const loc = useLocale();
  return (key: string) => t(key, loc);
}
