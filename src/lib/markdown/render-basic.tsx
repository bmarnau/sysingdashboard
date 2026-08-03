/**
 * Minimaler, sicherer Markdown-Renderer.
 *
 * Bewusst ohne externe Bibliothek und ohne `dangerouslySetInnerHTML`:
 * unterstützt wird nur das im Projekt verwendete Subset
 * (Überschriften `#`–`###`, Listen `-`/`1.`, Tabellen, Codeblöcke,
 * `**fett**`, `` `code` ``, Trennlinien, Absätze). Alles andere wird als
 * Text ausgegeben — dadurch ist eingebettetes HTML wirkungslos.
 */

import type { ReactNode } from "react";

/** Inline-Auszeichnung: `**fett**` und `` `code` ``. Rest bleibt Text. */
export function renderInline(text: string, keyPrefix: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`${keyPrefix}-b-${i++}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <code
          key={`${keyPrefix}-c-${i++}`}
          className="rounded bg-secondary/60 px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : parts;
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isSeparatorRow(line: string): boolean {
  return /^\s*\|?[\s:-]*-[\s|:-]*$/.test(line) && line.includes("-");
}

export interface MarkdownHeading {
  /** Ebene (1–3). */
  level: number;
  /** Sichtbarer Text. */
  text: string;
  /** DOM-Id des Abschnitts. */
  id: string;
}

/** Erzeugt eine stabile, kollisionsfreie Id aus einem Überschriftentext. */
export function headingId(text: string, used: Set<string>): string {
  const base =
    text
      .toLowerCase()
      .replace(/[äöüß]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" })[c] ?? c)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "abschnitt";
  let id = base;
  let n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
}

/** Liest alle Überschriften (Ebene 1–3) für eine Navigation aus. */
export function extractHeadings(markdown: string): MarkdownHeading[] {
  const used = new Set<string>();
  const out: MarkdownHeading[] = [];
  let inCode = false;
  for (const raw of markdown.split(/\r?\n/)) {
    if (raw.trimStart().startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const m = /^(#{1,3})\s+(.*)$/.exec(raw.trimEnd());
    if (!m) continue;
    const text = m[2].trim();
    out.push({ level: m[1].length, text, id: headingId(text, used) });
  }
  return out;
}

/**
 * Rendert das unterstützte Markdown-Subset in React-Knoten.
 * `headingIds` muss dieselbe Reihenfolge wie `extractHeadings` liefern.
 */
export function renderMarkdown(markdown: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  const lines = markdown.split(/\r?\n/);
  const usedIds = new Set<string>();
  let key = 0;
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!list) return;
    const items = list.items;
    const cls = "my-2 ml-5 space-y-1 text-sm";
    blocks.push(
      list.ordered ? (
        <ol key={`ol-${key++}`} className={`${cls} list-decimal`}>
          {items.map((it, i) => (
            <li key={i}>{renderInline(it, `oli-${key}-${i}`)}</li>
          ))}
        </ol>
      ) : (
        <ul key={`ul-${key++}`} className={`${cls} list-disc`}>
          {items.map((it, i) => (
            <li key={i}>{renderInline(it, `uli-${key}-${i}`)}</li>
          ))}
        </ul>
      ),
    );
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    // Codeblock
    if (line.trimStart().startsWith("```")) {
      flushList();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      blocks.push(
        <pre
          key={`pre-${key++}`}
          className="my-3 overflow-x-auto rounded-md border border-border bg-secondary/40 p-3 text-xs"
        >
          <code>{buf.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Tabelle
    if (line.startsWith("|") && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      flushList();
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      i--;
      blocks.push(
        <div key={`tbl-${key++}`} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                {header.map((h, hi) => (
                  <th
                    key={hi}
                    className="border-b border-border px-2 py-1.5 font-semibold text-foreground"
                  >
                    {renderInline(h, `th-${key}-${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="align-top">
                  {r.map((c, ci) => (
                    <td key={ci} className="border-b border-border/50 px-2 py-1.5">
                      {renderInline(c, `td-${key}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = headingId(text, usedIds);
      const cls =
        level === 1
          ? "mt-2 mb-3 text-xl font-semibold"
          : level === 2
            ? "mt-6 mb-2 border-b border-border pb-1 text-lg font-semibold"
            : "mt-4 mb-1 text-base font-semibold";
      const Tag = (level === 1 ? "h1" : level === 2 ? "h2" : "h3") as "h1" | "h2" | "h3";
      blocks.push(
        <Tag key={`h-${key++}`} id={id} className={cls}>
          {renderInline(text, `h-${key}`)}
        </Tag>,
      );
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushList();
      blocks.push(<hr key={`hr-${key++}`} className="my-4 border-border" />);
      continue;
    }

    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      if (!list?.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ol[1]);
      continue;
    }

    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    if (ul) {
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(ul[1]);
      continue;
    }

    if (line.trim() === "") {
      flushList();
      continue;
    }

    flushList();
    blocks.push(
      <p key={`p-${key++}`} className="my-2 text-sm leading-relaxed">
        {renderInline(line, `p-${key}`)}
      </p>,
    );
  }

  flushList();
  return blocks;
}
