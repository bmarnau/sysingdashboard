/**
 * LogViewerDialog — sichtbare Oberfläche für die bestehende Logger-
 * Infrastruktur (`src/lib/logger.ts` + IndexedDB-Sink).
 *
 * Design-Entscheidungen:
 *  - **Keine neue Log-Infrastruktur.** Nur Read-API + UI.
 *  - Datenquelle = Union aus In-Memory-Ringpuffer (aktuelle Session) und
 *    persistiertem IndexedDB-Sink (frühere Sessions). Deduplizierung
 *    über `ts|level|message`.
 *  - Filter kombinierbar (Level, Zeitraum, Volltext) — reine
 *    `useMemo`-Filterung, keine Virtualisierung (siehe ADR-0006), aber
 *    Anzeige auf 1000 Zeilen begrenzt.
 *  - Detail-Ansicht in `<Sheet>` mit vollständigem JSON-Kontext und
 *    optionalem Stacktrace.
 *  - Secrets sind bereits im Logger redigiert (siehe `logger.ts`) —
 *    hier keine zusätzliche Verarbeitung.
 */
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download as DownloadIcon,
  RefreshCw,
  ScrollText,
  Trash2,
  Copy as CopyIcon,
} from "lucide-react";
import { logger, type LogEntry, type LogLevel } from "@/lib/logger";
import { readAllLogs, clearAllLogs } from "@/lib/logger.indexeddb-reader";

interface LogViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];
type Range = "15m" | "1h" | "24h" | "7d" | "all";
const RANGE_LABEL: Record<Range, string> = {
  "15m": "Letzte 15 Minuten",
  "1h": "Letzte Stunde",
  "24h": "Letzte 24 Stunden",
  "7d": "Letzte 7 Tage",
  all: "Alle",
};
const RANGE_MS: Record<Range, number | null> = {
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "24h": 24 * 60 * 60_000,
  "7d": 7 * 24 * 60 * 60_000,
  all: null,
};

const LEVEL_STYLE: Record<LogLevel, string> = {
  debug: "bg-muted text-muted-foreground",
  info: "bg-primary/10 text-primary",
  warn: "bg-warning/15 text-warning",
  error: "bg-destructive/15 text-destructive",
};

const MAX_ROWS = 1000;

