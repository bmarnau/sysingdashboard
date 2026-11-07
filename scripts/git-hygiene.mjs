#!/usr/bin/env node
/**
 * Git-Hygiene-Bericht und lokales Aufräumen.
 *
 *  - Gemergte Remote-Branches (in origin/main enthalten), die gelöscht werden können.
 *  - Gemergte lokale Branches.
 *  - Nicht eingecheckte, nicht ignorierte Dateien (Hinweis, wird nie gelöscht).
 *  - Geschützte Muster werden ausgenommen: main, lovable*, backup/*, audit/*, ops/*, merge/lovable*.
 *
 * Aufruf: `npm run git:hygiene` (Bericht, löscht nichts, Exit 0)
 *         `npm run git:hygiene -- --fix` (Startroutine: löscht nur lokale, gemergte Branches
 *           mit `git branch -d`, ohne aktuellen Branch und ohne Branches in Worktrees;
 *           entfernt verwaiste Worktree-Einträge mit `git worktree prune`)
 *         `npm run git:hygiene -- --strict` (Exit 1, wenn mehr als MAX gemergte Remote-Branches)
 * Remote-Branches löscht ausschließlich der Nutzer lokal (siehe docs/GIT-AUFRAEUMEN.md).
 */
import { execFileSync } from "node:child_process";

const MAX = 10;
const PROTECTED = [
  /^main$/,
  /^HEAD/,
  /^lovable/,
  /^backup\//,
  /^audit\//,
  /^ops\//,
  /^merge\/lovable/,
];
const strict = process.argv.includes("--strict");
const fix = process.argv.includes("--fix");

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

if (fix) {
  git("worktree", "prune");
  const current = git("branch", "--show-current");
  // Branches, die in einem Worktree ausgecheckt sind, bleiben stehen.
  const inWorktree = new Set(
    git("worktree", "list", "--porcelain")
      .split("\n")
      .filter((l) => l.startsWith("branch refs/heads/"))
      .map((l) => l.slice("branch refs/heads/".length)),
  );
  const removed = [];
  for (const b of local) {
    if (b === current || inWorktree.has(b)) continue;
    try {
      git("branch", "-d", b);
      removed.push(b);
    } catch {
      console.warn(`[git:hygiene] Hinweis: ${b} nicht gelöscht (git branch -d verweigert).`);
    }
  }
  console.log(`[git:hygiene] Lokal gelöscht (gemergt): ${removed.length}`);
  for (const b of removed) console.log(`  ${b}`);
  const rest = local.filter((b) => !removed.includes(b));
  console.log(`[git:hygiene] Gemergte lokale Branches (verbleibend): ${rest.length}`);
  for (const b of rest) console.log(`  ${b}`);
} else {
  console.log(`[git:hygiene] Gemergte lokale Branches (löschbar): ${local.length}`);
  for (const b of local) console.log(`  ${b}`);
}

console.log(
  `[git:hygiene] Gemergte Remote-Branches (löschbar, nur durch den Nutzer): ${remote.length}`,
);
for (const b of remote) console.log(`  origin/${b}`);

const untracked = lines(git("ls-files", "--others", "--exclude-standard", "--directory"));
console.log(`[git:hygiene] Nicht eingecheckt, nicht ignoriert: ${untracked.length}`);
for (const f of untracked) console.log(`  ${f}`);

if (strict && remote.length > MAX) {
  console.error(
    `[git:hygiene] FAIL — ${remote.length} gemergte Remote-Branches (Grenze ${MAX}). Aufräumen laut docs/GIT-AUFRAEUMEN.md.`,
  );
  process.exit(1);
}
