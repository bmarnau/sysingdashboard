# Release-Governance: sichere Einbindung von Lovable (Issue #53)

Analyse und Regelwerk — keine Code-, DB-, Auth-, Deployment- oder GitHub-Änderung.

Ausgangslage (bestätigt aus dem Repository-Stand): MVP/F-11/F-18 abgeschlossen,
oberste Version im `CHANGELOG.md` ist 1.59.6, Doku-Sync-Gates (`docs:check`,
`project-status:check`) und der mehrstufige CI-Workflow inkl. Quality Gate sind
vorhanden. Der Governance-Rahmen ist bereits in `docs/AI-ASSISTED-DEVELOPMENT-WORKFLOW.md`
und ADR-0029 beschrieben; offen ist ausschließlich die technische Durchsetzung
(Branch Protection auf `main`).

## 1. Wie Lovable sicher eingebunden wird

Lovable arbeitet ausschließlich als *Implementierer eines vorab definierten,
eng geschnittenen Auftrags* — nie als Merger, nie als Release-Instanz.

Ablauf pro Lauf:

```text
Auftrag (Scope + Ausgangs-SHA + Zielbranch)
  -> Lovable-Plan (read-only, Freigabe durch Bernd)
  -> Implementierung auf getrenntem Branch/Variant
  -> lokale Gates im Lovable-Sandkasten (lint, typecheck, tests, docs:check)
  -> Abschlussbericht mit Datei-Diff-Liste
  -> Push/PR-Erzeugung und Merge NUR durch Bernd (GitHub-UI/CLI)
```

Kernpunkt: Solange `main` ungeschützt ist, ersetzt der Prozess die fehlende
Technik. Lovables Git-Sync muss deshalb auf einen Nicht-`main`-Branch zeigen,
bevor ein schreibender Lauf gestartet wird — das ist vor jedem Lauf explizit zu
verifizieren, nicht anzunehmen.

## 2. Sind Project Variants der richtige Weg?

Ja, mit Einschränkung. Variants sind der einzige Lovable-eigene Mechanismus, der
Schreibvorgänge zuverlässig von `main` fernhält, ohne auf externe Branch-Auswahl
zu vertrauen.

Bewertung:

- Geeignet für: abgegrenzte Feature-/Fix-Läufe, UI-Arbeit mit Preview-Bedarf,
  parallele Alternativen zu einer Lösung.
- Nicht geeignet als Ersatz für: Branch Protection, Review, CI-Gates. Ein Variant
  ist eine Arbeitsumgebung, kein Freigabemechanismus.
- Risiko: Variant-Drift gegenüber `main`. Gegenmaßnahme — ein Variant lebt für
  genau einen Auftrag und wird nach Merge verworfen, nicht wiederverwendet.
- Empfehlung: Variant pro Auftrag, Namensschema analog Branch
  (`fix/<issue>-<kurz>`, `feature/<issue>-<kurz>`), Ausgangs-SHA im
  Abschlussbericht dokumentiert.

Alternative, die bewusst *nicht* empfohlen wird: Lovable direkt auf `main`
laufen lassen und sich auf nachträgliches Review verlassen. Das ist genau die
Lücke aus Issue #53.

## 3. Feste Project-Knowledge-Regeln

Vorschlag für dauerhaft gespeicherte Regeln (Projekt-Memory / Knowledge):

1. GitHub ist Source of Truth; Ausgangs-SHA vor jedem Lauf nennen und prüfen.
2. Keine regulären Writes auf `main`. Jeder schreibende Auftrag benötigt einen
   ausdrücklich genannten Branch/Variant; ohne diese Angabe wird nicht geschrieben.
3. Ein Auftrag = ein Scope = ein Branch. Kein Mitfixen unbeauftragter Befunde;
   Zusatzbefunde werden nur berichtet.
4. Doku-Sync-Pflicht (bereits Core): `CHANGELOG.md` + Handbuch-Topic + Version in
   `PROJECT-STATUS.yaml` und Entwicklungstagebuch synchron; `docs:check` vor Abschluss.
5. Auth, RBAC, RLS und Supabase-Semantik nur bei ausdrücklichem Scope ändern —
   nie als Nebeneffekt eines UI- oder Test-Fixes.
