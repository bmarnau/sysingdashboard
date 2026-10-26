#!/usr/bin/env node
/**
 * Git-Hygiene-Bericht (nur lesend, löscht nichts).
 *
 *  - Gemergte Remote-Branches (in origin/main enthalten), die gelöscht werden können.
 *  - Gemergte lokale Branches.
 *  - Geschützte Muster werden ausgenommen: main, lovable*, backup/*, audit/*, merge/lovable*.
 *
 * Aufruf: `npm run git:hygiene` (Bericht, Exit 0)
 *         `npm run git:hygiene -- --strict` (Exit 1, wenn mehr als MAX gemergte Remote-Branches)
 * Löschen erfolgt ausschließlich lokal durch den Nutzer (siehe docs/GIT-AUFRAEUMEN.md).
 */
import { execFileSync } from "node:child_process";

const MAX = 10;
const PROTECTED = [/^main$/, /^HEAD/, /^lovable/, /^backup\//, /^audit\//, /^merge\/lovable/];
const strict = process.argv.includes("--strict");

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const lines = (s) =>
  s
    .split("\n")
    .map((l) => l.replace(/^[*+\s]+/, "").trim())
    .filter(Boolean);
const deletable = (name) => !PROTECTED.some((re) => re.test(name));

try {
  git("fetch", "--prune", "--quiet", "origin");
} catch {
  console.warn("[git:hygiene] Hinweis: fetch nicht möglich, Bericht nutzt den lokalen Stand.");
}

const remote = lines(git("branch", "-r", "--merged", "origin/main"))
  .filter((b) => b.startsWith("origin/") && !b.includes("->"))
  .map((b) => b.slice("origin/".length))
  .filter(deletable);
const local = lines(git("branch", "--merged", "origin/main")).filter(deletable);

console.log(`[git:hygiene] Gemergte Remote-Branches (löschbar): ${remote.length}`);
for (const b of remote) console.log(`  origin/${b}`);
console.log(`[git:hygiene] Gemergte lokale Branches (löschbar): ${local.length}`);
for (const b of local) console.log(`  ${b}`);

if (strict && remote.length > MAX) {
  console.error(
    `[git:hygiene] FAIL — ${remote.length} gemergte Remote-Branches (Grenze ${MAX}). Aufräumen laut docs/GIT-AUFRAEUMEN.md.`,
  );
  process.exit(1);
}
