/**
 * Reine Typen des zentralen Loggers.
 *
 * Ausgelagert, damit `src/lib/logger.ts` und `src/lib/logger.indexeddb.ts`
 * keinen wechselseitigen Import mehr aufbauen (löst td-cycle-dc9fbe11).
 * Dieses Modul importiert nichts, hat keine Nebenwirkungen.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  ts: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string; code?: string };
}
