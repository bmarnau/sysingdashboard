const PUBLIC_REPOSITORY = "bmarnau/sysingdashboard";
const MAIN_BRANCH = "main";
const MAIN_REF_URL = `https://api.github.com/repos/${PUBLIC_REPOSITORY}/git/ref/heads/${MAIN_BRANCH}`;
const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 1_500;

let cached = null;
let cacheExpiresAt = 0;

function isoNow(epochMs) {
  return new Date(epochMs).toISOString();
}

// Nur numerische bzw. enumerierte Diagnose. Weder Antwort-Body noch Header-Werte
// (außer dem Rate-Limit-Zähler als Zahl) gelangen in das Ergebnis.
function failureResult(branch, checkedAt, reason, httpStatus = null, rateLimitRemaining = null) {
  return {
    branch,
    mainCommit: null,
    checkedAt,
    reachable: false,
    failure: { reason, httpStatus, rateLimitRemaining },
  };
}

function parseRateLimitRemaining(response) {
  const raw = response?.headers?.get?.("x-ratelimit-remaining");
  if (raw === null || raw === undefined || raw === "") return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
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
    return failureResult(MAIN_BRANCH, checkedAt, "fetch_unavailable");
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
      return failureResult(
        MAIN_BRANCH,
        checkedAt,
        "http_error",
        response.status,
        parseRateLimitRemaining(response),
      );
    }

    const payload = await response.json();
    const mainCommit =
      typeof payload?.object?.sha === "string" && /^[0-9a-f]{40}$/i.test(payload.object.sha)
        ? payload.object.sha
        : null;

    if (!mainCommit) {
      return failureResult(MAIN_BRANCH, checkedAt, "invalid_response");
    }

    const result = {
      branch: MAIN_BRANCH,
      mainCommit,
      checkedAt,
      reachable: true,
      failure: null,
    };

    if (cacheTtlMs > 0) {
      cached = result;
      cacheExpiresAt = currentTime + cacheTtlMs;
    }

    return result;
  } catch (error) {
    return failureResult(
      MAIN_BRANCH,
      checkedAt,
      error?.name === "AbortError" ? "timeout" : "network_error",
    );
  } finally {
    clearTimeout(timer);
  }
}

export function resetGithubMainStatusCacheForTests() {
  cached = null;
  cacheExpiresAt = 0;
}
