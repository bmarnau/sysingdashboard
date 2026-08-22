import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManagementTable } from "@/components/avkk/management/ManagementTable";
import type { AvkkRow } from "@/lib/avkk/workspace";

const LONG_TITLE = "Netzwerkmodernisierung Verwaltungsstandort mit zusätzlichem langen Titel";

function row(): AvkkRow {
  return {
    key: "workpackage:demo-wp-netz-rollout",
    task: {
      subjectType: "workpackage",
      subjectId: "demo-wp-netz-rollout",
      title: LONG_TITLE,
      context: "Netzwerkmodernisierung Verwaltungsstandort",
      due: "2026-08-31",
    },
    hasDossier: true,
    responsibleCount: 1,
    ownResponsibility: false,
    ratedDimensions: 2,
    totalDimensions: 2,
    missing: 0,
    partial: 0,
    supportNeeded: false,
    consequenceCount: 1,
    maxSeverityLabel: "mittel",
    maxSeverityRank: 2,
    atRisk: false,
    riskReasons: [],
    contextHints: [],
    complete: true,
    dueState: "none",
    updatedAt: "2026-08-22T12:00:00Z",
    responsibilities: [
      {
        personId: "user-1",
        roleKey: "owner",
        roleLabel: "Verantwortlicher",
        typeKeys: ["result"],
        typeLabels: ["Ergebnis"],
      },
    ],
    competences: [],
    consequences: [],
  };
}

describe("ManagementTable", () => {
  it("begrenzt lange Aufgabentitel auf die eigene Tabellenspalte", () => {
    render(<ManagementTable rows={[row()]} onOpen={vi.fn()} />);

    const titleButton = screen.getByRole("button", { name: LONG_TITLE });

    expect(titleButton).toHaveAttribute("title", LONG_TITLE);
    expect(titleButton).toHaveClass("line-clamp-2", "w-full", "min-w-0", "break-words");
    expect(titleButton.parentElement).toHaveClass(
      "w-[16rem]",
      "max-w-full",
      "min-w-0",
      "overflow-hidden",
    );
  });

  it("öffnet die Aufgabe weiterhin über den Titelbutton", () => {
    const onOpen = vi.fn();
    const item = row();
    render(<ManagementTable rows={[item]} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole("button", { name: LONG_TITLE }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(item);
  });
});
