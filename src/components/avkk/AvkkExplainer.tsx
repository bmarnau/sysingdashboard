/**
 * Kompakte Methodik-Erklärung je AVKK-Dimension. Reine Darstellung.
 */
import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

export const AVKK_EXPLANATIONS = {
  aufgabe:
    "Aufgabe: Was genau ist zu tun, bis wann, und woran ist die Erfüllung erkennbar? Die Aufgabe muss für die ausführende Person klar und gemeinsam nachvollziehbar sein.",
  verantwortung:
    "Verantwortung: Fühle ich mich für diese Aufgabe und ihr Ergebnis verantwortlich — und ist klar, wofür ich Verantwortung übernehme? Die Zuordnung im Dashboard macht diese Verantwortungsübernahme sichtbar; sie misst kein Gefühl und bewertet keine Person.",
  kompetenz:
    "Kompetenz: Sind alle Kompetenzen und Ressourcen vorhanden, um die Aufgabe mit der übernommenen Verantwortung erfüllen zu können — Fachwissen, Erfahrung, Zeit, Material, Werkzeuge, Budget, Berechtigung, Unterstützung?",
  konsequenz:
    "Konsequenz: Welche negativen Folgen entstehen, wenn die Aufgabe nicht, nicht vollständig oder zu spät erfüllt wird — für andere Mitwirkende, für den Kunden und für mich selbst?",
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
