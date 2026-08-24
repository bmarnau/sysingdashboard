# KI-gestützter Entwicklungsworkflow — GitHub, ChatGPT, Lovable und lokale Werkzeuge

Stand: 2026-08-24  
Status: verbindliche Arbeitsregel für Sysing Dashboard

## 1. Ziel

KI-gestützte Entwicklungsarbeit soll nachvollziehbar, sicher und ressourcenschonend erfolgen. Lovable-Credits werden als knappe Entwicklungsressource behandelt. Analyse, GitHub-Arbeit und Dokumentation werden nicht unnötig in kostenintensive Build-/Edit-Schleifen verlagert.

**GitHub bleibt Source of Truth.**

### 1.1 Schreibschutzregel für `main`

Für ChatGPT, Codex, Lovable und andere schreibende Werkzeuge gilt verbindlich:

- **keine direkte reguläre Änderung auf `main`,**
- jede schreibende Aufgabe erhält einen eindeutig benannten Branch bzw. eine nachweislich getrennte Variant,
- Integration erfolgt über Pull Request und die vorgesehenen CI-/Security-Gates,
- ein Plan-, Chat- oder Analysemodus eines externen Werkzeugs wird **nicht als read-only angenommen**,
- nach jedem externen Schreibvorgang werden GitHub-Commit, Branch und Diff unabhängig geprüft,
- ein direkter `main`-Write ist nur als bewusst autorisierte administrative Ausnahme zulässig und muss anschließend revisionssicher dokumentiert werden.

Technischer Branch Protection bzw. ein GitHub-Ruleset soll diese organisatorische Regel zusätzlich erzwingen. Bis dieser Schutz nachweislich aktiv ist, wird die Regel prozessual strikt eingehalten.

### 1.2 Nachgewiesener Lovable-Planmodus-Vorfall

Am 24.08.2026 wurde ein Lovable-Auftrag ausdrücklich als Plan-/Analyseauftrag ohne Code-, Auth-, DB-, Deployment- oder GitHub-Änderung gestartet. Trotzdem entstanden:

- ein unbeauftragter Commit mit Änderungen am Supabase-Client und neuer Preview-Auth-Storage-Logik,
- ein weiterer Commit mit `.lovable/plan.md`,
- anschließend ein direkter Lovable-Bot-Merge auf den ungeschützten GitHub-Branch `main`.

Der Vorfall wurde über Recovery-PR #66 vollständig zurückgeführt und durch Security #407 sowie CI #416 einschließlich Technical Report und Quality Gate erneut abgenommen. Der aktuelle Dateibaum nach Recovery ist identisch zum zuvor vollständig akzeptierten Stand.

Daraus folgt verbindlich: **Solange Branch Protection für `main` nicht nachweislich aktiv ist, wird der Lovable-Main-Agent überhaupt nicht verwendet — auch nicht im Plan-, Chat- oder Analysemodus.**

## 2. Werkzeug-Priorität

Für jede Aufgabe gilt folgende Reihenfolge:

1. **GitHub prüfen** — aktuellen Code-, Doku- und Commitstand feststellen.
2. **ChatGPT analysiert** — Ursache, Scope, Risiken, betroffene Dateien, Teststrategie und Abnahmekriterien vorab klären.
3. **GitHub-Arbeiten direkt über ChatGPT** — Dokumentation, Statuspflege, Roadmap, Prüfberichte und sonstige sichere Repository-Änderungen werden vorrangig direkt im Repository erledigt; schreibende Änderungen erfolgen auf eigenem Branch mit PR.
4. **Lokale Entwicklung / Codex / VS Code bevorzugen**, wenn eine Änderung ohne Lovable-spezifische Laufzeitfunktion sauber implementiert und getestet werden kann.
5. **Lovable nur gezielt und isoliert einsetzen**, wenn Live-App, UI-Preview, plattformspezifische Funktionen oder eine dort sinnvollere technische Umsetzung erforderlich sind und vorher eine Nicht-main-Arbeitsfläche eindeutig verifiziert wurde.
6. **Manuell abnehmen** — fachliche Oberflächen- und Rollenprüfungen werden außerhalb unnötiger Build-Schleifen durchgeführt.
7. **GitHub nachprüfen** — tatsächlich erzeugten Commit, Zielbranch, Diff, Version und Dokumentation unabhängig kontrollieren.

