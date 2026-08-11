/**
 * Kompakte Methodik-Erklärung je AVKK-Dimension. Reine Darstellung.
 */
import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

export const AVKK_EXPLANATIONS = {
  aufgabe:
    "Aufgabe: Was genau ist zu tun, bis wann, und woran ist die Erfüllung erkennbar? Ohne klare Aufgabe sind die drei folgenden Dimensionen nicht bewertbar.",
  verantwortung:
    "Verantwortung: Wer steht persönlich dafür ein — und wofür genau (Ergebnis, Termin, Qualität, Budget …)? Verantwortung ohne Namen ist keine Verantwortung.",
  kompetenz:
    "Kompetenz: Ist die Aufgabe mit den vorhandenen Mitteln überhaupt erfüllbar — Fachwissen, Zeit, Material, Werkzeuge, Budget, Berechtigung, Unterstützung?",
  konsequenz:
    "Konsequenz: Was passiert, wenn die Aufgabe nicht oder zu spät erfüllt wird — für Team, Projekt, Kunde, Compliance, Termine?",
} as const;

export function AvkkExplainer({
  letter,
  title,
  text,
  children,
}: {
  letter: string;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-secondary/30 p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/15 text-xs font-bold text-primary"
        >
          {letter}
        </span>
        <span className="min-w-0">{title}</span>
      </h4>
      <p className="mt-2 text-xs text-muted-foreground">{text}</p>
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

export function AvkkMethodLink({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 text-sm hover:bg-secondary"
    >
      <HelpCircle className="size-4" aria-hidden="true" />
      AVKK verstehen
    </button>
  );
}
