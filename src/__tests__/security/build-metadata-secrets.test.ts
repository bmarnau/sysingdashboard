import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const PUBLIC_REPOSITORY_URL = "https://github.com/bmarnau/sysingdashboard";

describe("build metadata security", () => {
  it("does not read remote.origin.url into browser build metadata", () => {
    const source = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");

    expect(source).not.toContain("remote.origin.url");
    expect(source).not.toContain("git config --get remote.origin.url");
    expect(source).toContain(PUBLIC_REPOSITORY_URL);
  });

  it("keeps client build-info repository metadata canonical", () => {
    const source = readFileSync(resolve(process.cwd(), "src/lib/build-info.ts"), "utf8");

    expect(source).toContain("repoRemote: PROJECT_INFO.github.url");
    expect(source).toContain("return PROJECT_INFO.github.label");
  });
});