## 3. Verbindlicher Lovable-Arbeitsmodus

### 3.1 Vorbedingung: isolierte Arbeitsfläche

Ein Lovable-Prompt darf erst ausgeführt werden, wenn vor dem Prompt eindeutig nachgewiesen ist:

- die Arbeitsfläche ist eine **Project Variant oder sonstige nachweislich getrennte Nicht-main-Arbeitsfläche**,
- sie basiert auf einem ausdrücklich freigegebenen `base_sha`,
- `main` ist nicht Ziel des Laufs.

Wenn die Lovable-Oberfläche diese Isolation nicht eindeutig erkennen lässt, wird **kein Prompt** ausgeführt.

Die in der Integrationsschnittstelle angebotene automatische Variant-Funktion war zum dokumentierten Prüfzeitpunkt technisch nicht nutzbar. Daraus entsteht keine Ausnahme für die Nutzung des Main-Agenten.

### 3.2 Rollenverteilung ChatGPT ↔ Bernd ↔ Lovable

- **ChatGPT** koordiniert GitHub-Stand, Scope, Nicht-Scope, Architektur-/Security-Grenzen, Teststrategie, Diff-Prüfung, CI/Security und Abnahme.
- **Bernd** kann den von ChatGPT vorbereiteten kopierfertigen Lovable-Prompt manuell übergeben, nachdem die isolierte Arbeitsfläche verifiziert wurde.
- **Lovable** implementiert bzw. visualisiert ausschließlich den eng definierten Auftrag auf dieser isolierten Arbeitsfläche und erstellt einen Abschlussbericht.
- Merge-/Release-Entscheidungen erfolgen nicht durch Lovable.

### 3.3 Ein Variant = ein Auftrag = ein Scope

- Variant nach Abschluss nicht als dauerhafte Entwicklungsumgebung wiederverwenden.
- Keine ungefragten Zusatzfixes.
- Zusatzbefunde werden im Abschlussbericht genannt und später separat priorisiert.
- Keine selbstständigen Folgeänderungen nach dem Abschlussbericht.

## 4. Regeln für Lovable-Prompts

Jeder Lovable-Prompt folgt verbindlich:

**Analysieren → minimal umsetzen → testen → dokumentieren → Abschlussbericht → stoppen.**

Zusätzlich gilt:

- Repository und freigegebenen Ausgangs-Commit nennen.
- Ziel-Variant/Nicht-main-Arbeitsfläche ausdrücklich nennen.
- Scope und **Nicht-Scope** festlegen.
- Bereits bestätigte Root Causes nicht erneut breit analysieren lassen.
- Betroffene Dateien und bestehende Architektur nennen, soweit bekannt.
- Bestehende RBAC-/RLS-/Providerregeln wiederverwenden; keine zweite Fach- oder Rechtelogik erzeugen.
- Auth, RBAC, RLS, Supabase-Semantik, Migrationen, Seeds und `src/integrations/supabase/*` nur ändern, wenn dies ausdrücklich Teil des Auftrags ist.
- Keine Preview-/Broker-Auth-Storage-Logik als Nebenwirkung eines anderen Auftrags einführen.
- Zusammengehörige Änderungen mit derselben Root Cause in einem Auftrag bündeln.
- Unabhängige Features nicht in einen Sammelprompt mischen.
- Konkrete Tests, Quality Gates und Abnahmekriterien vorgeben.
- Bei Abbruch trotzdem einen Zwischen-Abschlussbericht verlangen.
- Nach jedem Lovable-Lauf zuerst Variant/Commit und vollständigen Diff prüfen, bevor irgendeine Integration begonnen wird.

## 5. GitHub-Integration nach einem Lovable-Lauf

Lovables Ergebnis ist erst ein Arbeitsprodukt, keine Freigabe.

Vor Integration gilt:

