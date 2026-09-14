# BSF-03A — Freshness- und Datenstandsvertrag

Stand: 2026-09-14
Status: VERBINDLICHER ERGÄNZUNGSVERTRAG ZU `docs/BSF-03A-DESIGN.md`
Issue: #106
Verbraucher: BSF-KIOSK-02 / #136 und spätere Reporting-/Managementsichten

## 1. Zweck

BSF-03A muss neben fachlichen Summen auch den Datenstand der tatsächlich verwendeten Shared-Projection-Daten nachvollziehbar machen.

Ein UI-Renderzeitpunkt oder ein Server-Request-Zeitpunkt ist **kein** belastbarer Datenstand. Deshalb wird Freshness aus den Projection-Zeilen abgeleitet, die in das konkrete Controlling-Ergebnis eingeflossen sind.

## 2. Ergebnisvertrag

`ProjectControllingResult` enthält zusätzlich:

```ts
export interface ProjectControllingFreshness {
  oldestPublishedAt: string | null;
  latestPublishedAt: string | null;
  observedRows: number;
}
```

und:

```ts
export interface ProjectControllingResult {
  // bestehende Filter/Summary/Trend/Rows/Completeness-Felder
  freshness: ProjectControllingFreshness;
}
```

## 3. Ableitung

Für alle Shared-Projection-Zeilen, die nach serverseitigem Scope und Filter tatsächlich zum Ergebnis gehören, werden deren `publishedAt`-Werte betrachtet.

Regeln:

- `oldestPublishedAt` = ältester gültiger `publishedAt`-Wert der verwendeten Projection-Zeilen,
- `latestPublishedAt` = neuester gültiger `publishedAt`-Wert der verwendeten Projection-Zeilen,
- `observedRows` = Anzahl der Projection-Zeilen, deren Zeitstempel in die Freshness-Berechnung eingehen,
- bei einem fachlich gültigen Ergebnis ohne verwendete Projection-Zeile: beide Zeitstempel `null`, `observedRows = 0`,
- ungültige oder fehlende Zeitstempel werden nicht durch `now()` ersetzt,
- ein unbekannter Datenstand bleibt unbekannt.

## 4. Welche Zeilen zählen

Zur Freshness zählen nur Zeilen, die für das konkrete Ergebnis fachlich verwendet werden:

- Activities im Zeitraum und zulässigen Scope,
- ihre tatsächlich aufgelösten WorkPackages,
- ihre tatsächlich aufgelösten Projects.

Nicht gezählt werden:

- RLS-unsichtbare Zeilen,
- nur als Filteroption geladene, aber nicht in das Ergebnis einfließende Objekte,
- inaktive/withdrawn Projection-Zeilen,
- Demo-/Mock-Daten,
- Render-/Request-Zeitstempel.

## 5. Verhältnis zu `generatedAt`

Falls ein API-/View-Model zusätzlich einen technischen `generatedAt`-Zeitpunkt enthält, bleibt dieser ausdrücklich getrennt:

```text
generatedAt     = Zeitpunkt der Ergebnisberechnung
latestPublishedAt = jüngster Datenstand der verwendeten Projection-Zeilen
```

Die beiden Werte dürfen in UI und Dokumentation nicht gleichgesetzt werden.

## 6. KIOSK-02

KIOSK-02 verwendet `latestPublishedAt` als sichtbaren Datenstand seiner internen Projekt-/AP-/Tätigkeitsdomänen.

- interne Daten vorhanden: `sourceKind=internal`, `observedAt=latestPublishedAt`,
- internes Ergebnis leer und Freshness unbekannt: `observedAt=null` und sichtbarer Unknown-Hinweis,
- interner Read fehlgeschlagen: `sourceKind=unavailable`; kein Demo-Fallback.

Demo-Domänen besitzen weiterhin ihren eigenen ausdrücklich als Demo gekennzeichneten Zeitstempel.

## 7. Tests

BSF-03A muss mindestens nachweisen:

1. mehrere verwendete Projection-Zeitstempel -> min/max korrekt,
2. Filter schließt neuere fremde Zeile aus -> sie verändert Freshness nicht,
3. RLS-/Customer-Scope unsichtbare Zeilen -> verändern Freshness nicht,
4. leeres Ergebnis -> `null/null/0`,
5. kein `now()`-Fallback,
6. Summen und Freshness stammen aus demselben gefilterten Ergebnisraum.

## 8. Portabilität

Der Freshness-Vertrag ist providerneutral. Supabase liefert heute `published_at`; ein späterer Azure-SQL-/anderer Provider muss dieselbe semantische Information über seinen Adapter bereitstellen.

Es entsteht keine Kiosk-spezifische Datenbankspalte und keine neue Runtime-Abhängigkeit.
