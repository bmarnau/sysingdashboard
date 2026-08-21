# KI-gestützter Entwicklungsworkflow — GitHub, ChatGPT, Lovable und lokale Werkzeuge

Stand: 2026-08-21  
Status: verbindliche Arbeitsregel für Sysing Dashboard

## 1. Ziel

KI-gestützte Entwicklungsarbeit soll nachvollziehbar, sicher und ressourcenschonend erfolgen. Lovable-Credits werden als knappe Entwicklungsressource behandelt. Unabhängig vom jeweils aktuellen Abrechnungsmodell gilt: Analyse, GitHub-Arbeit und Dokumentation werden nicht unnötig in kostenintensive Build-/Edit-Schleifen verlagert.

GitHub bleibt Source of Truth.

## 2. Werkzeug-Priorität

Für jede Aufgabe gilt folgende Reihenfolge:

1. **GitHub prüfen** — aktuellen Code-, Doku- und Commitstand feststellen.
2. **ChatGPT analysiert** — Ursache, Scope, Risiken, betroffene Dateien, Teststrategie und Abnahmekriterien vorab klären.
3. **GitHub-Arbeiten direkt über ChatGPT** — Dokumentation, Statuspflege, Roadmap, Prüfberichte und sonstige sichere Repository-Änderungen werden vorrangig direkt im Repository erledigt.
4. **Lokale Entwicklung / Codex / VS Code bevorzugen**, wenn eine Änderung ohne Lovable-spezifische Laufzeitfunktion sauber implementiert und getestet werden kann.
5. **Lovable nur gezielt einsetzen**, wenn Live-App, Lovable-Laufzeit, UI-Preview, plattformspezifische Funktionen oder eine dort sinnvollere technische Umsetzung erforderlich sind.
6. **Manuell abnehmen** — fachliche Oberflächen- und Rollenprüfungen werden außerhalb der Build-Schleife durchgeführt.
7. **GitHub nachprüfen** — tatsächlich erzeugten Commit, Diff, Version und Dokumentation unabhängig kontrollieren.

## 3. Regeln für Lovable-Prompts

Jeder Lovable-Prompt folgt verbindlich:

**Analysieren → minimal umsetzen → testen → dokumentieren → Abschlussbericht → warten.**

Zusätzlich gilt:

- Ausgangs-Commit und erwarteten aktuellen HEAD nennen.
- Bereits bestätigte Root Causes nicht erneut breit analysieren lassen.
- Betroffene Dateien und bestehende Architektur nennen, soweit bekannt.
- Scope und **Nicht-Scope** ausdrücklich festlegen.
- Bestehende RBAC-/RLS-/Providerregeln wiederverwenden, keine zweite Fach- oder Rechtelogik erzeugen.
- Zusammengehörige Änderungen mit derselben Root Cause in einem Prompt bündeln.
- Unabhängige Features nicht in einen großen Sammelprompt mischen.
- Konkrete Tests, Quality Gates und Abnahmekriterien vorgeben.
- Nach dem Abschlussbericht keine selbstständigen Folgeänderungen zulassen.
- Bei Abbruch trotzdem einen Zwischen-Abschlussbericht verlangen.

## 4. Neue Lovable-Unterhaltung statt Kontextballast

Sobald ein abgegrenzter Fix oder ein Feature abgeschlossen und in GitHub dokumentiert ist, soll für eine neue technische Aufgabe bevorzugt eine neue, fokussierte Lovable-Unterhaltung verwendet werden.

Der neue Prompt enthält den notwendigen Kontext kompakt selbst:

- Repository,
- Ausgangs-Commit,
- Ziel,
- bereits bekannte Analyseergebnisse,
- relevante Architekturregeln,
- Scope-Ausschlüsse,
- Tests und Abnahmekriterien.

Alte Chat-Historie darf nicht als Ersatz für eine reproduzierbare Aufgabenbeschreibung dienen.

## 5. Fehler- und „Try to fix“-Schleifen vermeiden

Bei einem fehlgeschlagenen Lovable-Lauf gilt:

