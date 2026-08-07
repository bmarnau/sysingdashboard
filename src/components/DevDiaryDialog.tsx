/**
 * DevDiaryDialog
 *
 * Zeigt das Entwicklungstagebuch (`docs/ENTWICKLUNGSTAGEBUCH.md`) als
 * durchsuchbare Ansicht. Die Markdown-Datei wird zur Build-Zeit eingelesen —
 * eine einzige Quelle für Datei und Dashboard.
 */

import { useMemo, useState } from "react";
import { BookMarked, Search as SearchIcon, X } from "lucide-react";
import diarySource from "../../docs/ENTWICKLUNGSTAGEBUCH.md?raw";
import { extractHeadings, renderMarkdown } from "@/lib/markdown/render-basic";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Rohtext des Entwicklungstagebuchs (für Tests und Wiederverwendung). */
export const DEV_DIARY_SOURCE: string = diarySource;

/**
 * Filtert das Dokument auf Abschnitte (Ebene 2), die den Suchbegriff
 * enthalten. Ohne Begriff wird das vollständige Dokument geliefert.
 */
export function filterDiary(markdown: string, query: string): string {
  const term = query.trim().toLowerCase();
  if (!term) return markdown;
  const lines = markdown.split(/\r?\n/);
  const sections: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      if (current.length > 0) sections.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) sections.push(current);
  const hits = sections.filter((s) => s.join("\n").toLowerCase().includes(term));
  return hits.length > 0 ? hits.map((s) => s.join("\n")).join("\n\n") : "";
}

export function DevDiaryDialog({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState("");
  const headings = useMemo(
    () => extractHeadings(DEV_DIARY_SOURCE).filter((h) => h.level === 2),
    [],
  );
  const filtered = useMemo(() => filterDiary(DEV_DIARY_SOURCE, query), [query]);
  const blocks = useMemo(() => renderMarkdown(filtered), [filtered]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dev-diary-title"
      data-testid="dev-diary-dialog"
    >
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-elevated)]">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <BookMarked className="size-5 shrink-0 opacity-70" aria-hidden="true" />
          <h2 id="dev-diary-title" className="text-base font-semibold">
            Entwicklungstagebuch
          </h2>
          <div className="relative ml-auto">
            <SearchIcon
              className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 opacity-60"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Im Tagebuch suchen…"
              aria-label="Im Entwicklungstagebuch suchen"
              className="w-56 rounded-md border border-border bg-background py-1.5 pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Entwicklungstagebuch schließen"
            className="grid size-8 place-items-center rounded-md border border-border hover:bg-secondary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <nav
            aria-label="Kapitel"
            className="hidden w-64 shrink-0 overflow-y-auto border-r border-border p-3 md:block"
          >
            <ul className="space-y-1">
              {headings.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      requestAnimationFrame(() => {
                        document
                          .getElementById(h.id)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      });
                    }}
                    className="w-full rounded px-2 py-1 text-left text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  >
                    {h.text}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 flex-1 overflow-y-auto px-6 py-4">
            {filtered === "" ? (
              <p className="text-sm text-muted-foreground">
                Keine Treffer für „{query}". Bitte anderen Begriff versuchen.
              </p>
            ) : (
              blocks
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
