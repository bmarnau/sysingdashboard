# ADR-0029: CI-, Test- und Release-Governance für parallele KI-gestützte Entwicklung

- **Status**: Accepted
- **Datum**: 2026-08-21
- **Ergänzt**: ADR-0009, ADR-0018
- **Supersedes teilweise**: ADR-0012, Abschnitt zum rein clientseitigen Rollen-Seeding

## Kontext

Während der MVP-Härtung in Sprint 09C traten mehrere CI-Fehler nacheinander auf, obwohl große Teile der Anwendung fachlich unverändert blieben. Die Fehler lagen überwiegend an Drift zwischen Testumgebung, Dokumentations-/Versionsmetadaten, Report-Schemata und der inzwischen auf Supabase umgestellten Authentifizierungsarchitektur.

Zusätzlich arbeiteten zeitweise mehrere Werkzeuge parallel am Repository (Lovable, GitHub/Copilot und ChatGPT). Dadurch konnten funktional sinnvolle Einzeländerungen ältere Branches und Pull Requests überholen. Frühere CI-Abbrüche verdeckten nachgelagerte Fehler; nach deren Behebung wurden weitere bereits vorhandene Inkonsistenzen sichtbar.

Beobachtete Fehlerklassen:

- CI verwendete einen veralteten Typecheck-Aufruf statt des projektdefinierten Scripts.
- Unit-/Coverage-Tests waren implizit von lokaler Supabase-Konfiguration abhängig.
- E2E-Rollen-Seeding basierte noch auf historischen `localStorage`-Schlüsseln, obwohl Session, Profil und Rolle inzwischen aus Supabase stammen.
- Versionen drifteten zwischen `CHANGELOG.md`, `docs/PROJECT-STATUS.yaml` und `docs/ENTWICKLUNGSTAGEBUCH.md`.
- Der Testreport konsumierte ein veraltetes `tech-debt.json`-Schema.
- Mehrere offene Branches basierten auf einem älteren `main` und wurden durch direkte Folgeänderungen divergent.

Ziel ist, diese Fehlerklassen strukturell zu verhindern, ohne den MVP durch unnötige Plattform- oder Tool-Abhängigkeiten zu verkomplizieren.

## Entscheidung

### 1. Ein Source-of-Truth-Prinzip je Information

Eine fachliche oder technische Information darf nicht unkontrolliert an mehreren Stellen manuell gepflegt werden.

Für Release-/Versionsinformationen gilt:

- `CHANGELOG.md` ist die führende sichtbare Release-Historie.
- `docs/PROJECT-STATUS.yaml` und das Entwicklungstagebuch müssen mit der aktuellen Release-Version synchron sein.
- CI-Prüfungen wie `docs:check` und `project-status:check` sind verbindlich und dürfen nicht umgangen werden.
- Künftige Release-Automatisierung soll Versionsabgleiche möglichst aus einer zentralen Version ableiten oder in einem einzigen synchronisierenden Schritt aktualisieren.

### 2. Projektdefinierte Befehle statt ad-hoc Tool-Aufrufe

CI ruft für zentrale Gates ausschließlich versionierte Projekt-Scripts aus `package.json` auf, z. B. `bun run typecheck`, statt nicht gebundene Registry-/CLI-Aufrufe zu verwenden.

Neue oder geänderte Gates werden zuerst lokal bzw. in einer isolierten Testumgebung gegen genau denselben Projektbefehl geprüft.

### 3. Tests sind standardmäßig offline und nicht-produktiv

Unit-, Komponenten-, Security-, A11y- und E2E-Tests dürfen ohne ausdrückliches Live-Gate keine produktiven externen Dienste ansprechen.

Für Supabase gilt:

- Unit-/Komponententests verwenden nicht geheime Testkonfiguration und einen isolierten Client-Stub bzw. gezielte Mocks.
- Fehlende lokale `.env`-Dateien dürfen Tests nicht verändern.
- Playwright verwendet synthetische Supabase-Sessions und synthetische Rollen-/Profilantworten.
- Die Anwendung durchläuft im E2E-Test weiterhin den normalen produktiven Auth-Pfad (`auth.getSession/getUser`, `profiles`, `user_roles`, Account-Status); nur die externe HTTP-Grenze wird gemockt.
- Requests an reale Supabase-Hosts werden im E2E-Harness blockiert.
- Es werden keine produktiven URLs, JWTs, Benutzer, Publishable-/Secret-/Service-Role-Keys in Fixtures oder Dokumentation gespeichert.

Damit ist die historische Entscheidung aus ADR-0012 zum reinen `localStorage`-Rollen-Seeding für die aktuelle Auth-Architektur überholt.

### 4. Schema-Verträge zwischen Report-Producern und -Consumern

Maschinenlesbare Test-/Report-Artefakte gelten als versionierte Verträge.

- Neue oder geänderte JSON-Strukturen sollen eine `schemaVersion` tragen, sofern das Artefakt zwischen getrennten Modulen/Scripts konsumiert wird.
- Producer-Änderungen müssen gemeinsam mit Consumer-Anpassung oder einem rückwärtskompatiblen Parser geliefert werden.
- Mindestens ein Contract-/Regressionstest muss sicherstellen, dass der zentrale Prüfbericht die aktuelle Artefaktform lesen kann.
- Ein fehlendes optionales Feld darf nicht ungeprüft mit Zugriffen wie `.length` zu einem CI-Abbruch führen.

