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

Ist Codex technisch nicht verfügbar, zum Beispiel wegen fehlender Credits, darf ohne Warte- oder Blockierzustand auf das **kleinstmögliche geeignete Fallback-Werkzeug** gewechselt werden. Je nach Fehlerart sind dies insbesondere GitHub, Lovable, GitHub Copilot/VS Code oder eine vorhandene lokale Toolchain. Die nachfolgenden Minimal-Fix-, Sicherheits- und Verifikationsregeln gelten unverändert.

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

Auch bei Verwendung von Codex oder eines Fallback-Werkzeugs gelten unverändert alle Projektregeln:

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

### 5.1 Verhältnismäßigkeits- und Minimal-Fix-Regel

Eindeutig lokalisierte Formatter-, Prettier-, Lint-, Syntax-, Markdown-, Dokumentations- oder vergleichbare CI-Kleinfehler werden mit dem **geringstmöglichen technischen und organisatorischen Aufwand** behoben.

Für solche Fehler gilt insbesondere:

- zuerst die konkrete Fehlermeldung und die betroffene Datei bzw. den betroffenen Check isolieren,
- nur die kleinste nachweislich erforderliche Änderung durchführen,
- keine Architektur-, Security-, RBAC-, RLS-, Datenbank- oder Vollabnahme auslösen, wenn diese Bereiche von der Änderung nicht berührt werden,
- Prüfungen nur auf tatsächlich betroffene Bereiche ausweiten oder wenn der Minimal-Fix den Fehler nicht beseitigt,
- keine unrelated Refactorings, Bereinigungen oder Zusatzverbesserungen an einen Kleinfehler anhängen.

Beispiel: Ein reiner Prettier-Fehler in einer Markdown-Datei wird als Formatierungsproblem behandelt: betroffene Datei formatieren, relevanten Check ausführen, Diff prüfen, committen, CI erneut laufen lassen.

### 5.2 15–20-Minuten-Eskalationsregel

Wird ein als Kleinfehler klassifizierter Fehler nicht innerhalb von ungefähr **15 bis 20 Minuten** gelöst oder eindeutig eingegrenzt, wird die laufende Vorgehensweise bewusst gestoppt.

Vor weiterem Aufwand werden mindestens neu bewertet:

- Fehlerklassifikation: Ist es wirklich noch ein Kleinfehler?
- Werkzeugwahl: Ist Codex, GitHub, Lovable, Copilot/VS Code oder die lokale Toolchain geeigneter?
- Entwicklungsumgebung: Wird gerade in der richtigen Umgebung gearbeitet?
- Root Cause: Liegt eine bestätigte Ursache vor oder wird nur symptomatisch repariert?
- Scope: Ist die Änderung noch minimal oder ist der Auftrag unbeabsichtigt gewachsen?

Erst nach dieser Neubewertung wird weitergearbeitet. Ziel ist ausdrücklich, stundenlange Prozessschleifen bei mechanischen Fünf-Minuten-Fehlern zu vermeiden.

### 5.3 Passende Entwicklungsumgebung zuerst bestimmen

Vor operativen Reparaturbefehlen wird kurz geprüft, **wo das Projekt tatsächlich entwickelt und getestet wird**.

Für Sysing Dashboard gilt derzeit insbesondere:

- GitHub ist die maßgebliche Codebasis,
- Lovable ist eine zentrale Entwicklungs- und Referenzumgebung,
- eine lokale Installation oder ein lokaler Git-Clone darf genutzt werden, ist aber keine allgemeine Voraussetzung,
- eine vorhandene lokale Bun-/Node-Toolchain darf für reproduzierbare Checks genutzt werden, wenn ein echter Repository-Checkout vorhanden ist,
- das bloße Vorhandensein von Bun auf einem Endgerät macht dieses Gerät nicht automatisch zur maßgeblichen Entwicklungsumgebung.

Vor Befehlen wie `bun`, `bunx`, `npm`, `npx` oder `git diff` ist daher sicherzustellen, dass die zugehörige Toolchain und – für Git-Kommandos – ein echter Repository-Working-Tree vorhanden sind.

### 5.4 Aufwand muss zum Risiko passen

Governance soll Sicherheit und Qualität erhöhen, nicht mechanische Kleinstfehler unnötig vergrößern.

Daher gilt:

- **niedriges Änderungsrisiko + klar lokalisierte Ursache → kleiner Reparatur- und Prüfpfad**,
- **höheres Änderungsrisiko oder Security-/Daten-/Berechtigungsbezug → entsprechend tiefer Prüfpfad**,
- die Tiefe der Prüfung richtet sich nach der tatsächlichen Auswirkung der Änderung, nicht nach einem pauschalen Maximalprozess.

Diese Verhältnismäßigkeit hebt keine verbindlichen Release-, PR-, CI- oder Security-Gates auf; sie verhindert lediglich unnötige Prüfungen außerhalb des betroffenen Scopes.

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

Bei einem Fallback ohne Codex wird derselbe Abschlussbericht sinngemäß erstellt, soweit die verwendete Umgebung die jeweiligen Nachweise unterstützt.

## 7. Freigaberegel

Ein Git- oder CI-Fehler gilt nicht allein deshalb als behoben, weil Codex oder ein anderes Werkzeug einen Fix erstellt oder lokale Tests bestanden haben.

Vor einer endgültigen Freigabe werden der tatsächliche GitHub-Stand, der vollständige Diff, die relevanten CI-/Security-Gates, die Dokumentation und die Git-Hygiene unabhängig geprüft.

Diese Regel ist ab 2026-09-13 für das gesamte Projekt Sysing Dashboard verbindlich.
