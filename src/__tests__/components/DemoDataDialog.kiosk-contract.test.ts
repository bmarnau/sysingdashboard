import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "src/components/DemoDataDialog.tsx"),
  "utf8",
);

describe("DemoDataDialog kiosk integration", () => {
  it("embeds the kiosk demo data section with the current actor", () => {
    expect(source).toContain(
      "import { KioskDemoDataSection } from \"@/components/kiosk/KioskDemoDataSection\";",
    );
    expect(source).toContain("<KioskDemoDataSection actor={user} />");
  });
});
