# ADR-0033: Regelmäßige GitHub-Repository-Governance und Arbeitsvorratsprüfung

- **Status**: Accepted
- **Datum**: 2026-09-01
- **Ergänzt**: ADR-0029

## Kontext

GitHub ist die maßgebliche Quelle für Code, Dokumentation und den operativen Entwicklungsstand des Sysing Dashboards. Während der bisherigen Entwicklung zeigte sich, dass nicht nur der aktuelle `main`-Stand, sondern auch der **Arbeitsvorrat im Repository** regelmäßig geprüft werden muss.

Offene Issues, Pull Requests, fehlgeschlagene oder veraltete GitHub-Actions-Läufe sowie überholte Workflow-Konfigurationen können sonst trotz fachlich korrekter Produktarbeit unbemerkt liegen bleiben. Ebenso können erledigte Arbeiten in offenen Issues weitergeführt, überholte PRs versehentlich wieder aufgegriffen oder neue Aufgaben nur im Chat bzw. in Planungsdokumenten festgehalten werden, ohne einen nachvollziehbaren GitHub-Arbeitsauftrag zu erhalten.

ADR-0029 verpflichtet bereits zur Branch-/Writer-Governance, zur Prüfung des aktuellen `main` vor Entwicklungsaufträgen und zur Neubewertung von Branches vor Merge. Es fehlt jedoch eine eigenständige, regelmäßige Repository-Hygiene als Governance-Kontrolle.

## Entscheidung

### 1. Regelmäßige Repository-Prüfung ist verbindlicher Governance-Schritt

Während aktiver Entwicklung wird das Repository **mindestens arbeitstäglich** geprüft. In längeren Entwicklungs- oder Projektpausen erfolgt die Prüfung mindestens vor der Wiederaufnahme von Arbeiten sowie vor Sprint-, Release- oder Architekturentscheidungen.

Die Prüfung darf manuell oder automatisiert angestoßen werden. Die Governance-Regel darf jedoch nicht von einem einzelnen externen Dienst oder einer bestimmten Chat-/Agentenplattform abhängen.

### 2. Mindestumfang der Prüfung

Die Prüfung umfasst mindestens:

#### Issues
- offene Issues auf Aktualität und fachliche Relevanz prüfen,
- erledigte Arbeiten erkennen, deren Issue noch offen ist,
- überholte, doppelte oder widersprüchliche Issues kennzeichnen,
- Blocker, Abhängigkeiten und fehlende nächste Schritte erkennen,
- wichtige Arbeit ohne zugehöriges Issue identifizieren,
- Reihenfolge gegen Gesamtplan und aktuelle Prioritäten prüfen.

#### Pull Requests
- offene PRs einschließlich Draft-/Ready-Status prüfen,
- Mergeability und Branch-Drift gegen aktuellen `main` prüfen,
- laufende, fehlgeschlagene oder veraltete Checks erkennen,
- überholte bzw. superseded PRs nicht blind weiterführen,
- offene Review-Threads und fehlende Abschlussnachweise berücksichtigen.

#### GitHub Actions und Workflow-Runs
- fehlgeschlagene, abgebrochene, dauerhaft wartende oder wiederholt auffällige Runs prüfen,
- wiederkehrende Fehler nicht als Einzelereignis ignorieren,
- Security-, CI- und Quality-Gate-Ergebnisse auf aktuellem Head einordnen,
- bei relevanten Abweichungen ein nachvollziehbares Follow-up erzeugen.

#### Workflow-Definitionen und Actions
- `.github/workflows/*` regelmäßig auf Aktualität prüfen,
- veraltete/deprecated Actions oder Runner-Versionen erkennen,
- unnötige, doppelte oder deaktivierte Workflows prüfen,
- Berechtigungen, Trigger, Secrets-Nutzung und Supply-Chain-Risiken berücksichtigen,
- keine Warnung allein deshalb akzeptieren, weil der Workflow bisher noch funktioniert.

#### Repository-Gesamtzustand
- verwaiste Branches bzw. Alt-Arbeit berücksichtigen,
- Widersprüche zwischen ADRs, Issues, Gesamtplan, Checkpoint und `main` erkennen,
- sicherstellen, dass abgeschlossene Änderungen dokumentiert und offene Folgearbeiten auffindbar sind.

### 3. Findings werden priorisiert, nicht automatisch verändert

Die regelmäßige Prüfung ist grundsätzlich **read-only**.

Sie darf Findings sammeln, klassifizieren und konkrete nächste Aktionen empfehlen. Sie darf jedoch nicht automatisch:
- Issues schließen oder umschreiben,
- Pull Requests mergen oder schließen,
- Branches löschen,
- Workflow-Dateien ändern,
- Code oder Datenbank verändern.

