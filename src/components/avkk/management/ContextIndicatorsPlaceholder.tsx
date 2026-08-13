/**
 * Kontextindikatoren sind eine **getrennte Ebene** neben AVKK und derzeit
 * bewusst nicht erhoben (ADR-0027). Kein Platzhalterwert, keine leeren
 * Diagramme — nur eine ehrliche Statusaussage.
 */
import { Info } from "lucide-react";

export function ContextIndicatorsPlaceholder({ onOpenManual }: { onOpenManual: () => void }) {
  return (
    <section
      aria-labelledby="avkk-context-heading"
      className="rounded-xl border border-border bg-secondary/30 p-4"
    >
      <h3 id="avkk-context-heading" className="flex items-center gap-2 text-sm font-semibold">
        <Info className="size-4 shrink-0 text-info" aria-hidden="true" />
        Kontextindikatoren (geplant)
      </h3>
      <p className="mt-2 text-xs text-muted-foreground">
        Weiche Faktoren wie Arbeitsbelastung, Zeitdruck, Teamunterstützung, Informationslage,
        Ressourcenlage, Eskalationsgrad und Kundenzufriedenheit gehören <strong>nicht</strong> zum
        Akronym AVKK. Sie bilden eine eigene Ebene zwischen AVKK-Bewertung und
        Management-Handlungsbedarf.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Es werden aktuell keine Kontextdaten erhoben oder gespeichert. Das Zielmodell inklusive
        Zweckbindung, Sichtbarkeit, Aufbewahrung und Berechtigungen ist in
        <span className="font-mono"> docs/AVKK-CONTEXT-INDICATORS.md</span> beschrieben; die
        Persistenz folgt in einem eigenen Sprint.
      </p>
      <button
        type="button"
        onClick={onOpenManual}
        className="mt-3 inline-flex min-h-11 items-center rounded-md border border-border bg-secondary/40 px-3 text-sm hover:bg-secondary"
      >
        Erläuterung im Handbuch öffnen
      </button>
    </section>
  );
}