### 5. Branch-/Writer-Governance

GitHub `main` bleibt die maßgebliche Quelle. Für reguläre Entwicklungsarbeit gilt:

- eine fachliche Änderung = ein aktiver Branch/Variant = ein verantwortlicher Schreiber,
- parallele KI-Werkzeuge bearbeiten nicht gleichzeitig dieselben Dateien bzw. denselben Scope,
- vor Beginn eines neuen Entwicklungsauftrags wird der aktuelle `main` geprüft,
- vor Merge wird der Branch gegen aktuellen `main` neu bewertet,
- divergierte Alt-PRs werden nicht blind gemergt; relevante Änderungen werden gezielt auf aktuellen `main` übertragen oder der PR als superseded geschlossen,
- direkte `main`-Änderungen bleiben auf klar begründete, kleine Release-/CI-Notfallkorrekturen beschränkt; Zielzustand ist PR-basierte Integration mit verpflichtenden Quality Gates.

### 6. Release-Härtung ist Feature-Freeze

Während eines formalen Release-Candidate-/Baseline-Laufs werden keine neuen Features oder unabhängigen Refactorings parallel begonnen.

Reihenfolge:

`Branch → Analyse → minimale Änderung → lokale/gezielte Tests → PR → vollständige CI → manuelle Abnahme falls erforderlich → Merge → main-CI → Baseline`

Schlägt ein Gate fehl, wird der erste fachlich relevante Fehler behoben. Nachgelagerte Fehler werden erst bewertet, wenn die Pipeline sie tatsächlich erreicht.

### 7. Preflight vor PR/Merge

Ein gemeinsamer Preflight soll mindestens die im Projekt vorhandenen Gates bündeln bzw. in derselben Reihenfolge prüfen:

- Format/Prettier,
- ESLint,
- TypeScript,
- `docs:check`,
- `project-status:check`,
- `rbac:check`,
- no-console,
- Unit/Components/Coverage,
- Security,
- Build,
- relevante Report-/Schema-Checks,
- E2E bei Änderungen an Auth, Routing, Rollen, UI-Flows oder Test-Harness.

Die konkrete Script-Bündelung darf später ergänzt werden; die fachliche Verpflichtung gilt bereits mit diesem ADR.

## Alternativen

- **CI schwächen oder Warnungen ignorieren**: verworfen. Die Fehlerkette hat reale Inkonsistenzen sichtbar gemacht; das Quality Gate ist Schutz, nicht Ursache des Problems.
- **Echte Supabase-Testinstanz für alle Tests**: verworfen. Höhere Laufzeitabhängigkeit, Secrets-/Netzwerkbedarf und geringere Reproduzierbarkeit.
- **Alte LocalStorage-Rollen-Fixtures weiterverwenden**: verworfen. Sie testen nicht mehr den produktiven Auth-/Rollenpfad.
- **Alle bestehenden ADRs rückwirkend ändern**: verworfen. Accepted ADRs bleiben historische Entscheidungen; Kurskorrekturen erfolgen über dieses Folge-ADR.
- **Mehrere KI-Agenten gleichzeitig auf `main` arbeiten lassen**: verworfen. Erzeugt schwer nachvollziehbare Kausalität und Branch-Drift.

## Konsequenzen

- Positiv: CI-Fehler werden früher und näher an ihrer Ursache sichtbar.
- Positiv: Tests bleiben unabhängig von Lovable Cloud und produktiven Supabase-Ressourcen.
- Positiv: Auth-/RBAC-E2E prüfen wieder denselben logischen Pfad wie Produktion.
- Positiv: Report-/Schemaänderungen werden als Verträge behandelt.
- Positiv: weniger divergierte Branches und weniger versehentliche Überschreibungen durch parallele KI-Werkzeuge.
- Positiv: unterstützt Docker-/On-Prem-Portabilität, weil Test- und Buildpfade keine unersetzbare Cloud-Laufzeit voraussetzen.
- Negativ: strengere Branch-/Gate-Regeln erhöhen kurzfristig den formalen Aufwand pro Änderung.
- Negativ: synthetische E2E-Grenzen ersetzen keinen separaten Live-/Preview-Smoke gegen die veröffentlichte Anwendung.
- Negativ: ein vollständig automatisierter Release-Sync/Preflight ist mit diesem ADR beschlossen, aber nicht zwingend vollständig implementiert; bis dahin bleiben die bestehenden Einzelchecks verbindlich.

## Trust-Boundary / Security-Note

- Keine produktiven Secrets, Tokens oder Service-Role-Keys in Testcode, Prompts, Reports oder ADRs.
- Synthetische Auth-Sessions dürfen nur im E2E-/Test-Harness existieren und dürfen keinen Test-Bypass im Produktivcode erfordern.
- UI-Rollentests ersetzen keine serverseitigen RBAC-/RLS-Negativtests.
- CI-/Report-Artefakte dürfen keine Zugangsdaten oder sensitiven Nutzdaten enthalten.
- Ein grüner synthetischer E2E-Lauf ist ein Regressionsnachweis für Anwendungspfad und Rollenlogik, aber kein Ersatz für die gesonderte manuelle Produktiv-/Preview-Abnahme.
