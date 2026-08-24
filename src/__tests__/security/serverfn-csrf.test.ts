import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import "../env/test-instance";

const START_SOURCE = readFileSync(join(process.cwd(), "src", "start.ts"), "utf8");

describe("TanStack Server Function CSRF protection", () => {
  it("should_registerCsrfMiddleware_forServerFunctions", () => {
    expect(START_SOURCE).toContain("createCsrfMiddleware");
    expect(START_SOURCE).toMatch(
      /createCsrfMiddleware\(\{\s*filter:\s*\(ctx\)\s*=>\s*ctx\.handlerType\s*===\s*["']serverFn["'],?\s*\}\)/s,
    );
    expect(START_SOURCE).toMatch(/requestMiddleware:\s*\[[^\]]*csrfMiddleware[^\]]*\]/s);
  });

  it("should_notWeakenOrSuppress_theFrameworkCsrfGuard", () => {
    expect(START_SOURCE).not.toContain("allowRequestsWithoutOriginCheck");
    expect(START_SOURCE).not.toContain("disableCsrfMiddlewareWarning");
  });
});
