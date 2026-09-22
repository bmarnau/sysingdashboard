import { describe, expect, it } from "vitest";
import {
  DASHBOARD_RELEASE_DATE,
  DASHBOARD_RELEASE_DATE_DE,
  DASHBOARD_VERSION,
  DASHBOARD_VERSION_LABEL,
  formatReleaseDate,
  parseCurrentRelease,
} from "@/lib/app-version";

describe("app version", () => {
  it("uses the newest CHANGELOG entry as current release", () => {
    expect(DASHBOARD_VERSION).toBe("1.66.0");
    expect(DASHBOARD_RELEASE_DATE).toBe("2026-09-21");
    expect(DASHBOARD_RELEASE_DATE_DE).toBe("21.09.2026");
    expect(DASHBOARD_VERSION_LABEL).toBe("Version 1.66.0 · 21.09.2026");
  });

  it("parses and formats a release header deterministically", () => {
    expect(parseCurrentRelease("# Changelog\n\n## 2.3.4 - 2026-12-05\n")).toEqual({
      version: "2.3.4",
      date: "2026-12-05",
    });
    expect(formatReleaseDate("2026-12-05")).toBe("05.12.2026");
  });

  it("fails visibly instead of inventing a version", () => {
    expect(parseCurrentRelease("# no release")).toEqual({
      version: "0.0.0",
      date: "unbekannt",
    });
  });
});