function mergeLogs(a: LogEntry[], b: LogEntry[]): LogEntry[] {
  const seen = new Set<string>();
  const out: LogEntry[] = [];
  for (const e of [...a, ...b]) {
    const key = `${e.ts}|${e.level}|${e.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  // neueste zuerst
  return out.sort((x, y) => (x.ts < y.ts ? 1 : x.ts > y.ts ? -1 : 0));
}

function extractSource(e: LogEntry): string {
  const c = e.context ?? {};
  const v =
    (typeof c.label === "string" && c.label) ||
    (typeof c.module === "string" && c.module) ||
    (typeof c.operation === "string" && c.operation) ||
    (typeof c.component === "string" && c.component);
  return v || "—";
}

function haystack(e: LogEntry): string {
  const ctx = e.context ? JSON.stringify(e.context) : "";
  const err = e.error ? `${e.error.name} ${e.error.message}` : "";
  return `${e.message} ${err} ${ctx}`.toLowerCase();
}

function fmtTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function LogViewerDialog({ open, onOpenChange }: LogViewerDialogProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [enabledLevels, setEnabledLevels] = useState<Set<LogLevel>>(
    new Set<LogLevel>(LEVELS),
  );
  const [range, setRange] = useState<Range>("24h");
  const [source, setSource] = useState<string>("__all__");
  const [rawQuery, setRawQuery] = useState("");
  const query = useDeferredValue(rawQuery);
  const [selected, setSelected] = useState<LogEntry | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setLoadError(null);
    try {
      const persisted = await readAllLogs();
      const memory = logger.getRecent();
      setEntries(mergeLogs(memory, persisted));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
      setEntries(logger.getRecent().slice().reverse());
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open || !autoRefresh) return;
    timerRef.current = setInterval(() => {
      void load();
    }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [open, autoRefresh, load]);

  const sources = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) {
      const v = extractSource(e);
      if (v !== "—") s.add(v);
    }
    return Array.from(s).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const cutoff = RANGE_MS[range] === null ? null : Date.now() - (RANGE_MS[range] as number);
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (!enabledLevels.has(e.level)) return false;
      if (cutoff !== null) {
        const t = Date.parse(e.ts);
        if (Number.isFinite(t) && t < cutoff) return false;
      }
      if (source !== "__all__" && extractSource(e) !== source) return false;
      if (q && !haystack(e).includes(q)) return false;
      return true;
    });
  }, [entries, enabledLevels, range, source, query]);

  const shown = filtered.slice(0, MAX_ROWS);
  const overflow = Math.max(0, filtered.length - MAX_ROWS);

  const toggleLevel = (lvl: LogLevel) => {
    setEnabledLevels((prev) => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      return next;
    });
  };

  const handleExport = () => {
    const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
    downloadJson(`logs-${stamp}.json`, filtered);
  };

  const handleClearAll = async () => {
    if (!window.confirm("Alle gespeicherten Logs (In-Memory + IndexedDB) löschen?")) return;
    await clearAllLogs();
    logger.clear();
    await load();
  };

  const handleCopyDetail = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(selected, null, 2));
    } catch {
      /* Clipboard nicht verfügbar — bewusst still */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="size-5" /> Log Viewer
          </DialogTitle>
          <DialogDescription>
            Anzeige der Logger-Einträge aus dem aktuellen Ringpuffer und dem persistierten
            IndexedDB-Sink (letzte 1000 Einträge / 7 Tage). Secrets sind bereits im Logger
            maskiert.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b pb-3">
          <Input
            aria-label="Volltextsuche in Logs"
            placeholder="Suchen in Message, Kontext, Fehler, Correlation-ID…"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            className="h-9 max-w-sm"
          />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={autoRefresh}
                onCheckedChange={(v) => setAutoRefresh(Boolean(v))}
                aria-label="Automatisch aktualisieren"
              />
              Auto (5 s)
            </label>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}>
              <RefreshCw className={`mr-1 size-4 ${busy ? "animate-spin" : ""}`} />
              Aktualisieren
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
              <DownloadIcon className="mr-1 size-4" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1 size-4" />
              Löschen
            </Button>
          </div>
        </div>

        {loadError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            IndexedDB-Read fehlgeschlagen: {loadError} — nur Ringpuffer angezeigt.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
          {/* Filter */}
          <aside className="space-y-4 rounded-md border border-border p-3 text-sm">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Level
              </p>
              {LEVELS.map((lvl) => (
                <label key={lvl} className="flex items-center gap-2">
                  <Checkbox
                    checked={enabledLevels.has(lvl)}
                    onCheckedChange={() => toggleLevel(lvl)}
                    aria-label={`Level ${lvl}`}
                  />
                  <span className={`rounded px-2 py-0.5 text-xs ${LEVEL_STYLE[lvl]}`}>{lvl}</span>
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="log-range" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Zeitraum
              </Label>
              <Select value={range} onValueChange={(v) => setRange(v as Range)}>
                <SelectTrigger id="log-range" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {RANGE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {sources.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="log-source" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Quelle
                </Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger id="log-source" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Alle Quellen</SelectItem>
                    {sources.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {filtered.length} von {entries.length} Einträgen
              {overflow > 0 ? ` · ${overflow} weitere gefiltert` : ""}
            </p>
          </aside>

          {/* Liste */}
          <div className="max-h-[60vh] min-h-[300px] overflow-auto rounded-md border border-border">
            {shown.length === 0 ? (
              <div className="px-4 py-16 text-center text-sm text-muted-foreground">
                Keine Log-Einträge für die aktuellen Filter.
                <br />
                <span className="text-xs">
                  In DEV wird zusätzlich in die Browser-Console geschrieben; IndexedDB-Persistenz
                  greift erst im PROD-Build.
                </span>
              </div>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {shown.map((e, i) => (
                  <li key={`${e.ts}-${i}`}>
                    <button
                      type="button"
                      onClick={() => setSelected(e)}
                      className="grid w-full grid-cols-[130px_60px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left hover:bg-secondary/50"
                    >
                      <span
                        className="truncate font-mono text-xs text-muted-foreground"
                        title={e.ts}
                      >
                        {fmtTs(e.ts)}
                      </span>
                      <span
                        className={`justify-self-start rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${LEVEL_STYLE[e.level]}`}
                      >
                        {e.level}
                      </span>
                      <span className="min-w-0 truncate">{e.message}</span>
                      <span className="shrink-0 truncate text-xs text-muted-foreground max-w-[140px]">
                        {extractSource(e)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>

        {/* Detail-Sheet */}
        <Sheet open={selected !== null} onOpenChange={(v) => !v && setSelected(null)}>
          <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {selected && (
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${LEVEL_STYLE[selected.level]}`}
                  >
                    {selected.level}
                  </span>
                )}
                Log-Detail
              </SheetTitle>
              <SheetDescription>
                {selected ? fmtTs(selected.ts) : ""}
                {selected ? ` · Quelle: ${extractSource(selected)}` : ""}
              </SheetDescription>
            </SheetHeader>

            {selected && (
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Message
                  </p>
                  <p className="mt-1 break-words">{selected.message}</p>
                </div>

                {selected.context && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Kontext
                    </p>
                    <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-2 text-xs">
                      {JSON.stringify(selected.context, null, 2)}
                    </pre>
                  </div>
                )}

                {selected.error && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Fehler
                    </p>
                    <p className="mt-1 font-mono text-xs">
                      {selected.error.name}
                      {selected.error.code ? ` · ${selected.error.code}` : ""}:{" "}
                      {selected.error.message}
                    </p>
                    {selected.error.stack && (
                      <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-2 text-[11px]">
                        {selected.error.stack}
                      </pre>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleCopyDetail}>
                    <CopyIcon className="mr-1 size-4" />
                    Als JSON kopieren
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                    Schließen
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </DialogContent>
    </Dialog>
  );
}
