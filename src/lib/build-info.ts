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

const rawInfo: BuildInfo = typeof __BUILD_INFO__ !== "undefined" ? __BUILD_INFO__ : fallback;

// Security boundary: `repoRemote` is browser-visible metadata. Never propagate
// an arbitrary runtime/build Git remote because hosted environments may use
// credential-bearing internal clone URLs.
export const BUILD_INFO: BuildInfo = {
  ...rawInfo,
  branch:
    !rawInfo.branch || rawInfo.branch === "unknown"
      ? PROJECT_INFO.github.defaultBranch
      : rawInfo.branch,
  repoRemote: PROJECT_INFO.github.url,
};

/** True, wenn der Build einen echten Commit-SHA mitliefert. */
export function hasBuildCommit(): boolean {
  return BUILD_INFO.commitFull !== "unknown" && BUILD_INFO.commit !== "unknown";
}

/** Liefert die kanonische menschenlesbare Repository-Beschreibung "owner/repo". */
export function repoLabel(): string {
  return PROJECT_INFO.github.label;
}

/** GitHub-Web-URL zum aktuellen Commit, sofern ein Commit bekannt ist. */
export function commitUrl(): string {
  if (!hasBuildCommit()) return PROJECT_INFO.github.url;
  return `${PROJECT_INFO.github.url}/commit/${BUILD_INFO.commitFull}`;
}
