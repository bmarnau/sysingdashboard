# BSF-03E P3b-2 – Lovable UI-/UX-Review und Präsentationsfixes

Stand: 2026-10-10 · Kandidat 1.68.0 (keine Versionsanhebung) · Issue #63

## Geprüfte SHAs

- Basis: `main@b5acf3d9349bfb132a1a3615878024955d2a4385`
- Exact Head: `feat/bsf-03e-p3b-work-view-ui@c3238355bce5223d52c99e4385e435e8529e2d76`
  (Parent `b6db2f31…`, „fix(bsf03e): invalidate stale profile reads at session boundary“), per GitHub-API gelesen; Commit unsigned.
- Vergleich b5…c323835: ahead 2 / behind 0, 26 Dateien. Alle 26 Dateien wurden in die Variant übernommen; jede Git-Blob-SHA stimmt mit GitHub überein → **EXACT_HEAD = MATCH**.
- Sessiongrenzen-Fix vorhanden: `useCurrentUser` setzt die Identität vor asynchronen Reads auf `null` und verwirft Antworten älterer `loadGeneration`.

## Findings (auf c323835)

| ID  | Schwere | Befund                                                                                                                                       | Status       |
| --- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| U-1 | Minor   | Aktiver Kunden-/Owner-/Statusfilter, dessen Option nach Refresh entfällt: Auswahlfeld zeigte „Alle …“, obwohl gefiltert wurde (irreführend). | behoben      |
| U-2 | Minor   | „Ohne Fälligkeitsdatum“ stand bei Sortierung Fälligkeit/absteigend ganz oben (Sentinel 9999-12-31).                                          | behoben      |
| U-3 | Minor   | Unbekannte Statuswerte erschienen roh (z. B. `blocked_by_customer`).                                                                         | behoben      |
| U-4 | Minor   | Datumsanzeige teilte jeden String naiv; abweichende Formate ergaben unsinnige Anzeige.                                                       | behoben      |
| U-5 | Minor   | Gleichnamige Kunden/Personen: getrennte Gruppen (ID-Key), aber identische Überschriften/Optionen.                                            | behoben      |
| U-6 | Hinweis | Fehlerzustand nutzt „Aktualisieren“ als Retry; kein eigener Retry-Button direkt am Fehlertext. Funktional korrekt, nicht geändert.           | offen (Info) |
| U-7 | Hinweis | Rollenentzug ohne Client-Ereignis bleibt bis zum nächsten Refresh angezeigt (serverseitig verweigert). Außerhalb UI-Scope.                   | offen (Info) |

Bestätigt ohne Befund: Personensicht ist Default-Tab und erreichbar; Arbeitspakete klar getrennt (eigenes h1); Gruppierung/Sortierung/Filter unabhängig; Reset entfernt nur Filter; „Nicht zugeordnet“ sichtbar; Owner („Verantwortlicher“) und „Stellvertretung“ getrennt, keine Duplikate; Loading/Empty/Filter-Empty/Error unterscheidbar; DENY seitenweit über PermissionGate; keine UUIDs oder Rohfehler sichtbar.

## Änderungen (nur Präsentation / clientseitige Auswahl)

- `src/components/avkk/work/work-view-presentation.ts`: Status-Fallback lesbar, Datumsformat validiert („Datum unbekannt“), `disambiguateLabels` („Name (gleichnamig n)“, ohne IDs), Label für entfallene Filteroption.
- `src/components/avkk/work/WorkPackageWorkViewControls.tsx`: entfallene aktive Filteroption sichtbar + Hinweistext; gleichnamige Optionen unterscheidbar.
- `src/components/avkk/work/WorkPackageWorkViewGroups.tsx`: gleichnamige Gruppenüberschriften unterscheidbar.
- `src/lib/avkk/work-package-work-view.ts` (`compareRows`, nur Client-Auswahl): fehlende Fälligkeit in beiden Richtungen am Ende.
- Neuer Test `src/__tests__/components/avkk/work-view-presentation-p3b2.test.tsx` (5 Fälle).
- Kein Schema, RLS, RBAC, Auth/Session, Server-/RPC-Vertrag, Dependency, Golden-Datensatz oder Versionswechsel.

## Ausgeführte Tests (in dieser Variant)

- Vitest (TZ=UTC), P3b/P3a/Hook/Session/Adapter/Backend/Route/Version: 12 Dateien, **67/67 PASS** (inkl. 5 neue, 5 Session-Tests).
- Playwright (lokales Chromium 1194 über `E2E_CHROMIUM_PATH`, reguläre Config): AP-Spec 10/10 + a11y-Spec 2/2 **PASS** (enthält 1280/640/390 Overflow und Axe WCAG A/AA).
- Zusätzlicher temporärer Lauf (danach entfernt): 1280/640/390 kein Dokument-Overflow, 0 Konsolenfehler, Tab-Reihenfolge logisch (Gruppieren → Sortieren → Richtung → Suche → 4 Filter → Zurücksetzen), Tab-Wechsel per Tastatur, absteigende Fälligkeit endet mit „ohne Fälligkeit“.
- Prettier PASS für geänderte Dateien.

## EVIDENCE_GAPS

- Typecheck: 11 Fehler ausschließlich in unveränderten Supabase-Adaptern (generierte DB-Typen dieser Remix-Variant passen nicht zum Schema); geänderte Dateien fehlerfrei. Exact-Head-Typecheck nur über GitHub-CI belastbar.
- Vollsuite, Build, vollständiger Lint, Security-Scan nicht in dieser Variant ausgeführt.
- Keine Live-DB-/RLS-Abnahme; E2E-Daten synthetisch.
- Signatur, Exact-Head-CI/Security, Windows, veröffentlichte App, P5: nicht Teil dieses Reviews.

## Abnahmekriterien

1. Branch-Diff gegen c323835 enthält nur die oben gelisteten Dateien.
2. Neuer Test 5/5 und bestehende P3b-Tests unverändert grün.
3. Playwright AP-Spec 10/10 inkl. Overflow/Axe in CI grün.
4. Bei Sortierung Fälligkeit/absteigend steht „Ohne Fälligkeitsdatum“ zuletzt.
5. Entfallene aktive Filter zeigen „Nicht mehr in den aktuellen Daten“ samt Hinweis; „Filter zurücksetzen“ stellt die Grundmenge her.
6. Gleichnamige Kunden/Personen sind ohne sichtbare IDs unterscheidbar.
