import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { REACT_PDF_STYLESHEETS, ensureReactPdfStylesheets } from "@/lib/react-pdf-styles";

const root = resolve(__dirname, "../../..");

describe("react-pdf-Stylesheets aus public/vendor", () => {
  it.each(["AnnotationLayer.css", "TextLayer.css"])("should_matchPackageCopy_when_%s", (name) => {
    const copy = readFileSync(resolve(root, "public/vendor/react-pdf", name), "utf8");
    const pkg = readFileSync(resolve(root, "node_modules/react-pdf/dist/Page", name), "utf8");
    expect(copy).toBe(pkg);
  });

  it("should_appendEachLinkOnce_when_calledTwice", () => {
    ensureReactPdfStylesheets();
    ensureReactPdfStylesheets();
    const links = document.head.querySelectorAll("link[data-react-pdf-css]");
    expect(links).toHaveLength(REACT_PDF_STYLESHEETS.length);
    expect([...links].map((l) => l.getAttribute("href"))).toEqual([...REACT_PDF_STYLESHEETS]);
  });
});
