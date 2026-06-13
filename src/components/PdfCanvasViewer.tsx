import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ZoomIn, ZoomOut, RotateCw, Maximize2 } from "lucide-react";

// pdf.js wird dynamisch geladen, damit das Modul nicht im initialen Bundle landet.
type PdfDocLike = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPageLike>;
  destroy: () => Promise<void>;
};
type PdfPageLike = {
  getViewport: (opts: { scale: number; rotation?: number }) => {
    width: number;
    height: number;
  };
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
    canvas?: HTMLCanvasElement;
  }) => { promise: Promise<void>; cancel: () => void };
};

interface PdfCanvasViewerProps {
  blob: Blob | null;
  fileName?: string;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;

export function PdfCanvasViewer({ blob }: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const docRef = useRef<PdfDocLike | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PDF laden
  useEffect(() => {
    if (!blob) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        // Worker-URL über Vite-Asset-Import (mit ?url) — funktioniert im Worker-Mode.
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        (pdfjs.GlobalWorkerOptions as { workerSrc: string }).workerSrc = workerUrl;

        const buf = await blob.arrayBuffer();
        if (cancelled) return;
        const loadingTask = pdfjs.getDocument({ data: buf });
        const doc = (await loadingTask.promise) as unknown as PdfDocLike;
        if (cancelled) {
          await doc.destroy();
          return;
        }
        docRef.current = doc;
        setPageCount(doc.numPages);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      docRef.current?.destroy().catch(() => {});
      docRef.current = null;
    };
  }, [blob]);

  // Seiten rendern bei Änderungen
  useEffect(() => {
    const doc = docRef.current;
    const container = containerRef.current;
    if (!doc || !container || pageCount === 0) return;

    let cancelled = false;
    const renderTasks: Array<{ cancel: () => void }> = [];

    container.innerHTML = "";

    (async () => {
      const dpr = window.devicePixelRatio || 1;
      for (let i = 1; i <= doc.numPages; i++) {
        if (cancelled) return;
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale, rotation });

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.className =
          "mx-auto my-3 block rounded-sm bg-white shadow-md ring-1 ring-border";

        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const pageLabel = document.createElement("div");
        pageLabel.textContent = `Seite ${i} / ${doc.numPages}`;
        pageLabel.className = "mx-auto mt-2 w-fit text-xs text-muted-foreground";

        container.appendChild(canvas);
        container.appendChild(pageLabel);

        const task = page.render({ canvasContext: ctx, viewport, canvas });
        renderTasks.push(task);
        try {
          await task.promise;
        } catch {
          /* cancelled */
        }
      }
    })();

    return () => {
      cancelled = true;
      for (const t of renderTasks) {
        try {
          t.cancel();
        } catch {
          /* noop */
        }
      }
    };
  }, [pageCount, scale, rotation]);

  const fitWidth = () => {
    const container = containerRef.current;
    const doc = docRef.current;
    if (!container || !doc) return;
    doc.getPage(1).then((page) => {
      const baseViewport = page.getViewport({ scale: 1, rotation });
      const available = container.clientWidth - 32;
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, available / baseViewport.width));
      setScale(Number(next.toFixed(2)));
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs">
        <span className="text-muted-foreground">
          {pageCount > 0 ? `${pageCount} Seite${pageCount === 1 ? "" : "n"}` : "—"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScale((s) => Math.max(MIN_SCALE, Number((s - SCALE_STEP).toFixed(2))))}
            disabled={scale <= MIN_SCALE}
            aria-label="Verkleinern"
          >
            <ZoomOut className="size-4" />
          </Button>
          <span className="w-12 text-center font-mono">{Math.round(scale * 100)}%</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScale((s) => Math.min(MAX_SCALE, Number((s + SCALE_STEP).toFixed(2))))}
            disabled={scale >= MAX_SCALE}
            aria-label="Vergrößern"
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={fitWidth} aria-label="Breite anpassen">
            <Maximize2 className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            aria-label="Drehen"
          >
            <RotateCw className="size-4" />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-secondary/40 px-2 py-2"
        aria-label="PDF Vorschau"
      />

      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60">
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow">
            <Loader2 className="size-4 animate-spin" />
            PDF wird gerendert…
          </div>
        </div>
      )}

      {error && (
        <div className="border-t border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          Fehler beim Rendern: {error}
        </div>
      )}
    </div>
  );
}
