/**
 * Project Info — Single Source of Truth für Repo- und Deploy-Pfade.
 *
 * Werte werden bevorzugt aus Vite-Env (`VITE_PROJECT_GITHUB_URL`,
 * `VITE_LOVABLE_PUBLISHED_URL`) gelesen; fehlt eine Variable, greift
 * die hartkodierte Konstante. Damit bleibt die Anzeige im Systemstatus
 * auch in der Lovable-Sandbox stabil, ohne `git remote` zu benötigen.
 */

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

const GITHUB_URL = env.VITE_PROJECT_GITHUB_URL || "https://github.com/bmarnau/sysingdashboard";
const PUBLISHED_URL = env.VITE_LOVABLE_PUBLISHED_URL || "https://sysingdashboard.lovable.app";
const PROJECT_ID = env.VITE_LOVABLE_PROJECT_ID || "3c209338-443a-40f8-8a16-7c3c1b51da0e";

function parseOwnerRepo(url: string): { owner: string; repo: string } {
  const m = url.match(/github\.com[/:]([^/]+)\/([^/.?#]+)/);
  return m ? { owner: m[1], repo: m[2] } : { owner: "", repo: "" };
}

const { owner, repo } = parseOwnerRepo(GITHUB_URL);

export const PROJECT_INFO = {
  github: {
    owner,
    repo,
    url: GITHUB_URL,
    label: owner && repo ? `${owner}/${repo}` : GITHUB_URL,
    defaultBranch: "main",
  },
  lovable: {
    projectId: PROJECT_ID,
    publishedUrl: PUBLISHED_URL,
    previewUrl: `https://id-preview--${PROJECT_ID}.lovable.app`,
    stablePreviewUrl: `https://project--${PROJECT_ID}-dev.lovable.app`,
    stableProductionUrl: `https://project--${PROJECT_ID}.lovable.app`,
    editorUrl: `https://lovable.dev/projects/${PROJECT_ID}`,
  },
} as const;
