# Verbindliche Projektregel: Codex bei Git- und CI-Fehlern

Stand: 2026-09-13  
Status: verbindliche Arbeitsregel für das gesamte Projekt Sysing Dashboard

## 1. Geltungsbereich

Diese Regel gilt projektweit für alle Entwicklungsphasen, Branches, Pull Requests, Sprints und zukünftigen Erweiterungen des Sysing Dashboard.

Sie ergänzt den bestehenden KI-gestützten Entwicklungsworkflow und ist unabhängig davon anzuwenden, ob der Fehler durch ChatGPT, Lovable, VS Code, Copilot, lokale Entwicklung oder GitHub Actions sichtbar wird.

## 2. Verbindliche Werkzeugregel

Bei Git-, Branch-, Pull-Request-, Merge- und CI-Fehlern wird **Codex als bevorzugtes Werkzeug für die technische Fehleranalyse und Korrektur eingesetzt**, sofern der Fehler mit Repository-Zugriff, lokalem Checkout oder einer Codex-Arbeitsumgebung sinnvoll reproduzierbar und behebbar ist.

Dies umfasst insbesondere:

- fehlgeschlagene GitHub-Actions-/CI-Läufe,
- Merge- und Branch-Konflikte,
- fehlerhafte oder inkonsistente Commits,
- Formatter-, Prettier-, Lint- und TypeScript-Fehler,
- Unit-, Komponenten-, Integrations- und E2E-Testfehler,
- fehlerhafte Git-Hygiene,
- ungewollte oder nicht zuordenbare Dateiveränderungen,
- Probleme mit Commit-, Branch- oder PR-Konsistenz,
- reproduzierbare Build- und Quality-Gate-Fehler.

## 3. Rollenverteilung

### Codex

Codex übernimmt bevorzugt die operative technische Schleife:

1. Fehler reproduzieren,
2. Root Cause bestimmen,
3. kleinstmögliche sichere Änderung umsetzen,
4. relevante lokale Tests und Quality Gates ausführen,
5. Diff und Git-Status prüfen,
6. Commit auf dem vorgesehenen Nicht-main-Branch erstellen,
7. den erzeugten GitHub-CI-Lauf prüfen und bei weiteren Fehlern erneut ursachenbezogen vorgehen.

### ChatGPT

ChatGPT bleibt für die übergeordnete Steuerung und unabhängige Abnahme verantwortlich, insbesondere für:

- Architekturentscheidungen,
- Security-Grenzen,
- RBAC und RLS,
- Supabase- und Provider-Grenzen,
- Scope- und Nicht-Scope-Definition,
- Review von Codex-Ergebnissen,
- unabhängige Prüfung von Diff, Branch, Commit und PR,
- Dokumentations-, Status- und Versionskonsistenz,
- Git-Hygiene und Freigabeempfehlung.

Ein Codex-Abschlussbericht ersetzt keine unabhängige Prüfung.

### GitHub Copilot / VS Code

Copilot und VS Code können für kleine interaktive Einzelkorrekturen genutzt werden. Bei einer echten Git-/CI-Fehlerschleife mit mehreren Prüf- und Korrekturschritten hat Codex jedoch Vorrang, sofern technisch verfügbar und geeignet.

## 4. Sicherheits- und Governance-Grenzen

Auch bei Verwendung von Codex gelten unverändert alle Projektregeln:

- keine reguläre direkte Änderung auf `main`,
- jede schreibende Änderung auf einem eindeutig benannten Branch,
- Integration ausschließlich über Pull Request und vorgesehene CI-/Security-Gates,
- keine produktiven Schlüssel, Tokens, Passwörter oder Service-Role-Keys in Prompts, Code oder Dokumentation,
- keine ungefragten RBAC-, RLS-, Grant-, Auth-, Supabase- oder Datenbankänderungen,
- keine fachfremden Zusatzänderungen,
- keine eigenmächtige Freigabe von Findings oder Status auf PASS/CLOSED,
- GitHub bleibt Source of Truth.

## 5. Fehlerbehebungsprinzip

Für Git- und CI-Fehler gilt verbindlich:

**erst Root Cause, dann minimale Korrektur, dann vollständige relevante Verifikation.**

Automatische oder wiederholte „Try to fix“-Schleifen ohne bestätigte Ursache sind zu vermeiden.

## 6. Abschlussbericht

Jeder Codex-Auftrag zu einem Git- oder CI-Fehler endet mit einem strukturierten Abschlussbericht mit mindestens:

- Ausgangsfehler,
- Root Cause,
- geänderte Dateien,
- ausgeführte Tests und Ergebnisse,
- Commit-SHA,
- Branch und PR,
- GitHub-CI-Lauf und Status,
- `git status`,
- `git diff --check`,
- verbleibende Risiken oder offene Punkte.

## 7. Freigaberegel

Ein Git- oder CI-Fehler gilt nicht allein deshalb als behoben, weil Codex einen Fix erstellt oder lokale Tests bestanden haben.

Vor einer endgültigen Freigabe werden der tatsächliche GitHub-Stand, der vollständige Diff, die relevanten CI-/Security-Gates, die Dokumentation und die Git-Hygiene unabhängig geprüft.

Diese Regel ist ab 2026-09-13 für das gesamte Projekt Sysing Dashboard verbindlich.
