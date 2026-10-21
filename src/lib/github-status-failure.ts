export interface GithubStatusFailure {
  reason: "http_error" | "invalid_response" | "timeout" | "network_error" | "fetch_unavailable";
  httpStatus: number | null;
  rateLimitRemaining: number | null;
}

/** Kurzer deutscher Klartext zur Ursache, warum GitHub main nicht abrufbar war. */
export function describeGithubStatusFailure(
  failure: GithubStatusFailure | null | undefined,
): string | null {
  if (!failure) return null;
  switch (failure.reason) {
    case "http_error":
      if (failure.rateLimitRemaining === 0) {
        return `GitHub-Anfragelimit erreicht (HTTP ${failure.httpStatus ?? "?"})`;
      }
      return `GitHub antwortete mit HTTP ${failure.httpStatus ?? "?"}`;
    case "timeout":
      return "Zeitüberschreitung beim Abruf von GitHub";
    case "network_error":
      return "Netzwerkfehler beim Abruf von GitHub";
    case "invalid_response":
      return "Ungültige Antwort von GitHub";
    case "fetch_unavailable":
      return "Abruf im Server nicht verfügbar";
  }
}
