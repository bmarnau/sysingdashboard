/**
 * RefreshCoordinator — zentrale, providerneutrale Orchestrierung des
 * manuellen Daten-Refresh (Sprint 09C).
 *
 * Regeln:
 * - Nur Lesepfade. Es wird nie geschrieben (kein Seed, kein AVKK-Write,
 *   kein Backup, kein Report).
 * - Kein `window.location.reload()` — der Refresh ist ein kontrollierter
 *   Anwendungs-Refresh.
 * - Single-Flight: ein laufender Refresh wird bei Mehrfachklick
 *   wiederverwendet; es gibt keine konkurrierenden Läufe.
 * - Teilfehler stoppen die übrigen Bereiche nicht; bereits gültige Daten
 *   bleiben erhalten.
 * - Kein Provider-Import (kein Supabase) an dieser Stelle.
 */
import { logger } from "@/lib/logger";
import type { RefreshFailure, RefreshResult, RefreshStep } from "./types";

const steps = new Map<string, RefreshStep>();
const listeners = new Set<() => void>();

let generation = 0;
let inFlight: Promise<RefreshResult> | null = null;
let lastResult: RefreshResult | null = null;

/** Registriert (oder ersetzt) einen Refresh-Schritt. Liefert das Deregistrieren. */
export function registerRefreshStep(step: RefreshStep): () => void {
  steps.set(step.id, step);
  return () => {
    if (steps.get(step.id) === step) steps.delete(step.id);
  };
}

export function listRefreshSteps(): RefreshStep[] {
  return [...steps.values()];
}

/** Monoton steigende Generation — Hooks hängen sie in ihre Effekt-Deps. */
export function refreshGeneration(): number {
  return generation;
}

export function lastRefreshResult(): RefreshResult | null {
  return lastResult;
}

/** Abonniert Generationswechsel (nach Abschluss eines Laufs). */
export function subscribeRefresh(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const listener of [...listeners]) listener();
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Bereich konnte nicht aktualisiert werden.";
}

async function runStages(): Promise<RefreshFailure[]> {
  const failed: RefreshFailure[] = [];
  const stages = [...new Set(listRefreshSteps().map((s) => s.stage ?? 0))].sort((a, b) => a - b);

  for (const stage of stages) {
    const current = listRefreshSteps().filter((s) => (s.stage ?? 0) === stage);
    const results = await Promise.allSettled(current.map(async (s) => s.run()));
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const step = current[i];
        const message = messageOf(r.reason);
        failed.push({ id: step.id, label: step.label, message });
        logger.warn("Refresh-Schritt fehlgeschlagen", { step: step.id, message });
      }
    });
  }
  return failed;
}

/**
 * Führt den zentralen Refresh aus. Bei parallelem Aufruf wird der laufende
 * Vorgang zurückgegeben (Single-Flight).
 */
export function runRefresh(): Promise<RefreshResult> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const failed = await runStages();
    const result: RefreshResult = {
      ok: failed.length === 0,
      failed,
      finishedAt: new Date().toISOString(),
    };
    lastResult = result;
    generation += 1;
    notify();
    return result;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

export function isRefreshRunning(): boolean {
  return inFlight !== null;
}

/** Nur für Tests: Registry und Zustand zurücksetzen. */
export function __resetRefreshForTest(): void {
  steps.clear();
  listeners.clear();
  generation = 0;
  inFlight = null;
  lastResult = null;
}
