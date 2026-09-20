const PUBLIC_REPOSITORY = "bmarnau/sysingdashboard";
const MAIN_BRANCH = "main";
const MAIN_REF_URL = `https://api.github.com/repos/${PUBLIC_REPOSITORY}/git/ref/heads/${MAIN_BRANCH}`;
const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 1_500;

let cached = null;
let cacheExpiresAt = 0;

function isoNow(now) {
  return new Date(now()).toISOString();
}

export async function getGithubMainStatus({
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const currentTime = now();
  if (cacheTtlMs > 0 && cached && currentTime < cacheExpiresAt) {
    return cached;
  }

  const checkedAt = isoNow(currentTime);
  if (typeof fetchImpl !== "function") {
    return {
      branch: MAIN_BRANCH,
      mainCommit: null,
      checkedAt,
      reachable: false,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(MAIN_REF_URL, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "sysingdashboard-status",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        branch: MAIN_BRANCH,
        mainCommit: null,
        checkedAt,
        reachable: false,
      };
    }

    const payload = await response.json();
    const mainCommit =
      typeof payload?.object?.sha === "string" && /^[0-9a-f]{40}$/i.test(payload.object.sha)
        ? payload.object.sha
        : null;

    const result = {
      branch: MAIN_BRANCH,
      mainCommit,
      checkedAt,
      reachable: Boolean(mainCommit),
    };

    if (cacheTtlMs > 0) {
      cached = result;
      cacheExpiresAt = currentTime + cacheTtlMs;
    }

    return result;
  } catch {
    return {
      branch: MAIN_BRANCH,
      mainCommit: null,
      checkedAt,
      reachable: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function resetGithubMainStatusCacheForTests() {
  cached = null;
  cacheExpiresAt = 0;
}
