/**
 * Tests für den sicheren Markdown-Renderer und das Entwicklungstagebuch.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { extractHeadings, renderMarkdown, headingId } from "@/lib/markdown/render-basic";
import { DEV_DIARY_SOURCE, filterDiary } from "@/components/DevDiaryDialog";
import { CHANGELOG } from "@/lib/help-documentation";

describe("render-basic", () => {
  it("rendert Überschriften mit stabilen Ids", () => {
    const heads = extractHeadings("# Titel\n\n## Vision\n\n## Vision\n");
    expect(heads.map((h) => h.id)).toEqual(["titel", "vision", "vision-2"]);
  });

  it("ignoriert Überschriften in Codeblöcken", () => {
    expect(extractHeadings("```\n## kein Kapitel\n```\n## echt\n")).toHaveLength(1);
  });

  it("wandelt Umlaute in Ids um", () => {
    expect(headingId("Übersicht & Größe", new Set())).toBe("uebersicht-groesse");
  });

  it("rendert Listen und Tabellen", () => {
    render(<div>{renderMarkdown("- eins\n- zwei\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n")}</div>);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "A" })).toBeTruthy();
  });

  it("gibt eingebettetes HTML als Text aus (keine Injektion)", () => {
    const { container } = render(
      <div>{renderMarkdown("<img src=x onerror=alert(1)> <script>bad()</script>")}</div>,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>bad()</script>");
  });

  it("rendert Fettdruck und Inline-Code", () => {
    const { container } = render(<div>{renderMarkdown("Ein **Wort** und `code`.")}</div>);
    expect(container.querySelector("strong")?.textContent).toBe("Wort");
    expect(container.querySelector("code")?.textContent).toBe("code");
  });
});

describe("Entwicklungstagebuch", () => {
  it("enthält die Pflichtkapitel", () => {
    const titles = extractHeadings(DEV_DIARY_SOURCE)
      .filter((h) => h.level === 2)
      .map((h) => h.text);
    for (const expected of [
      "Vision",
      "Managementübersicht",
      "Sprintübersicht",
      "Schwierigkeiten und ihre Lösung",
      "Architekturentscheidungen",
      "Sprintprotokoll",
    ]) {
      expect(titles).toContain(expected);
    }
  });

  it("führt die aktuelle Dashboard-Version aus dem CHANGELOG", () => {
    expect(DEV_DIARY_SOURCE).toContain(CHANGELOG[0].version);
  });

  it("filtert auf Kapitel mit Treffer", () => {
    const result = filterDiary(DEV_DIARY_SOURCE, "Vision");
    expect(result).toContain("## Vision");
    expect(result.length).toBeLessThan(DEV_DIARY_SOURCE.length);
    expect(filterDiary(DEV_DIARY_SOURCE, "zzzz-nicht-vorhanden")).toBe("");
    expect(filterDiary(DEV_DIARY_SOURCE, "  ")).toBe(DEV_DIARY_SOURCE);
  });

  it("enthält keine Zugangsdaten oder Tokens", () => {
    expect(/sb_secret_|SERVICE_ROLE|BEGIN [A-Z ]*PRIVATE KEY|eyJ[A-Za-z0-9_-]{20,}/.test(DEV_DIARY_SOURCE)).toBe(
      false,
    );
  });
});
