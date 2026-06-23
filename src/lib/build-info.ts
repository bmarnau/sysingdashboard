/**
 * Build-Info — wird zur Build-Zeit über `__BUILD_INFO__` in `vite.config.ts`
 * injiziert. Bietet eine fail-safe Anzeige, wenn z. B. keine Git-Historie
 * verfügbar ist (Lovable-Sandbox ohne `git`).
 */
import { PROJECT_INFO } from "./project-info";

export interface BuildInfo {
  commit: string;
  commitFull: string;
  branch: string;
  builtAt: string;
  packageVersion: string;
  repoRemote: string;
  dirty: boolean;
}

declare const __BUILD_INFO__: BuildInfo;

const fallback: BuildInfo = {
  commit: "unknown",
  commitFull: "unknown",
  branch: PROJECT_INFO.github.defaultBranch,
  builtAt: new Date().toISOString(),
  packageVersion: "0.0.0",
  repoRemote: PROJECT_INFO.github.url,
  dirty: false,
};

const rawInfo: BuildInfo =
  typeof __BUILD_INFO__ !== "undefined" ? __BUILD_INFO__ : fallback;

// In der Lovable-Sandbox fehlt `git` häufig — leere/unknown Werte
// werden auf die Single-Source-of-Truth aus PROJECT_INFO gehoben.
export const BUILD_INFO: BuildInfo = {
  ...rawInfo,
  branch:
    !rawInfo.branch || rawInfo.branch === "unknown"
      ? PROJECT_INFO.github.defaultBranch
      : rawInfo.branch,
  repoRemote: rawInfo.repoRemote || PROJECT_INFO.github.url,
};

/** True, wenn der Build einen echten Commit-SHA mitliefert. */
export function hasBuildCommit(): boolean {
  return BUILD_INFO.commitFull !== "unknown" && BUILD_INFO.commit !== "unknown";
}

/** Liefert eine menschenlesbare Remote-Beschreibung "owner/repo". */
export function repoLabel(): string {
  const r = BUILD_INFO.repoRemote || PROJECT_INFO.github.url;
  if (!r) return PROJECT_INFO.github.label;
  const m =
    r.match(/github\.com[/:]([^/]+\/[^/.]+?)(?:\.git)?(?:[/?#]|$)/) ??
    r.match(/([^/]+\/[^/.]+?)(?:\.git)?$/);
  return m ? m[1] : PROJECT_INFO.github.label;
}

/** GitHub-Web-URL zum aktuellen Commit, sofern Remote = GitHub. */
export function commitUrl(): string | null {
  const label = repoLabel();
  if (!label || !/^[^/]+\/[^/]+$/.test(label)) return PROJECT_INFO.github.url;
  if (!hasBuildCommit()) return `https://github.com/${label}`;
  return `https://github.com/${label}/commit/${BUILD_INFO.commitFull}`;
}
