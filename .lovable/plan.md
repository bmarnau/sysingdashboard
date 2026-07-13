## Ziel

Routen können ihre Öffentlichkeit **selbst deklarieren** über einen exportierten `endpointMeta`-Block direkt in der Route-Datei. Damit entfällt der Umweg über die Contract-Registry für einfache Fälle wie `/api/status`, und `unclassified`-Findings entstehen nur noch dort, wo wirklich nichts gesagt wurde.

## Umfang

### 1. Konvention definieren
In jeder Route-Datei optional:

```ts
export const endpointMeta = {
  public: true,              // bewusst anonym erreichbar
  reason: "Health/Status – kein Secret, kein State",
  classification: "public",  // optional, sonst abgeleitet
  permission: null,          // optional
} as const;
```

Nur `public: true` und optional `reason`, `classification`, `permission`, `authRequired` werden ausgewertet. Alles andere wird ignoriert (keine Registry-Ersatzfunktion, kein Feature-Creep).

### 2. Analyzer erweitern (`scripts/api-discovery/analyzers.mjs`)
- Neue Funktion `analyzeEndpointMeta(source)`: Regex-Extraktion des `endpointMeta`-Objekts (Zero-Dependency, konsistent mit ADR-0010). Erkennt `public`, `reason`, `classification`, `permission`, `authRequired`.
- `classify(...)` bekommt Vorrang-Reihenfolge:
  1. `meta.classification` (explizit gesetzt) → gewinnt
  2. `meta.public === true` → `"public"`
  3. `permission` → `"privileged"`
  4. `authRequired` → `"authenticated"`
  5. `/api/public/*`-Prefix → `"public"`
  6. sonst → `"unclassified"`

### 3. Discovery-Integration (`scripts/api-discovery/discover.mjs`)
- `endpointMeta` wird pro Datei extrahiert und in das Endpoint-Objekt geschrieben (`declaredPublic`, `publicReason`).
- Wenn `meta.public === true` **ohne** `reason` → neues Low-Finding `public-without-reason` (transparente Doku-Pflicht statt stiller Ausnahme).
- Bestehendes Medium-Finding `unclassified-endpoint` wird für Routen mit `meta.public` unterdrückt.
- Registry-Merge bleibt unverändert; `endpointMeta` gewinnt vor Registry-Hint (Route-Datei ist näher an der Wahrheit).

### 4. Route anpassen (`src/routes/api/status.ts`)
`endpointMeta` mit `public: true` und `reason` ergänzen — sonst keine Änderung am Handler.

### 5. Selbst-Test (`src/__tests__/api-discovery/discovery.test.ts`)
Zwei neue Fixture-Tests:
- Route mit `endpointMeta.public = true` → `classification === "public"`, kein Unclassified-Finding.
- Route mit `endpointMeta.public = true` **ohne** `reason` → Low-Finding `public-without-reason`.

### 6. Doku
- `src/lib/help-documentation.ts`: Kapitel „API Discovery" ergänzt einen Abschnitt „Endpoint-Selbstdeklaration (`endpointMeta`)"; `lastUpdated` bump.
- `docs/API.md`: kurzer Hinweis + Beispiel-Snippet.
- `CHANGELOG.md`: neuer Eintrag **v1.34.1** (Patch), da rein additive Erweiterung.
- `DOCUMENTATION_VERSION`: nicht anheben (kleine additive Ergänzung).

### 7. Kein Scope-Creep
- Keine Änderung an der Contract-Registry-Struktur.
- Kein Runtime-Import von `endpointMeta` — reine statische Analyse (bleibt konform zu ADR-0014).
- Kein neuer CI-Job, keine neuen Scripts.
- `missing-correlation-id`-False-Positive (aus letzter Zusammenfassung) bleibt separat und wird **nicht** hier mitgemacht.

## Erwartetes Ergebnis nach Umsetzung

Discovery-Lauf gegen aktuellen Stand:
- `/api/status` → `classification: "public"`, `declaredPublic: true`
- Findings-Zahl sinkt um 1 (Wegfall `DISC-MED-api-status-unclassified`)
- Alle bestehenden Self-Tests + 2 neue Fixtures grün

## Technische Details

**Regex für `endpointMeta`** (bewusst tolerant, gleiche Philosophie wie andere Analyzer):

```js
const block = source.match(
  /export\s+const\s+endpointMeta\s*=\s*\{([\s\S]*?)\}\s*(as\s+const)?\s*;/
);
```

Innerhalb des Blocks werden `public`, `authRequired`, `permission`, `classification`, `reason` per Einzel-Regex extrahiert. Verschachtelte Objekte werden nicht unterstützt — das ist Absicht, um AST-Zwang zu vermeiden.

**Vorrang von `meta.classification`** erlaubt Grenzfälle (z. B. `"internal"` später), ohne dass die Basis-Heuristik neu geschrieben werden muss.

## Nicht enthalten (bewusste Nicht-Ziele)

- Auslesen von `endpointMeta` zur Laufzeit oder in der Route-Registrierung.
- Migration bestehender Registry-Einträge auf `endpointMeta` (die Registry bleibt für Payload/Schema-Metadaten).
- Automatische Härtung des CI-Gates.
