/**
 * Filterleiste der Führungssicht. Alle Auswertungen dieser Seite arbeiten auf
 * derselben gefilterten Zeilenmenge — es gibt keine abweichende Teilmenge.
 */
import { inputCls } from "@/components/dashboard/constants";
import type { ManagementFilter } from "@/lib/avkk/management";

export function ManagementFilters({
  filter,
  contexts,
  responsibilityTypes,
  onChange,
  onReset,
}: {
  filter: ManagementFilter;
  contexts: readonly string[];
  responsibilityTypes: readonly { key: string; label: string }[];
  onChange: (patch: Partial<ManagementFilter>) => void;
  onReset: () => void;
}) {
  return (
    <section aria-label="Filter der Führungssicht" className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-medium">
          <span className="mb-1 block text-muted-foreground">Suche</span>
          <input
            type="search"
            className={inputCls}
            placeholder="Aufgabe, Kennung oder Kontext"
            value={filter.query ?? ""}
            onChange={(e) => onChange({ query: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium">
          <span className="mb-1 block text-muted-foreground">Projekt / Kontext</span>
          <select
            className={inputCls}
            value={filter.context ?? ""}
            onChange={(e) => onChange({ context: e.target.value || null })}
          >
            <option value="">Alle</option>
            {contexts.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          <span className="mb-1 block text-muted-foreground">Aufgabenart</span>
          <select
            className={inputCls}
            value={filter.subjectType ?? ""}
            onChange={(e) => onChange({ subjectType: e.target.value || null })}
          >
            <option value="">Alle</option>
            <option value="project">Projekt</option>
            <option value="workpackage">Arbeitspaket</option>
            <option value="activity">Tätigkeit</option>
          </select>
        </label>
        <label className="text-xs font-medium">
          <span className="mb-1 block text-muted-foreground">Verantwortungsart</span>
          <select
            className={inputCls}
            value={filter.responsibilityType ?? ""}
            onChange={(e) => onChange({ responsibilityType: e.target.value || null })}
          >
            <option value="">Alle</option>
            {responsibilityTypes.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          <span className="mb-1 block text-muted-foreground">Fällig ab</span>
          <input
            type="date"
            className={inputCls}
            value={filter.from ?? ""}
            onChange={(e) => onChange({ from: e.target.value || null })}
          />
        </label>
        <label className="text-xs font-medium">
          <span className="mb-1 block text-muted-foreground">Fällig bis</span>
          <input
            type="date"
            className={inputCls}
            value={filter.to ?? ""}
            onChange={(e) => onChange({ to: e.target.value || null })}
          />
        </label>
        <label className="text-xs font-medium">
          <span className="mb-1 block text-muted-foreground">Kompetenzstatus</span>
          <select
            className={inputCls}
            value={filter.competenceStatus ?? "alle"}
            onChange={(e) =>
              onChange({ competenceStatus: e.target.value as ManagementFilter["competenceStatus"] })
            }
          >
            <option value="alle">Alle</option>
            <option value="missing">Voraussetzung fehlt</option>
            <option value="partial">Teilweise vorhanden</option>
            <option value="ok">Ohne Defizit</option>
          </select>
        </label>
        <label className="text-xs font-medium">
          <span className="mb-1 block text-muted-foreground">Gefährdung</span>
          <select
            className={inputCls}
            value={filter.risk ?? "alle"}
            onChange={(e) => onChange({ risk: e.target.value as ManagementFilter["risk"] })}
          >
            <option value="alle">Alle</option>
            <option value="gefaehrdet">Gefährdet</option>
            <option value="unauffaellig">Unauffällig</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex min-h-11 items-center rounded-md border border-border bg-secondary/40 px-3 text-sm hover:bg-secondary"
      >
        Filter zurücksetzen
      </button>
    </section>
  );
}
