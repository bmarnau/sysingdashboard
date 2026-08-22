/**
 * „AVKK verstehen" — dauerhaft erreichbare Kurzerklärung im Cockpit.
 * Textquelle ist `AVKK_EXPLANATIONS`; fachliche Referenz bleibt `docs/AVKK.md`.
 */
import { AVKK_EXPLANATIONS, AvkkExplainer, AvkkMethodLink } from "../AvkkExplainer";

export function AvkkUnderstandPanel({ onOpenManual }: { onOpenManual: () => void }) {
  return (
    <section aria-labelledby="avkk-understand-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="avkk-understand-heading" className="text-sm font-semibold">
          AVKK verstehen
        </h3>
        <AvkkMethodLink onOpen={onOpenManual} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AvkkExplainer letter="A" title="Aufgabe" text={AVKK_EXPLANATIONS.aufgabe} />
        <AvkkExplainer letter="V" title="Verantwortung" text={AVKK_EXPLANATIONS.verantwortung} />
        <AvkkExplainer letter="K" title="Kompetenz" text={AVKK_EXPLANATIONS.kompetenz} />
        <AvkkExplainer letter="K" title="Konsequenz" text={AVKK_EXPLANATIONS.konsequenz} />
      </div>
      <p className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
        AVKK dient der transparenten Aufgaben-, Verantwortungs- und Risikosteuerung. Das
        Verantwortungsgefühl ist eine Führungs- und Klärungsfrage und wird im Dashboard nicht als
        Kennwert gemessen. AVKK ist{" "}
        <strong className="font-semibold text-foreground">kein</strong> Instrument zur
        automatisierten personenbezogenen Leistungsbewertung. Bewertet wird die Situation rund um
        eine Aufgabe, nicht die Person.
      </p>
    </section>
  );
}
