import changelogSource from "../../CHANGELOG.md?raw";

export interface AppRelease {
  version: string;
  date: string;
}

const RELEASE_HEADER_RE = /^##\s+([0-9][0-9A-Za-z.\-+]*)\s+-\s+(\d{4}-\d{2}-\d{2})\s*$/m;

export function parseCurrentRelease(source: string): AppRelease {
  const match = RELEASE_HEADER_RE.exec(source);
  return {
    version: match?.[1] ?? "0.0.0",
    date: match?.[2] ?? "unbekannt",
  };
}

export function formatReleaseDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : date;
}

export const CURRENT_RELEASE = parseCurrentRelease(changelogSource);
export const DASHBOARD_VERSION = CURRENT_RELEASE.version;
export const DASHBOARD_RELEASE_DATE = CURRENT_RELEASE.date;
export const DASHBOARD_RELEASE_DATE_DE = formatReleaseDate(DASHBOARD_RELEASE_DATE);
export const DASHBOARD_VERSION_LABEL = `Version ${DASHBOARD_VERSION} · ${DASHBOARD_RELEASE_DATE_DE}`;
