export type GitSyncState = "synchronized" | "different" | "unknown";

function normalizeSha(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "unknown") return null;
  return /^[0-9a-f]{7,40}$/.test(normalized) ? normalized : null;
}

export function commitsMatch(
  currentCommit: string | null | undefined,
  mainCommit: string | null | undefined,
): boolean | null {
  const current = normalizeSha(currentCommit);
  const main = normalizeSha(mainCommit);
  if (!current || !main) return null;
  return current.startsWith(main) || main.startsWith(current);
}

export function resolveGitSyncState(
  currentCommit: string | null | undefined,
  mainCommit: string | null | undefined,
  evidenceCurrent = true,
): GitSyncState {
  if (!evidenceCurrent) return "unknown";
  const match = commitsMatch(currentCommit, mainCommit);
  if (match === null) return "unknown";
  return match ? "synchronized" : "different";
}
