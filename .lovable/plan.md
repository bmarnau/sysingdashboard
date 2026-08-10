# Sprint 07B – Finalisierung und Verifikation (v1.52.0)

Keine neuen Fachfunktionen. Ziel: Tests, Dokumentation, Prüfbericht und Quality Gates für die bereits implementierte AVKK-/Reference-Data-Schicht.

## 1. Service-Tests (Vitest)

Zwei neue Suiten, Adapter gemockt (kein echter Netzwerkzugriff), Verträge statt Coverage:

- `src/__tests__/lib/reference-data/service.test.ts`
  - Katalog-/Wertabfrage, nur aktive Werte, deaktivierte Werte ausgeschlossen, Sortierung nach `sort_order`
  - Katalogversion und Cache: Read-through, atomarer Ersatz, Alterskennzeichnung, fehlender Cache + offline = Fehlerzustand
  - Schreiben offline gesperrt (`ReferenceDataOfflineError`), Adapterfehler wird als Servicefehler propagiert
- `src/__tests__/lib/avkk/service.test.ts`
  - Subject laden/anlegen, Verantwortung, Kompetenz (Supersede-Kette), Konsequenz
  - ungültige/unbekannte Subject-ID, verwaiste Referenzen (`findOrphanSubjects`)
  - fehlende Berechtigung (RLS-/Adapterfehler) wird sauber gemeldet
  - Frühindikator: Schwellenlogik aus `indicators.ts` (`missing` ≥ 1 oder `partial` ≥ 2), Schwelle aus `app_settings`

Zusätzlich ein Security-Test `src/__tests__/security/avkk-rls.test.ts`, der prüft, dass Schreibpfade ausschließlich über die Service-/Adapterschicht laufen und die UI keinen direkten Supabase-Zugriff auf AVKK-Tabellen hat.

## 2. Bewertung `avkk_can_write`

Befund aus der Datenbank (verifiziert): `SECURITY DEFINER`, `STABLE`, `SET search_path = public`, Signatur `(_subject uuid) → boolean`. Sie liefert ausschließlich eine boolesche Entscheidung, keine Tabelleninhalte.

Bewertung wird dokumentiert (ADR-0025 + Prüfbericht) statt entfernt:

- `EXECUTE` für `authenticated` ist nötig, weil die Funktion in RLS-Policies auf AVKK-Tabellen ausgewertet wird
- Informationsgewinn bei direktem Aufruf: nur „darf ich schreiben (ja/nein)" für eine geratene UUID — das ist keine Offenlegung über die Policy hinaus
- Eintrag als **accepted / documented finding** in `scripts/technical-report/manual-findings.json` (`man:avkk-can-write-execute`) und in `PROJECT-STATUS.yaml`

## 3. Dokumentation

- **ADR-0025** (`docs/ADR/0025-avkk-umsetzung-07b.md`): tatsächliche Tabellen, Reference-Data-Modell, Services, RLS-/RBAC-Modell, polymorphe Subject-Zuordnung, Local-First-Abgrenzung, Cache, Audit, `avkk_can_write`, Kompromisse, verworfene Alternativen (B/C), Migrationspfad zu echter FK-Integrität. Eintrag in `docs/ADR/README.md`.
- **`docs/DATA-SCHEMA.md`**: neuer Abschnitt „Supabase-Datenbankstand" mit Reference-Data- und AVKK-Tabellen, Spalten, PK/FK, Constraints, Indizes, RLS-Policies, Grants, Funktionen, Audit-Trigger, polymorphe Referenz und deren Integritätsgrenze. Nur real Vorhandenes.
- **`CHANGELOG.md`**: neuer Block `## 1.52.0 - 2026-08-10` (bestimmt automatisch `DASHBOARD_VERSION`).
- **Handbuch** (`src/lib/help-documentation.ts`): Kapitel „AVKK — technische Grundlage" und „Referenzdaten — Pflege und Berechtigungen" ergänzen/aktualisieren (`lastUpdated`). Keine AVKK-Arbeitsplatz-UI beschreiben; bekannte Einschränkungen benennen.
- **`docs/PROJECT-STATUS.yaml`**: Version 1.52.0, Sprint 07B nach `completedSprints`, `currentSprint`/`nextSprint` = 08, Phase-2-Fortschritt, Testanzahl, Gates, Risiko „polymorphe Referenz ohne FK", accepted finding `avkk_can_write`, MVP-Fortschritt.

## 4. Prüfbericht und Quality Gates

Prüfbericht neu erzeugen (`report:technical`), die `avkk_can_write`-Warnung erscheint sichtbar als begründete Ausnahme, nicht als „bestanden".

Auszuführen und mit Zahlen zu berichten:

```text
bun run test            bun run typecheck       bun run lint
bun run lint:no-console bun run docs:check      bun run project-status:check
bun run build           bun run rbac:check      bun run test:security
bun run test:debt       bun run report:technical
```

Abschluss: MVP-Statusbericht und Abschlussbericht (13 Punkte) mit Go/No-Go für Sprint 08 — ohne pauschale Erfolgsmeldung, Gates werden einzeln mit Ergebnis ausgewiesen.

## Risiken

- Findet ein Gate reale Fehler (z. B. Tech-Debt-Schwellen durch neue Module), wird das gemeldet und behoben, nicht durch Schwellenanpassung kaschiert.
- Keine Datenbankänderungen geplant; sollte sich bei der Schema-Dokumentation eine echte Lücke zeigen (fehlender Index/Grant), wird sie als eigene Migration vorgeschlagen, nicht stillschweigend eingebaut.