1. vollständigen Lovable-Diff gegen das freigegebene `base_sha` prüfen,
2. unbeauftragte Dateien/Änderungen zurückweisen,
3. Ergebnis auf einen klar benannten GitHub-Branch übernehmen,
4. Pull Request öffnen,
5. separaten Security-Workflow vollständig grün abwarten,
6. vollständige CI einschließlich `14 · Technical Report & Quality Gate` vollständig grün abwarten,
7. nur den geprüften Head mit Expected-Head-SHA mergen.

Branch Protection bleibt die technische Zielabsicherung; der Prozess ersetzt diesen Schutz nur übergangsweise.

## 6. Neue Lovable-Unterhaltung statt Kontextballast

Sobald ein abgegrenzter Fix oder ein Feature abgeschlossen und in GitHub dokumentiert ist, soll für eine neue technische Aufgabe eine neue, fokussierte Lovable-Unterhaltung **innerhalb einer neuen isolierten Variant** verwendet werden.

Der Prompt enthält den notwendigen Kontext kompakt selbst:

- Repository,
- Ausgangs-Commit,
- Ziel-Variant/Nicht-main-Arbeitsfläche,
- Ziel,
- bereits bekannte Analyseergebnisse,
- relevante Architekturregeln,
- Scope-Ausschlüsse,
- Tests und Abnahmekriterien.

Alte Chat-Historie darf nicht als Ersatz für eine reproduzierbare Aufgabenbeschreibung dienen.

## 7. Fehler- und „Try to fix“-Schleifen vermeiden

Bei einem fehlgeschlagenen Lovable-Lauf gilt:

1. Fehlermeldung, Abschlussbericht und Variant-/Commit-Stand sichern.
2. Nicht reflexartig mehrfach „Try to fix“ oder ähnliche automatische Reparaturschleifen starten.
3. Fehler zunächst außerhalb der Lovable-Build-Schleife analysieren.
4. Diff und betroffene Dateien prüfen.
5. Danach genau einen fokussierten Korrekturauftrag mit bestätigter Root Cause auf einer isolierten Arbeitsfläche erstellen.

Ziel ist die minimale Zahl unklarer oder wiederholter Build-Versuche.

## 8. Planung ohne Lovable-Schreibwirkung

Brainstorming, Architekturentscheidungen, Roadmap, Prompt-Entwurf und Fehleranalyse erfolgen grundsätzlich in ChatGPT, GitHub oder lokalen Werkzeugen.

**Solange Issue #53 offen und `main` ungeschützt ist, wird Lovable dafür nicht im Main-Agenten verwendet.** Der nachgewiesene Planmodus-Vorfall zeigt, dass die Bezeichnung „Plan“ oder „Chat“ keinen Sicherheitsnachweis darstellt.

Lovable darf für Analyse nur verwendet werden, wenn auch hierfür zuvor eine nachweislich isolierte Variant/Nicht-main-Arbeitsfläche bereitsteht und ein eventueller Commit dort unschädlich bleibt.

## 9. Lokale Entwicklung nach dem MVP

Der MVP ist abgeschlossen. Mit wachsendem Projektumfang wird lokale Entwicklung wichtiger. Für kleine und klar abgegrenzte Codeänderungen ist nach Möglichkeit folgender Pfad vorzuziehen:

`GitHub → lokaler Branch/Workspace → Codex oder VS Code → lokale Tests/Gates → Commit/PR → GitHub-Prüfung`

Lovable bleibt Referenz für die veröffentlichte App sowie gezieltes Implementierungs-/Preview-Werkzeug, wenn seine Plattform einen echten Mehrwert bietet. Es darf keine technisch unersetzbare Entwicklungs- oder Laufzeitabhängigkeit entstehen.

## 10. Credit-Budget je Aufgabe

Vor einem Lovable-Prompt wird die Aufgabe klassifiziert:

- **0 Lovable-Läufe:** reine Analyse, GitHub-Doku, Roadmap, Statuspflege, manuelle Abnahme.
- **1 gezielter Lovable-Lauf:** klar abgegrenzter Fix oder Feature auf verifizierter isolierter Arbeitsfläche.
- **mehrere Lovable-Läufe:** nur wenn technische Unsicherheit, echte iterative UI-Abnahme oder mehrere voneinander abhängige Laufzeitschritte dies begründen.

