import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const MANIFEST_PATH = resolve("docs/examples/golden-dataset/v1/manifest.json");

describe("GDS-01 Golden Dataset V1 contract", () => {
  it("uses the fixed schema, dataset version, synthetic flag and reference time", async () => {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Record<string, unknown>;

    expect(manifest.schemaVersion).toBe("sysing.golden.v1");
    expect(manifest.datasetVersion).toBe("1.0.0");
    expect(manifest.synthetic).toBe(true);
    expect(manifest.referenceTime).toBe("2026-09-14T00:00:00Z");
  });
});
