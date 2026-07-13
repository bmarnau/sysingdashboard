# ADR-0014 — AST-freie statische API-Discovery statt Konventions-Meta-Export

- Status: **Accepted** — 2026-07-13
- Kontext: Prompt 2A.5B (API Discovery Framework)
- Ersetzt: keine (ergänzt ADR-0011 „API-Endpoint-Contract-Tests")

## Kontext

Das Dashboard hatte bis v1.33.0 nur eine manuell gepflegte Endpoint-Registry
(`src/__tests__/api/registry/endpoints.ts`). Neue Routen konnten in der
Registry vergessen werden, ohne dass CI es bemerkt hätte. Prompt 2A.5B
forderte ein automatisches Discovery-Framework, das den echten Buildstand
als Wahrheitsquelle nimmt.

## Optionen

### A) AST-freie statische Analyse (gewählt)
Ein Discovery-Skript scannt `src/routes/api/**/*.ts` per Regex und extrahiert
Pfad, HTTP-Methoden, Middleware-Wrapper, Validierung und Auth-Guards.
Registry bleibt als Anreicherungsquelle bestehen.

- (+) Zero-Dependency, in <200 LOC lesbar.
- (+) Deterministische Reihenfolge, testbar per Fixtures.
- (+) Konsistent mit ADR-0010 (Tech-Debt-Detektoren sind ebenfalls regex-basiert).
- (−) Reagiert auf neue Muster nur mit erweitertem Analyzer.

### B) Voller AST (@babel/parser oder ts-morph)
- (+) Robuster gegenüber ungewöhnlichen Formatierungen.
- (−) Zusätzliche Build-Kosten, transitive Dependency-Belastung.
- (−) Für die aktuelle Angriffsfläche (2 Routen) massiv überdimensioniert.

### C) Konventions-Meta-Export
Jede Route exportiert `endpointMeta = { auth, permission, scope, ... }`.
Discovery liest nur die Exports.

- (+) Präzise, keine Heuristik.
- (−) Invasiv: bricht bei jeder neuen Route ohne Meta.
- (−) Läuft echter Auto-Discovery entgegen — man dokumentiert nur, was der
  Autor bewusst schreibt.

## Entscheidung

**Option A**. Wenn die Angriffsfläche wächst oder eine Discovery-Heuristik
zu unzuverlässig wird, migrieren wir gezielt betroffene Analyzer auf AST —
schrittweise, ohne Big-Bang.

## Konsequenzen

- Neue Auth-Mechanismen müssen entweder eines der bekannten Muster
  (`withCorrelation`, `checkAuth`, `X-Sync-Token`, `requireSupabaseAuth`)
  verwenden **oder** die Registry per `authRequired: true` explizit setzen.
- Unklassifizierte Endpoints erzeugen ein Medium-Finding — der Autor wird
  aktiv gezwungen, `permission`, `/api/public/*` oder `authRequired` zu
  wählen.
- CI-Gate startet **soft** (Warnung), damit bestehende Design-Lücken den
  Bootstrap nicht blockieren; kippen auf `--gate` erfolgt, sobald
  SEC-CRIT-001/002 (Backend-RBAC-Middleware, Rolle nur in localStorage)
  aufgelöst sind.

## Amendment — 2026-07-13 (v1.34.1)

Option C (Konventions-Meta-Export) wird **additiv** eingeführt, nicht als
Ersatz für Option A. Motivation: Regex-basierte Auto-Klassifizierung ist
konservativ und meldet legitime anonyme Endpoints wie `/api/status` als
`unclassified`. Der Weg über die Contract-Registry funktioniert, ist aber
für einfache Fälle zu umständlich und trennt die Ausnahmebegründung
räumlich vom Handler.

### Regel
Routen dürfen optional exportieren:

```ts
export const endpointMeta = {
  public: true,
  reason: "…",              // Pflicht bei public:true — sonst LOW-Finding
  classification: "public",  // optional, überschreibt Heuristik
  permission: null,
  authRequired: false,
} as const;
```

Vorrang: `endpointMeta` > Registry > Heuristik. Keine verschachtelten
Objekte — bewusst tolerante Regex-Extraktion, kein AST (siehe Kern-ADR).
`public: true` **ohne** `reason` erzeugt Low-Finding
`public-without-reason`, damit die Ausnahme dokumentiert bleibt.

### Warum kein Widerspruch zur ursprünglichen Entscheidung
Option C wurde ursprünglich als *Ersatz* für die Auto-Discovery bewertet
und daher verworfen (Bricht bei jeder neuen Route ohne Meta). Die
additive Einführung ändert daran nichts: fehlt `endpointMeta`, greift
weiter die Heuristik.
