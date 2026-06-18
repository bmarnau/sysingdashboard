#!/usr/bin/env node
/**
 * Beispieldatei-Test
 *
 * Validiert die im `ExampleFileService` definierten Beispiel-JSONs gegen
 * das JSON-Schema v1 und prüft referenzielle Integrität sowie
 * Benutzer-/Projekt-Zuordnungen.
 *
 * Aufruf: `bun run test:examples` (oder `node scripts/test-example-files.mjs`).
 *
 * Hinweis: Wir laden TS-Module via tsx über die Bun-Runtime — kein
 * separater Vitest-Aufbau, damit das Projekt keine zusätzliche
 * Test-Framework-Abhängigkeit braucht.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const ENTRY = resolve(ROOT, "scripts/_run-example-tests.ts");

if (!existsSync(ENTRY)) {
  console.error(`Fehlt: ${ENTRY}`);
  process.exit(1);
}

// `bun run` versteht TS-Dateien direkt.
const bun = process.env.BUN_BIN || "bun";
const r = spawnSync(bun, ["run", ENTRY], { stdio: "inherit" });
process.exit(r.status ?? 1);
