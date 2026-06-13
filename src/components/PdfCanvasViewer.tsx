import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { Loader2, Maximize2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";

// pdf.js Worker als Vite-Asset bundeln (kein CDN, offline-fähig).
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfCanvasViewerProps {
  blob: Blob | null;
  fileName?: string;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 4;
const STEP = 0.25;

export function PdfCanvasViewer({ blob }: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [width, setWidth] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Stabile Referenz für <Document file=...>, sonst lädt es bei jedem Render neu.
  const file = useMemo(() => blob ?? null, [blob]);

  useEffect(() => {
    setError(null);
    setNumPages(0);
  }, [blob]);

  const fitWidth = () => {
    if (!containerRef.current) return;
    setWidth(containerRef.current.clientWidth - 32);
    setScale(1);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs">
        <span className="text-muted-foreground">
          {numPages > 0 ? `${numPages} Seite${numPages === 1 ? "" : "n"}` : "—"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setWidth(undefined);
              setScale((s) => Math.max(MIN_SCALE, Number((s - STEP).toFixed(2))));
            }}
            disabled={scale <= MIN_SCALE}
            aria-label="Verkleinern"
          >
            <ZoomOut className="size-4" />
          </Button>
          <span className="w-12 text-center font-mono">{Math.round(scale * 100)}%</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setWidth(undefined);
              setScale((s) => Math.min(MAX_SCALE, Number((s + STEP).toFixed(2))));
            }}
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
            onClick={() => setRotation((r) => (((r + 90) % 360) as 0 | 90 | 180 | 270))}
            aria-label="Drehen"
          >
            <RotateCw className="size-4" />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto bg-secondary/40 px-2 py-2"
        aria-label="PDF Vorschau"
      >
        {file ? (
          <Document
            file={file}
            onLoadSuccess={(d) => setNumPages(d.numPages)}
            onLoadError={(e) => setError(e.message)}
            loading={
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                PDF wird geladen…
              </div>
            }
            error={
              <div className="px-4 py-6 text-sm text-destructive">
                PDF konnte nicht geladen werden.
              </div>
            }
            className="flex flex-col items-center gap-3"
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i} className="flex flex-col items-center">
                <Page
                  pageNumber={i + 1}
                  scale={width ? 1 : scale}
                  width={width}
                  rotate={rotation}
                  renderTextLayer
                  renderAnnotationLayer
                  className="rounded-sm shadow-md ring-1 ring-border"
                />
                <div className="mt-1 text-xs text-muted-foreground">
                  Seite {i + 1} / {numPages}
                </div>
              </div>
            ))}
          </Document>
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Keine Vorschau verfügbar.
          </div>
        )}

        {error && (
          <div className="absolute inset-x-0 bottom-0 border-t border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            Fehler: {error}
          </div>
        )}
      </div>
    </div>
  );
}
