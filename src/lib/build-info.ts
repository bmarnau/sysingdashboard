/**
 * Build-Info — wird zur Build-Zeit über `__BUILD_INFO__` in `vite.config.ts`
 * injiziert. Bietet eine fail-safe Anzeige, wenn z. B. keine Git-Historie
 * verfügbar ist (Lovable-Sandbox ohne `git`).
 */

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
  branch: "unknown",
  builtAt: new Date().toISOString(),
  packageVersion: "0.0.0",
  repoRemote: "",
  dirty: false,
};

export const BUILD_INFO: BuildInfo =
  typeof __BUILD_INFO__ !== "undefined" ? __BUILD_INFO__ : fallback;

/** Liefert eine menschenlesbare Remote-Beschreibung oder leeren String. */
export function repoLabel(): string {
  const r = BUILD_INFO.repoRemote;
  if (!r) return "";
  // Normalisiere SSH- und HTTPS-Remotes auf "owner/repo"
  const m =
    r.match(/github\.com[/:]([^/]+\/[^/.]+)(?:\.git)?$/) ??
    r.match(/([^/]+\/[^/.]+?)(?:\.git)?$/);
  return m ? m[1] : r;
}

/** GitHub-Web-URL zum aktuellen Commit, sofern Remote = GitHub. */
export function commitUrl(): string | null {
  const label = repoLabel();
  if (!label || !/^[^/]+\/[^/]+$/.test(label)) return null;
  if (BUILD_INFO.commitFull === "unknown") return `https://github.com/${label}`;
  return `https://github.com/${label}/commit/${BUILD_INFO.commitFull}`;
}
