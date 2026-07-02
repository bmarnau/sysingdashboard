/**
 * UserManualDialog
 * Benutzerhandbuch als Modal mit Suche, Kategorienavigation, Druckansicht
 * und kontextbezogenem Direktsprung. Inhalte stammen aus
 * `HelpDocumentationService`.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu as MenuIcon,
  Printer,
  Search as SearchIcon,
  X,
} from "lucide-react";
import {
  HelpDocumentationService,
  DOCUMENTATION_VERSION,
  DASHBOARD_VERSION,
  DASHBOARD_VERSION_HINT,
  type HelpTopic,
} from "@/lib/help-documentation";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Bevorzugte Topic-ID (z. B. aus kontextbezogener Hilfe). */
  initialTopicId?: string;
  /** Optional Route, um passendes Topic automatisch zu wählen. */
  initialRoute?: string;
  /** Optionaler Suchbegriff, der beim Öffnen ins Suchfeld übernommen wird. */
  initialQuery?: string;
}

/** Escape regex meta characters. */
function escRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Split text into alternating plain/highlight nodes based on `hl` (case-insensitive). */
function highlightText(text: string, hl: string, keyPrefix: string): React.ReactNode {
  const term = hl.trim();
  if (!term) return text;
  const re = new RegExp(escRe(term), "gi");
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <mark
        key={`${keyPrefix}-m-${i++}`}
        data-hl-match
        className="rounded-sm bg-yellow-300/70 px-0.5 text-inherit dark:bg-yellow-500/40"
      >
        {m[0]}
      </mark>,
    );
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderContent(md: string, hl = ""): React.ReactNode {
  // Minimaler Markdown-Subset-Renderer: Überschriften (## …), Listen (- …),
  // Absätze. Bewusst ohne fremde Bibliothek und ohne innerHTML, um Risiken zu
  // vermeiden. Optional werden Treffer via <mark data-hl-match> hervorgehoben.
  const blocks: React.ReactNode[] = [];
  const lines = md.split(/\r?\n/);
  let listBuf: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuf.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`} className="my-2 ml-5 list-disc space-y-1 text-sm">
        {listBuf.map((item, i) => (
          <li key={i}>{highlightText(item, hl, `li-${key}-${i}`)}</li>
        ))}
      </ul>,
    );
    listBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      flushList();
      blocks.push(
        <h3 key={`h-${key++}`} className="mt-4 text-base font-semibold">
          {highlightText(line.slice(3), hl, `h-${key}`)}
        </h3>,
      );
    } else if (line.startsWith("- ")) {
      listBuf.push(line.slice(2));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={`p-${key++}`} className="my-2 text-sm leading-relaxed">
          {highlightText(line, hl, `p-${key}`)}
        </p>,
      );
    }
  }
  flushList();
  return blocks;
}

export function UserManualDialog({
  open,
  onClose,
  initialTopicId,
  initialRoute,
  initialQuery,
}: Props) {
  const user = useCurrentUser();
  const role = user?.role ?? null;

  const allTopics = useMemo(() => HelpDocumentationService.getAllTopics(role), [role, open]);
  const grouped = useMemo(() => HelpDocumentationService.getTopicsByCategory(role), [role, open]);
  const settings = useMemo(() => HelpDocumentationService.getAllSettings(), [open]);

  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Initiales Topic & Query bestimmen (auch aus URL ?help=&hq=).
  useEffect(() => {
    if (!open) return;
    // URL hat Vorrang über props, damit deep-linkable.
    let urlHelp: string | null = null;
    let urlQ: string | null = null;
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      urlHelp = sp.get("help");
      urlQ = sp.get("hq");
    }
    setQuery(urlQ ?? initialQuery ?? "");
    if (urlHelp) {
      setActiveId(urlHelp);
      return;
    }
    if (initialTopicId) {
      setActiveId(initialTopicId);
      return;
    }
    if (initialRoute) {
      const match = HelpDocumentationService.getTopicsForRoute(initialRoute, role)[0];
      if (match) {
        setActiveId(match.id);
        return;
      }
    }
    setActiveId((curr) => curr ?? allTopics[0]?.id ?? null);
  }, [open, initialTopicId, initialRoute, initialQuery, role, allTopics]);

  // ESC schließt.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    return HelpDocumentationService.searchTopics(query, role);
  }, [query, role]);

  const activeTopic: HelpTopic | null = useMemo(
    () => (activeId ? HelpDocumentationService.getTopicById(activeId) : null),
    [activeId],
  );

  const activeIndex = activeTopic ? allTopics.findIndex((t) => t.id === activeTopic.id) : -1;
  const prevTopic = activeIndex > 0 ? allTopics[activeIndex - 1] : null;
  const nextTopic =
    activeIndex >= 0 && activeIndex < allTopics.length - 1 ? allTopics[activeIndex + 1] : null;

  // Beim Topic-Wechsel nach oben scrollen.
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeId]);

  if (!open) return null;

  const printAll = () => {
    // Druckansicht: alle Kapitel in eigenes Fenster rendern, ohne Navigation.
    const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=1000");
    if (!w) return;
    const css = `
      body{font-family:ui-sans-serif,system-ui,sans-serif;color:#111;max-width:780px;margin:24px auto;padding:0 16px;}
      h1{font-size:24px;margin:0 0 4px;}
      h2{font-size:18px;margin:28px 0 4px;border-bottom:1px solid #ddd;padding-bottom:4px;}
      h3{font-size:14px;margin:14px 0 4px;}
      p{font-size:12px;line-height:1.5;margin:6px 0;}
      ul{font-size:12px;line-height:1.5;margin:6px 0 6px 20px;}
      .meta{font-size:11px;color:#555;margin-bottom:24px;}
      .topic{page-break-inside:avoid;}
      @media print { h2{page-break-before:always;} h2:first-of-type{page-break-before:auto;} }
    `;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Benutzerhandbuch</title><style>${css}</style></head><body>
      <h1>Benutzerhandbuch</h1>
      <div class="meta">Dashboard ${DASHBOARD_VERSION} · Handbuch ${DOCUMENTATION_VERSION} · ${DASHBOARD_VERSION_HINT} · Letzte Aktualisierung: ${HelpDocumentationService.getLastUpdated()}</div>
      ${allTopics
        .map(
          (t) => `
        <section class="topic">
          <h2>${escapeHtml(t.title)}</h2>
          <div class="meta">Kategorie: ${escapeHtml(t.category)} · Stand: ${escapeHtml(t.lastUpdated)}</div>
          ${contentToHtml(t.content)}
        </section>`,
        )
        .join("")}
      <section class="topic">
        <h2>Einstellungen im Überblick</h2>
        <ul>
          ${settings
            .map(
              (s) =>
                `<li><strong>${escapeHtml(s.name)}</strong> — ${escapeHtml(s.description)} (Default: ${escapeHtml(
                  s.defaultValue ?? "—",
                )}; betrifft: ${s.affectedAreas.map(escapeHtml).join(", ")})</li>`,
            )
            .join("")}
        </ul>
      </section>
    </body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div>
            <h2 className="text-lg font-semibold">Benutzerhandbuch</h2>
            <div className="text-xs text-muted-foreground">
              Dashboard {DASHBOARD_VERSION} · Handbuch {DOCUMENTATION_VERSION} ·{" "}
              {DASHBOARD_VERSION_HINT} · Letzte Aktualisierung:{" "}
              {HelpDocumentationService.getLastUpdated()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={printAll}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-sm hover:bg-secondary"
            >
              <Printer className="size-4" /> Drucken
            </button>
            <button
              aria-label="Schließen"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-md border border-border bg-secondary/40 hover:bg-secondary"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-border px-5 py-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suche im Handbuch (Titel, Inhalt, Schlagworte) …"
              className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-foreground/40"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Nav */}
          <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-border bg-secondary/20 p-3 md:block">
            {searchResults ? (
              <>
                <div className="px-2 pb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Treffer ({searchResults.length})
                </div>
                {searchResults.map((t) => (
                  <NavLink
                    key={t.id}
                    label={t.title}
                    sub={t.category}
                    active={activeId === t.id}
                    onClick={() => setActiveId(t.id)}
                  />
                ))}
                {searchResults.length === 0 && (
                  <div className="px-2 text-xs text-muted-foreground">Keine Treffer.</div>
                )}
              </>
            ) : (
              Object.entries(grouped).map(([cat, topics]) => (
                <div key={cat} className="mb-3">
                  <div className="px-2 pb-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {cat}
                  </div>
                  {topics.map((t) => (
                    <NavLink
                      key={t.id}
                      label={t.title}
                      active={activeId === t.id}
                      onClick={() => setActiveId(t.id)}
                    />
                  ))}
                </div>
              ))
            )}
            <div className="mt-2 border-t border-border pt-2">
              <NavLink
                label="Einstellungen im Überblick"
                active={activeId === "__settings"}
                onClick={() => setActiveId("__settings")}
              />
            </div>
          </aside>

          {/* Content */}
          <main ref={contentRef} className="min-w-0 flex-1 overflow-y-auto p-5">
            {/* Mobile nav */}
            <div className="mb-4 md:hidden">
              <button
                type="button"
                onClick={() => setMobileNavOpen((v) => !v)}
                aria-expanded={mobileNavOpen}
                aria-controls="manual-mobile-nav"
                className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-secondary/40 px-3 py-3 text-left text-sm font-medium"
              >
                <span className="flex items-center gap-2">
                  <MenuIcon className="size-4" />
                  <span className="truncate">
                    {activeId === "__settings"
                      ? "Einstellungen im Überblick"
                      : (activeTopic?.title ?? "Kapitel wählen")}
                  </span>
                </span>
                <ChevronDown
                  className={`size-4 shrink-0 transition-transform ${mobileNavOpen ? "rotate-180" : ""}`}
                />
              </button>
              {mobileNavOpen && (
                <div
                  id="manual-mobile-nav"
                  className="mt-2 max-h-[50vh] overflow-y-auto rounded-md border border-border bg-background p-2"
                >
                  {searchResults ? (
                    <>
                      <div className="px-2 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        Treffer ({searchResults.length})
                      </div>
                      {searchResults.length === 0 && (
                        <div className="px-2 py-2 text-xs text-muted-foreground">
                          Keine Treffer.
                        </div>
                      )}
                      {searchResults.map((t) => (
                        <MobileNavLink
                          key={t.id}
                          label={t.title}
                          sub={t.category}
                          active={activeId === t.id}
                          onClick={() => {
                            setActiveId(t.id);
                            setMobileNavOpen(false);
                          }}
                        />
                      ))}
                    </>
                  ) : (
                    Object.entries(grouped).map(([cat, topics]) => (
                      <div key={cat} className="mb-2">
                        <div className="px-2 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                          {cat}
                        </div>
                        {topics.map((t) => (
                          <MobileNavLink
                            key={t.id}
                            label={t.title}
                            active={activeId === t.id}
                            onClick={() => {
                              setActiveId(t.id);
                              setMobileNavOpen(false);
                            }}
                          />
                        ))}
                      </div>
                    ))
                  )}
                  <div className="mt-1 border-t border-border pt-1">
                    <MobileNavLink
                      label="Einstellungen im Überblick"
                      active={activeId === "__settings"}
                      onClick={() => {
                        setActiveId("__settings");
                        setMobileNavOpen(false);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {activeId === "__settings" ? (
              <SettingsChapter settings={settings} />
            ) : activeTopic ? (
              <article id={activeTopic.id}>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {activeTopic.category}
                </div>
                <h1 className="text-xl font-semibold">{activeTopic.title}</h1>
                <div className="mt-1 text-xs text-muted-foreground">
                  Letzte Änderung: {activeTopic.lastUpdated}
                  {activeTopic.route ? ` · Route: ${activeTopic.route}` : ""}
                  {activeTopic.component ? ` · Komponente: ${activeTopic.component}` : ""}
                </div>
                <div className="mt-3">{renderContent(activeTopic.content)}</div>

                {activeTopic.relatedTopics && activeTopic.relatedTopics.length > 0 && (
                  <div className="mt-6 rounded-md border border-border bg-secondary/30 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Verwandte Kapitel
                    </div>
                    <ul className="mt-2 space-y-1 text-sm">
                      {activeTopic.relatedTopics.map((rid) => {
                        const r = HelpDocumentationService.getTopicById(rid);
                        if (!r) return null;
                        return (
                          <li key={rid}>
                            <button
                              className="text-left underline underline-offset-2 hover:opacity-80"
                              onClick={() => setActiveId(rid)}
                            >
                              {r.title}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </article>
            ) : (
              <div className="text-sm text-muted-foreground">Kein Kapitel ausgewählt.</div>
            )}

            {/* Prev/Next */}
            <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
              <button
                disabled={!prevTopic}
                onClick={() => prevTopic && setActiveId(prevTopic.id)}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
                {prevTopic ? prevTopic.title : "Anfang"}
              </button>
              <button
                disabled={!nextTopic}
                onClick={() => nextTopic && setActiveId(nextTopic.id)}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {nextTopic ? nextTopic.title : "Ende"}
                <ChevronRight className="size-4" />
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function NavLink({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full rounded-md px-2 py-1.5 text-left text-sm transition ${
        active ? "bg-foreground/10 font-medium" : "hover:bg-foreground/5"
      }`}
    >
      {label}
      {sub && (
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{sub}</div>
      )}
    </button>
  );
}

function MobileNavLink({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-md px-3 py-3 text-left text-sm transition min-h-[44px] ${
        active ? "bg-foreground/10 font-medium" : "active:bg-foreground/10 hover:bg-foreground/5"
      }`}
    >
      {label}
      {sub && (
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{sub}</div>
      )}
    </button>
  );
}

function SettingsChapter({
  settings,
}: {
  settings: ReturnType<typeof HelpDocumentationService.getAllSettings>;
}) {
  return (
    <article>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">Service</div>
      <h1 className="text-xl font-semibold">Einstellungen im Überblick</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Alle zentralen Einstellungen des Dashboards mit Standardwert und betroffenen Bereichen. Neue
        Einstellungen werden über{" "}
        <code className="rounded bg-secondary/60 px-1">registerSettings()</code> ergänzt und
        erscheinen hier automatisch.
      </p>
      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left">
            <tr>
              <th className="px-3 py-2">Einstellung</th>
              <th className="px-3 py-2">Beschreibung</th>
              <th className="px-3 py-2">Default</th>
              <th className="px-3 py-2">Werte</th>
              <th className="px-3 py-2">Bereiche</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((s) => (
              <tr key={s.id} className="border-t border-border align-top">
                <td className="px-3 py-2 font-medium">{s.name}</td>
                <td className="px-3 py-2">{s.description}</td>
                <td className="px-3 py-2">{s.defaultValue ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{(s.allowedValues ?? []).join(", ") || "—"}</td>
                <td className="px-3 py-2 text-xs">{s.affectedAreas.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

/* ---- helpers for print window ---- */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function contentToHtml(md: string): string {
  const lines = md.split(/\r?\n/);
  let html = "";
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<h3>${escapeHtml(line.slice(3))}</h3>`;
    } else if (line.startsWith("- ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${escapeHtml(line.slice(2))}</li>`;
    } else if (line.trim() === "") {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<p>${escapeHtml(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}