1. Fehlermeldung, Abschlussbericht und neuen GitHub-Stand sichern.
2. Nicht reflexartig mehrfach „Try to fix“ oder ähnliche automatische Reparaturschleifen starten.
3. Fehler zunächst außerhalb der Lovable-Build-Schleife analysieren.
4. GitHub-Diff und betroffene Dateien prüfen.
5. Danach genau einen fokussierten Korrekturprompt mit bestätigter Root Cause erstellen.

Ziel ist nicht die minimale Zahl an Prompts um jeden Preis, sondern die minimale Zahl **unklarer oder wiederholter Build-Versuche**.

## 6. Planung ohne Build

Brainstorming, Architekturentscheidungen, Roadmap, Prompt-Entwurf und Fehleranalyse erfolgen grundsätzlich außerhalb eines Build-/Edit-Modus. Wenn Lovable einen reinen Chat-/Planungsmodus im verwendeten Plan anbietet, kann er dafür genutzt werden; erforderlich ist er nicht, da diese Arbeiten vorrangig in ChatGPT und GitHub stattfinden.

## 7. Lokale Entwicklung nach dem MVP

Mit wachsendem Projektumfang wird lokale Entwicklung wichtiger. Für kleine und klar abgegrenzte Codeänderungen ist nach Möglichkeit folgender Pfad vorzuziehen:

`GitHub → lokaler Branch/Workspace → Codex oder VS Code → lokale Tests/Gates → Commit/PR → GitHub-Prüfung`

Lovable bleibt Referenz für die veröffentlichte App und für Funktionen, bei denen seine Plattform einen echten Mehrwert bietet. Es soll keine technisch unersetzbare Entwicklungs- oder Laufzeitabhängigkeit entstehen.

## 8. Credit-Budget je Aufgabe

Vor einem Lovable-Prompt wird die Aufgabe gedanklich klassifiziert:

- **0 Lovable-Läufe:** reine Analyse, GitHub-Doku, Roadmap, Statuspflege, manuelle Abnahme.
- **1 gezielter Lovable-Lauf:** klar abgegrenzter Fix oder Feature mit bestätigtem Scope.
- **mehrere Lovable-Läufe:** nur wenn technische Unsicherheit, echte iterative UI-Abnahme oder mehrere voneinander abhängige Laufzeitschritte dies begründen.

Kann eine Aufgabe ohne Qualitätsverlust direkt über GitHub oder lokal erledigt werden, wird kein Lovable-Lauf verwendet.

## 9. Abschlussbericht als Übergabevertrag

Jeder substanzielle technische Schritt endet mit einem Abschlussbericht. Je nach Aufgabe enthält er:

- Aufgabe und Scope,
- Ausgangs- und End-Commit,
- Version,
- Root Cause bzw. Analyseergebnis,
- tatsächlich geänderte Dateien,
- Architektur-/Security-Entscheidungen,
- Tests und Gates mit realen Zahlen,
- Dokumentationsänderungen,
- Finding-Status,
- neu entdeckte Abweichungen,
- Restrisiken,
- MVP-/BSF-Reifegrad,
- manuellen Retest,
- exakt empfohlenen nächsten Schritt.

Der Abschlussbericht reduziert Folgekontext und ermöglicht den Wechsel in eine neue, kurze Unterhaltung ohne Wissensverlust.

## 10. Sicherheits- und Governance-Regeln

Unverändert verbindlich:

- keine produktiven Schlüssel, Tokens, Passwörter oder Service-Role-Keys in Prompts, Code oder Dokumentation,
- RBAC und RLS nicht durch reine UI-Logik ersetzen,
- Fachlogik, Authentifizierung, Datenzugriff und Provider-spezifische Implementierung getrennt halten,
- Änderungen testbar, dokumentiert, containerfähig und migrationsfähig halten,
- GitHub ist die maßgebliche Quelle für den aktuellen Stand.

## 11. Praktische Konsequenz für das laufende Projekt

Bis zur MVP-Baseline werden Lovable-Läufe nur noch verwendet, wenn ein technischer Abschluss-Gate-Lauf oder ein tatsächlich notwendiger Plattformtest nicht sinnvoll außerhalb von Lovable erbracht werden kann.

Die offene F-11-Abnahme ist manuelle Fachprüfung und verbraucht daher keine Lovable-Credits. GitHub-Dokumentation und formale Abzeichnung werden nach bestätigten Testergebnissen direkt im Repository gepflegt.