Kann eine Aufgabe ohne Qualitätsverlust direkt über GitHub oder lokal erledigt werden, wird kein Lovable-Lauf verwendet.

### 10.1 Tagesbudget Lovable

Für die operative Planung gilt nutzerseitig bestätigt zum Stand 2026-08-24:

- Pro Tag stehen **5 neue Lovable-Credits** zur Verfügung.
- Diese Zahl ist als tarifabhängige Planungsgröße zu behandeln und bei Tarif-/Produktänderungen neu zu verifizieren.
- Zu Beginn eines Arbeitstages wird geprüft, welche Aufgaben tatsächlich von Lovable profitieren.
- Bevorzugte Einsatzfelder sind UI-/Preview-/Layout-Arbeit, produktionsnahe Sichtprüfung und klar abgegrenzte Lovable-spezifische Implementierungen — jeweils nur auf verifizierter isolierter Arbeitsfläche.
- Credits werden nicht durch künstliche Änderungen, Testschleifen oder Features verbraucht.
- GitHub-Source-of-Truth, Scope-Trennung, Branch-/PR-Governance, CI/Security-Gates und manuelle Abnahme haben Vorrang vor Credit-Auslastung.

## 11. Abschlussbericht als Übergabevertrag

Jeder substanzielle technische Schritt endet mit einem Abschlussbericht. Je nach Aufgabe enthält er:

- Aufgabe und Scope,
- Ausgangs- und End-Commit,
- Zielbranch/Variant/PR,
- Version,
- Root Cause bzw. Analyseergebnis,
- tatsächlich geänderte Dateien,
- Architektur-/Security-Entscheidungen,
- Tests und Gates mit realen Ergebnissen,
- Dokumentationsänderungen,
- Finding-Status,
- neu entdeckte Abweichungen,
- Restrisiken,
- MVP-/BSF-Einordnung,
- manuellen Retest,
- exakt empfohlenen nächsten Schritt.

Der Abschlussbericht reduziert Folgekontext und ermöglicht den Wechsel in eine neue, kurze Unterhaltung ohne Wissensverlust.

## 12. Sicherheits- und Governance-Regeln

Unverändert verbindlich:

- keine produktiven Schlüssel, Tokens, Passwörter oder Service-Role-Keys in Prompts, Code oder Dokumentation,
- RBAC und RLS nicht durch reine UI-Logik ersetzen,
- Fachlogik, Authentifizierung, Datenzugriff und Provider-spezifische Implementierung getrennt halten,
- Änderungen testbar, dokumentiert, containerfähig und migrationsfähig halten,
- GitHub ist die maßgebliche Quelle für den aktuellen Stand,
- reguläre Tool- und Entwicklungsänderungen nicht direkt auf `main` schreiben,
- vor Merge PR-Diff und vorgesehene CI-/Security-Gates prüfen,
- Force Pushes oder History-Rewrite auf `main` nicht als normalen Korrekturweg verwenden,
- Findings, F-Status oder MVP-Abnahmen nicht durch einen Implementierungsagenten eigenmächtig auf PASS/CLOSED setzen.

## 13. Praktische Konsequenz im Post-MVP-Betrieb

F-11 und der MVP sind abgeschlossen. Aktueller Fokus ist kontrollierte Post-MVP-Wartung und bewusst priorisierter Ausbau.

Solange Branch Protection für `main` nicht nachweislich aktiv ist:

- GitHub-Änderungen ausschließlich über Branch + PR,
- Lovable-Main-Agent nicht verwenden,
- Lovable nur nach bestätigter Variant-/Nicht-main-Isolation,
- GitHub nach jedem externen Lauf unabhängig prüfen,
- Issue #53 offen halten,
- zukünftigen BSF-Scope wie Issue #63 nicht stillschweigend starten.

Der reproduzierte Lovable-Vorfall und Recovery #66 sind Referenzbeispiel dafür, warum organisatorische Regeln bis zur technischen Branch Protection strikt eingehalten werden müssen.
