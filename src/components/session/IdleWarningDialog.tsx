/**
 * Warndialog vor automatischer Abmeldung bei Inaktivität.
 *
 * Bewusst ohne Radix-Dialog: das Overlay muss auch dann erscheinen, wenn ein
 * anderer Dialog offen ist, und darf durch Hintergrundaktivität (Klick auf
 * Overlay, ESC) NICHT geschlossen werden.
 */

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IdleWarningDialogProps {
  open: boolean;
  secondsRemaining: number;
  onStay: () => void;
  onLogout: () => void;
}

function formatSeconds(total: number): string {
  const s = Math.max(0, total);
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return m > 0 ? `${m}:${String(rest).padStart(2, "0")} Minuten` : `${rest} Sekunden`;
}

export function IdleWarningDialog({
  open,
  secondsRemaining,
  onStay,
  onLogout,
}: IdleWarningDialogProps) {
  const stayRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    stayRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>("button:not([disabled])");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
      data-testid="idle-warning-overlay"
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-warning-title"
        aria-describedby="idle-warning-desc"
        className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-elevated)]"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0">
            <h2 id="idle-warning-title" className="text-base font-semibold text-foreground">
              Ihre Sitzung läuft wegen Inaktivität ab.
            </h2>
            <p id="idle-warning-desc" className="mt-2 text-sm text-muted-foreground">
              Sie werden aus Sicherheitsgründen automatisch abgemeldet, wenn keine Aktivität
              erfolgt.
            </p>
            <p className="mt-3 text-sm text-foreground" aria-live="polite" aria-atomic="true">
              Automatische Abmeldung in{" "}
              <span className="font-semibold tabular-nums" data-testid="idle-countdown">
                {formatSeconds(secondsRemaining)}
              </span>
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onLogout}>
            Jetzt abmelden
          </Button>
          <Button ref={stayRef} onClick={onStay}>
            Angemeldet bleiben
          </Button>
        </div>
      </div>
    </div>
  );
}
