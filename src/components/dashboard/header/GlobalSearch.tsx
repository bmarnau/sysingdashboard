/**
 * Globale Suche im Dashboard-Header.
 * Kapselt Suchfeld, Ergebnis-Popover und Außenklick-Verhalten.
 * Verhaltensneutral aus dashboard.tsx extrahiert (Sprint 05).
 */
import { useEffect, useRef, useState } from "react";
import { BookOpen, Clock, FolderKanban, Layers, Search } from "lucide-react";
import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";
import { HelpDocumentationService } from "@/lib/help-documentation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { fmtDate } from "../formatters";
import type { Tab } from "../constants";

interface GlobalSearchProps {
  projects: Project[];
  workPackages: WorkPackage[];
  activities: Activity[];
  setTab: (tab: Tab) => void;
  setEditingProject: (p: Project | null) => void;
  setEditingWP: (w: WorkPackage | null) => void;
  setEditingActivity: (a: Activity | null) => void;
  /**
   * F-18: Edit-Dialoge aus der globalen Suche sind an dieselben Permissions
   * gebunden wie die Fachansichten. Ohne Recht bleibt nur die Navigation.
   */
  canEditProject: boolean;
  canEditWP: boolean;
  canEditActivity: boolean;
  openManualTopic: (topicId?: string, q?: string) => void;
}

export function GlobalSearch({
  projects,
  workPackages,
  activities,
  setTab,
  setEditingProject,
  setEditingWP,
  setEditingActivity,
  canEditProject,
  canEditWP,
  canEditActivity,
  openManualTopic,
}: GlobalSearchProps) {
  const currentUser = useCurrentUser();
  const [searchQ, setSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={searchRef} className="relative hidden flex-1 max-w-lg md:block">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchQ}
          onChange={(e) => {
            setSearchQ(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          placeholder="Kunde, Tätigkeit, Arbeitspaket, Projekt…"
          aria-label="Globale Suche"
          type="search"
          suppressHydrationWarning
          className="h-10 w-full rounded-lg border border-input bg-secondary/40 pl-9 pr-8 text-sm outline-none transition focus:border-ring"
        />
        {searchQ && (
          <button
            type="button"
            aria-label="Suche zurücksetzen"
            onClick={() => {
              setSearchQ("");
              setSearchOpen(false);
            }}
            className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>
      {searchOpen && searchQ.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-hidden overflow-y-auto rounded-xl border border-border bg-background shadow-[var(--shadow-elevated)]">
          {(() => {
            const q = searchQ.toLowerCase().trim();
            const pRes = projects
              .filter(
                (p) =>
                  p.name.toLowerCase().includes(q) ||
                  p.client.toLowerCase().includes(q) ||
                  (p.description ?? "").toLowerCase().includes(q),
              )
              .slice(0, 4);
            const wpRes = workPackages
              .filter(
                (w) =>
                  w.title.toLowerCase().includes(q) ||
                  (w.client ?? "").toLowerCase().includes(q) ||
                  (w.tags ?? []).some((t) => t.toLowerCase().includes(q)),
              )
              .slice(0, 4);
            const aRes = activities
              .filter(
                (a) =>
                  a.title.toLowerCase().includes(q) ||
                  (a.client ?? "").toLowerCase().includes(q) ||
                  (a.description ?? "").toLowerCase().includes(q),
              )
              .slice(0, 4);
            const hRes = HelpDocumentationService.searchTopics(q, currentUser?.role ?? null).slice(
              0,
              4,
            );
            const hasAny = pRes.length + wpRes.length + aRes.length + hRes.length > 0;
            if (!hasAny)
              return (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Keine Ergebnisse.
                </div>
              );
            return (
              <>
                {pRes.length > 0 && (
                  <div className="px-3 py-2">
                    <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Projekte
                    </p>
                    {pRes.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSearchQ("");
                          setSearchOpen(false);
                          setTab("projekte");
                          setEditingProject(p);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-secondary/60"
                      >
                        <FolderKanban className="size-4 text-primary opacity-70" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.client}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {wpRes.length > 0 && (
                  <div className="border-t border-border px-3 py-2">
                    <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Arbeitspakete
                    </p>
                    {wpRes.map((w) => {
                      const proj = w.projectId ? projects.find((p) => p.id === w.projectId) : null;
                      return (
                        <button
                          key={w.id}
                          onClick={() => {
                            setSearchQ("");
                            setSearchOpen(false);
                            setTab("arbeitspakete");
                            setEditingWP(w);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-secondary/60"
                        >
                          <Layers className="size-4 text-info opacity-70" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{w.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {proj ? proj.name : "projektlos"} · {w.client ?? "—"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {aRes.length > 0 && (
                  <div className="border-t border-border px-3 py-2">
                    <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Tätigkeiten
                    </p>
                    {aRes.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          setSearchQ("");
                          setSearchOpen(false);
                          setTab("taetigkeiten");
                          setEditingActivity(a);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-secondary/60"
                      >
                        <Clock className="size-4 text-success opacity-70" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{a.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {fmtDate(a.date)} · {a.client ?? "—"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {hRes.length > 0 && (
                  <div className="border-t border-border px-3 py-2">
                    <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Handbuch
                    </p>
                    {hRes.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => {
                          const qNow = searchQ;
                          setSearchQ("");
                          setSearchOpen(false);
                          openManualTopic(h.id, qNow);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-secondary/60"
                      >
                        <BookOpen className="size-4 text-primary opacity-70" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{h.title}</p>
                          <p className="text-xs text-muted-foreground">{h.category}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