Schreibende Maßnahmen bleiben explizite, nachvollziehbare Einzelentscheidungen nach den bestehenden Branch-, PR-, Security- und Datenbank-Governance-Regeln.

### 4. Priorisierung der Findings

Findings werden mindestens in folgende Kategorien eingeordnet:

1. **BLOCKER** — verhindert aktuell Merge, Release, Security-Freigabe oder fachliche Fortsetzung.
2. **AKTION ERFORDERLICH** — sollte im aktiven Arbeitszyklus bearbeitet werden.
3. **DRIFT / KONSOLIDIERUNG** — Status, Dokumentation oder Planung ist widersprüchlich bzw. veraltet.
4. **BEOBACHTEN** — kein unmittelbarer Eingriff nötig, aber wiederkehrend kontrollieren.

Security-, Berechtigungs-, Secrets-, RLS-/RBAC-, Supply-Chain- und Branch-Protection-Findings erhalten Vorrang vor rein kosmetischer Repository-Hygiene.

### 5. Ergebnis der Prüfung

Das Ergebnis soll kompakt mindestens enthalten:
- neue oder geänderte offene Issues/PRs,
- fehlgeschlagene oder noch laufende relevante Actions-Runs,
- erkannte Blocker,
- Status-/Planungsdrift,
- wichtigste konkrete nächste Schritte.

Wenn die Prüfung zeigt, dass ein dauerhaft relevantes Arbeitspaket fehlt, wird nach fachlicher Bestätigung ein GitHub-Issue angelegt. Chat-Nachrichten allein gelten nicht als dauerhafte Backlog-Quelle.

### 6. Beziehung zu bestehender Governance

ADR-0033 ergänzt ADR-0029 und ändert dessen Branch-/Writer-/CI-Regeln nicht.

Weiterhin gilt insbesondere:
- GitHub `main` ist Source of Truth,
- keine regulären direkten Änderungen auf `main`,
- Integration über Branch + PR + Required Checks,
- externer Schreibzugriff wird unabhängig über GitHub-Diff und Commit geprüft,
- Datenbankänderungen zusätzlich gemäß `docs/DATABASE-CHANGE-GOVERNANCE.md`.

Die regelmäßige Repository-Prüfung ist damit ein **Früherkennungs- und Arbeitssteuerungsmechanismus**, keine alternative Freigabeinstanz.

## Alternativen

- **Nur bei konkretem Entwicklungsauftrag in GitHub schauen**: verworfen, weil liegengebliebene PRs, Actions-Fehler und Backlog-Drift dadurch unentdeckt bleiben können.
- **Vollautomatische Repository-Bereinigung**: verworfen, weil automatische Schreib-/Merge-/Close-Aktionen Governance und Nachvollziehbarkeit schwächen würden.
- **Nur Issues und PRs prüfen**: verworfen, weil Fehler und technische Drift häufig zuerst in Actions-Runs oder Workflow-Definitionen sichtbar werden.
- **Prüfung an ein einzelnes KI-/SaaS-Werkzeug binden**: verworfen, weil die Governance auch bei Toolwechsel und Docker-/On-Prem-Betrieb gelten muss.

## Konsequenzen

- Positiv: offene Arbeit und technische Blocker werden früher sichtbar.
- Positiv: Issues, PRs und tatsächlicher Repository-Stand driften weniger auseinander.
- Positiv: wiederkehrende CI-/Workflow-Probleme werden systematisch statt zufällig behandelt.
- Positiv: Gesamtplan, Checkpoint und GitHub-Arbeitsvorrat bleiben besser synchron.
- Positiv: unterstützt nachvollziehbare KI-gestützte Entwicklung ohne automatische Schreibautonomie.
- Negativ: zusätzlicher regelmäßiger Governance-Aufwand.
- Negativ: Findings müssen weiterhin fachlich bewertet werden; die Prüfung ersetzt keine Architektur-, Security- oder Review-Entscheidung.

## Trust-Boundary / Security-Note

- Die Prüfung benötigt grundsätzlich nur lesenden Zugriff.
- Keine Secrets, Tokens oder Service-Role-Keys dürfen für die reine Repository-Prüfung offengelegt werden.
- Automatisierte Prüfungen dürfen keine Schutzregeln umgehen und keine Schreibrechte voraussetzen, wenn read-only ausreicht.
- Ein grüner Workflow-Run ersetzt keine fachliche, RBAC-/RLS- oder Security-Abnahme dort, wo diese ausdrücklich erforderlich ist.