6. Trennung von Fachlogik, Authentifizierung, Datenzugriff und provider-spezifischer
   Implementierung erhalten; keine zweite Rechte-/Fachlogik einführen.
7. Portabilität wahren: keine unersetzbare Lovable-/Cloud-Laufzeitabhängigkeit;
   Docker-/Azure-/Entra-Migrationspfad bleibt offen.
8. Keine Secrets in Code, Tests, Doku, Reports oder Chat; keine produktiven
   Tokens/Keys anzeigen oder erzeugen.
9. Tests laufen offline und ohne produktive Dienste (ADR-0029).
10. Jeder Lauf endet mit Abschlussbericht und stoppt — keine selbstständigen
    Folgeänderungen.

## 4. Was Lovable ausdrücklich vermeiden soll

- Direkte Commits/Pushes auf `main`; Merges, Rebases, Force-Pushes, Tag-/Release-Erzeugung.
- Branch-Protection- oder Repository-Einstellungen ändern (Issue #53 ist Bernds Aufgabe).
- Automatisches „Try to fix"-Schleifen nach CI-Fehlern ohne bestätigte Root Cause.
- Ungefragte Refactorings, Abhängigkeits-Upgrades, Formatier-Sweeps über fremde Dateien.
- Änderungen an Migrations-/RLS-/Rollenlogik oder Seed-Daten ohne expliziten Auftrag.
- Abschwächen von Tests, Gates, Lint-Regeln oder Security-Checks, um grün zu werden.
- Findings eigenmächtig auf PASS setzen (z. B. F-Nummern) — Abnahme ist manuell.
- Löschen oder Umschreiben historischer ADRs und Prüfberichte.
- Anzeigen von Backend-Projekt-IDs, Dashboard-Links, Service-Role-Keys.

## 5. Abnahmekriterien pro Lovable-Lauf

Ein Lauf gilt erst als abnahmefähig, wenn alle Punkte erfüllt und im
Abschlussbericht belegt sind:

- Zielbranch/Variant war vor dem ersten Write verifiziert; `main` unberührt.
- Ausgangs-SHA und End-SHA genannt; Diff auf die beauftragten Dateien begrenzt.
- Gates lokal grün mit realen Zahlen: Prettier, ESLint, `typecheck`, Unit/Components,
  `docs:check`, `project-status:check`, `rbac:check`, no-console, Security, Build;
  E2E bei Änderungen an Auth, Routing, Rollen, UI-Flows oder Test-Harness.
- Versionen konsistent: `CHANGELOG.md` (oberster Eintrag) = `PROJECT-STATUS.yaml`
  = Entwicklungstagebuch; Handbuch-Topic aktualisiert.
- Keine neuen Secrets, keine neuen Cloud-Abhängigkeiten, keine RBAC-/RLS-Ausweitung
  außerhalb des Scopes.
- Restrisiken, neu entdeckte Abweichungen und exakt ein empfohlener nächster
  Schritt sind benannt.
- Merge-Entscheidung bleibt bei Bernd: PR grün inkl. „14 · Technical Report &
  Quality Gate", Security-Gate grün, Merge mit Expected-Head-SHA.

## 6. Empfohlener nächster Schritt

1. Branch Protection für `main` aktivieren (Required Checks: Security + „14 ·
   Technical Report & Quality Gate", keine Force-Pushes, PR erforderlich) — Issue #53.
2. Erst danach Lovable wieder für schreibende Aufträge einsetzen; bis dahin nur
   Analyse-/Plan-Läufe.
3. Optional und ohne Fachwirkung: die Regeln aus Abschnitt 3–5 als Projekt-Memory
   und als kurzen Abschnitt in `docs/AI-ASSISTED-DEVELOPMENT-WORKFLOW.md` verankern —
   das wäre der einzige Schreibvorgang, den ich vorschlage, und auch der gehört
   auf einen eigenen Branch.

Kritische Anmerkung: Punkt 1 ist die eigentliche Lösung. Alle Regeln in diesem
Dokument sind Kompensation für eine fehlende technische Sperre und damit nur so
verlässlich wie ihre manuelle Einhaltung.
