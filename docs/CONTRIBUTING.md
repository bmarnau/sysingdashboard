# Contributing — Engineer Dashboard

Dieses Dokument bündelt die Entwicklungs- und Doku-Regeln für das Dashboard.
Es gilt für Arbeiten in Lovable wie für lokales Arbeiten gegen das GitHub-Repository.

## 1. Repository-Struktur

```
src/             Anwendungscode (Routen, Komponenten, Libs, i18n)
src/components/  Wiederverwendbare UI- und Dialog-Komponenten
src/lib/         Services, Datenmodelle, Hilfsfunktionen
src/lib/i18n/    Übersetzungen (Standard de, en vorbereitet)
src/routes/      TanStack-Start file-based routing
docs/            Projekt-/Prozessdokumentation (dieses Verzeichnis)
scripts/         CI- und Wartungsskripte (z. B. docs:check)
CHANGELOG.md     Single Source of Truth der Dashboard-Version
.github/         GitHub Actions Workflows
```

## 2. Branch-Strategie

| Branch        | Zweck                                                   |
| ------------- | ------------------------------------------------------- |
| `main`        | Produktionsstand. Nur gemergte Releases.                |
| `develop`     | Integrationsbranch. Basis für Features.                 |
| `feature/<x>` | Neue Funktion. Mergt zurück nach `develop`.             |
| `bugfix/<x>`  | Fehlerbehebung. Mergt zurück nach `develop`.            |
| `hotfix/<x>`  | Dringender Produktionsfix. Mergt nach `main`+`develop`. |

Lovable arbeitet standardmäßig direkt auf `main`. Wer parallel lokal entwickelt,
nutzt feature/bugfix-Branches und merged via Pull Request.

## 3. Commit-Konvention (Conventional Commits)

```
<type>(<scope>): <kurze Beschreibung im Imperativ>
```

Erlaubte Typen: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`.

Beispiele:

```
feat(export): PDF-Arbeitszeitreport ergänzt
feat(profile): flexible Teilzeit eingeführt
docs(handbook): Handbuch aktualisiert
fix(calculation): Sollzeitberechnung korrigiert
chore(deps): fflate aktualisiert
```

## 4. Doku-Sync-Pflicht (verbindlich)

Jede Änderung mit Nutzersichtbarkeit MUSS dokumentiert werden:

1. **HelpTopic** in `src/lib/help-documentation.ts` ergänzen/anpassen
   (`lastUpdated` setzen). Neue Einstellungen → `builtInSettings`.
2. **CHANGELOG.md** — neuer Eintrag oben. Format:
   `## <semver> - YYYY-MM-DD` gefolgt von `- bullet`-Zeilen.
   Die oberste Version wird automatisch zur `DASHBOARD_VERSION` im Handbuch.
3. **`bun run docs:check`** lokal ausführen, bevor committet wird.
   Der Workflow `.github/workflows/ci.yml` führt denselben Check in jedem PR aus.

Pre-Commit-Checkliste:

- [ ] HelpTopics aktualisiert
- [ ] CHANGELOG-Eintrag ergänzt
- [ ] `docs:check` grün
- [ ] Lint grün

## 5. CI/CD

`.github/workflows/ci.yml` führt bei jedem Push/PR aus:

1. `bun install`
2. `bun run lint`
3. `bun run docs:check`
4. `bun run build` (Production-Bundle)

Schlägt ein Schritt fehl, ist der PR blockiert.

## 6. Systemstatus im Dashboard

`Service → Systemstatus…` zeigt zur Laufzeit:

- GitHub-Repository, Branch, letzten Commit (Build-Zeit injiziert via
  `vite.config.ts` über `__BUILD_INFO__`)
- Dashboard- und Handbuch-Version
- Letztes automatisches Backup

Ist `git` zur Build-Zeit nicht verfügbar (z. B. reine Lovable-Sandbox ohne
Repository-Anbindung), zeigt der Dialog einen entsprechenden Hinweis an und
fordert zur Verbindung über das Lovable-Plus-Menü auf.

## 7. Sensible Daten

Niemals committen:

- `.env`, `.env.local`, `.dev.vars`, `*.local`
- Tokens, API-Keys, JWTs, Passwörter
- Lokale Backup-ZIPs (liegen im Browser, nicht im Repo)

`.gitignore` enthält die nötigen Muster; bei Erweiterung dort ergänzen.

## 8. Rollenbasierte Cockpit- und Führungssichten (verbindlich)

Management- und AVKK-Übersichten werden nicht als universelle Einheitsansicht entwickelt. Das Dashboard verwendet eine gemeinsame Cockpit-Architektur mit rollen- und scopeabhängigen Sichten, Verdichtungsstufen und Standardfiltern. Fachlogik und Komponenten werden wiederverwendet und nicht pro Rolle dupliziert.

### 8.1 Systemingenieur – persönliche Arbeitssicht

Die Standardsicht beantwortet: **„Was muss ich als Nächstes tun und wo benötige ich Unterstützung?“**

Der Scope umfasst die eigenen bzw. dem Benutzer zugeordneten Projekte, Arbeitspakete und Tätigkeiten. Handlungsbedarf steht vor allgemeinen Statistiken. Bevorzugte Standardsortierung: kritisch → überfällig → gefährdet → heute/bald fällig → normal.

Mindestens sichtbar bzw. erreichbar sind Projekt, Arbeitspaket/Tätigkeit, Termin/Dringlichkeit, AVKK-Status, Gefährdung und nachvollziehbare Gründe für Handlungsbedarf.

### 8.2 Projektmanager – Projektsicht

Die Standardsicht beantwortet: **„Sind meine Projekte im Plan und wo muss ich eingreifen?“**

Der Scope umfasst alle Projekte, Arbeitspakete und Tätigkeiten, für die der Projektmanager gemäß RBAC/RLS zuständig bzw. leseberechtigt ist. Auf Projektebene werden insbesondere Planstatus, gefährdete/kritische Arbeitspakete, Überfälligkeiten, Kompetenz-/Voraussetzungslücken, hohe Konsequenzen und aktueller Handlungsbedarf verdichtet.

Der natürliche Drill-down lautet:

`Projekt → Arbeitspaket → Tätigkeit → AVKK-Details`

### 8.3 Geschäftsführer – Unternehmens-/Portfolioübersicht

Die Standardsicht beantwortet: **„Wo bestehen unternehmensweit Risiken, Verzögerungen oder Führungsentscheidungen?“**

Der Scope umfasst alle gemäß RBAC/RLS freigegebenen Projekte und Arbeitspakete. Die oberste Ebene ist stark verdichtet und für schnelle Orientierung ausgelegt. Sie zeigt insbesondere laufende Projekte, Projekte im Plan, gefährdete/kritische Projekte, kritische bzw. überfällige Arbeitspakete sowie relevante Kunden-, Projekt- oder Unternehmenskonsequenzen.

Einzelne Tätigkeiten sind nicht die primäre Einstiegsebene, bleiben aber über Drill-down erreichbar. Jede kritische Kennzahl muss auf konkrete Ursachen zurückführbar sein; reine Ampel- oder Black-Box-Kennzahlen sind nicht zulässig.

### 8.4 App-Entwickler/Admin – Role Preview

Für Entwicklung, Test und Abnahme ist ein **„Ansicht als Rolle“ / Role Preview Mode** vorzusehen. Berechtigte Entwickler/Admins können damit die Darstellung für Systemingenieur, Projektmanager, Geschäftsführer und weitere freigegebene Rollen prüfen.

Verbindliche Sicherheitsregel:

**Role Preview verändert ausschließlich Darstellung, Standardfilter und Verdichtungsgrad. Role Preview verändert niemals die tatsächliche Identität, RBAC-Berechtigungen, RLS-Regeln oder den realen Datenzugriff.**

Ein normaler Benutzer darf durch clientseitiges Umschalten niemals zusätzliche Daten oder Rechte erhalten. Die Vorschau arbeitet ausschließlich innerhalb des realen Berechtigungsscopes des angemeldeten Entwicklers/Admins.

### 8.5 Gemeinsame Cockpit-Architektur

Die Sichten werden grundsätzlich aus einer gemeinsamen Architektur aufgebaut:

```
AVKK / Management-Cockpit
├── Kennzahlen im aktuellen Scope
├── Handlungsbedarf
├── Projekte / Arbeitspakete / Tätigkeiten
├── Kompetenz / Voraussetzungen
├── Konsequenzen / Risiken
└── AVKK verstehen
```

Der sichtbare Inhalt ergibt sich aus **Rolle + realem Berechtigungsscope + zulässigen Filtern**, nicht aus getrennten fachlichen Implementierungen.

### 8.6 Drill-down und Nachvollziehbarkeit

Verdichtung darf die fachliche Nachvollziehbarkeit nicht verlieren. Für Managementkennzahlen gilt grundsätzlich:

`Portfolio/Übersicht → Projekt → Arbeitspaket → Tätigkeit → AVKK/Begründung`

Kritisch, gefährdet, überfällig oder anderweitig priorisiert dargestellte Sachverhalte müssen ihre Gründe offenlegen können. Undokumentierte Scores oder versteckte Black-Box-Priorisierungen sind nicht zulässig.

### 8.7 Handlungsbedarf vor Statistik

Die wichtigste Designfrage je Rolle lautet: **„Welche Entscheidung oder Handlung ist jetzt erforderlich?“**

Gefährdungen, fehlende Voraussetzungen, Terminrisiken, hohe Konsequenzen und notwendige Unterstützung sind gegenüber dekorativen Statistiken zu priorisieren.

### 8.8 Keine personenbezogenen Rankings

AVKK bewertet Aufgaben, Verantwortung, Voraussetzungen und Konsequenzen. Es dient nicht der automatisierten Bewertung von Personen.

Nicht zulässig sind insbesondere Mitarbeiter-Rankings, Top-/Flop-Listen, undokumentierte Performance-Scores, automatische personenbezogene Leistungsbewertungen sowie Stress- oder Belastungsvergleiche einzelner Mitarbeiter.

Kontextindikatoren wie Belastung, Zeitdruck oder Teamunterstützung dienen ausschließlich der Erkennung von Unterstützungs- und Handlungsbedarf und sind datenschutzsensibel zu behandeln.

### 8.9 Erweiterbarkeit

Die Architektur soll spätere zusätzliche Sichten ermöglichen, ohne die Fachlogik umzubauen. Als vorgesehene Erweiterung gilt insbesondere eine Kunden-/Service-Sicht, mit der berechtigte Rollen projektübergreifende Risiken und kritische Arbeitspakete je Kunde untersuchen können.

## 9. Systemhaus-Demo- und Testdaten für manuelle Abnahmen (verbindlich)

Neue Cockpit-, AVKK-, Management-, Reporting- und Exportfunktionen müssen anhand realistischer, reproduzierbarer Beispieldaten aus dem Alltag eines Systemhauses manuell überprüfbar sein.

### 9.1 Zweck

Die Demo-Daten dienen dazu, fachliche Funktionen aus Sicht der vorgesehenen Rollen unmittelbar prüfen zu können. Ein manueller Tester soll ohne vorherige Datenerfassung erkennen können, ob Filter, Priorisierung, Drill-down, AVKK, Managementkennzahlen, Reports und Exporte fachlich plausibel funktionieren.

### 9.2 Realistische Beispielszenarien

Der Testbestand soll mehrere vollständig fiktive Systemhaus-Szenarien enthalten, beispielsweise:

- IT-Infrastruktur-Migration eines Kunden,
- Microsoft-365-Rollout,
- Firewall-/Netzwerk-Erneuerung,
- Backup-/Restore-Projekt,
- Server- oder Storage-Migration,
- Arbeitsplatz-/Client-Rollout.

Die Szenarien sollen bewusst unterschiedliche Zustände abdecken:

- Projekt vollständig im Plan,
- gefährdetes Projekt,
- kritisches Arbeitspaket,
- überfällige Tätigkeit,
- bald fällige Tätigkeit,
- vollständig unkritischer Vorgang,
- fehlende Zeit,
- fehlendes Material,
- fehlende Berechtigung,
- fehlende Information,
- nur teilweise vorhandene Unterstützung,
- hohe Kundenkonsequenz,
- hohe Projekt-/Terminwirkung.

### 9.3 Rollenzuordnung der Demo-Daten

Die Daten müssen so strukturiert sein, dass die Rollensichten tatsächlich unterscheidbar geprüft werden können:

- **Systemingenieur:** eigene Projekte, Arbeitspakete und Tätigkeiten mit unterschiedlicher Dringlichkeit und AVKK-Situation.
- **Projektmanager:** mehrere zugeordnete Projekte mit Arbeitspaketen/Tätigkeiten in unterschiedlichen Plan- und Risikozuständen.
- **Geschäftsführer:** verdichtete Sicht auf mehrere Projekte mit mindestens einem unkritischen, einem gefährdeten und einem kritischen Fall.
- **App-Entwickler/Admin:** derselbe Datenbestand muss über Role Preview aus den unterschiedlichen Darstellungs- und Verdichtungsperspektiven prüfbar sein.

### 9.4 Datenschutz und Kennzeichnung

Demo-Daten enthalten ausschließlich fiktive Personen-, Kunden-, Projekt- und Unternehmensbezeichnungen. Reale Kunden-, Mitarbeiter-, E-Mail-, Vertrags-, Zugangsdaten oder sonstige produktive Informationen dürfen nicht als Testdaten verwendet werden.

Demo-Datensätze sind technisch oder fachlich eindeutig als Test-/Demo-Daten zu kennzeichnen, damit sie nicht mit produktiven Daten verwechselt werden.

### 9.5 Reproduzierbarkeit und Entfernung

Demo-Daten dürfen nicht als unkontrollierte manuelle Einträge dauerhaft im Produktivbestand entstehen. Für den Testbestand ist ein reproduzierbarer Mechanismus vorzusehen, beispielsweise Seed-/Fixture-Daten oder ein vergleichbar kontrollierter Testdatenpfad.

Der Mechanismus muss:

- deterministisch bzw. nachvollziehbar sein,
- wiederholt ausführbar sein,
- Demo-Daten eindeutig identifizieren,
- Demo-Daten kontrolliert entfernen/zurücksetzen können,
- RBAC/RLS respektieren,
- keine produktiven Daten überschreiben oder löschen.

### 9.6 Fachliche Testabdeckung

Die Beispieldaten sollen mindestens folgende manuelle Prüfungen ermöglichen:

1. Systemingenieur erkennt seine dringendsten Tätigkeiten.
2. Projektmanager erkennt, welches seiner Projekte bzw. Arbeitspakete Eingriff benötigt.
3. Geschäftsführer erkennt innerhalb kurzer Zeit, welche Projekte im Plan, gefährdet oder kritisch sind.
4. Drill-down führt von der verdichteten Sicht bis zur konkreten Tätigkeit und AVKK-Begründung.
5. Kompetenz-/Voraussetzungslücken sind anhand konkreter Fälle nachvollziehbar.
6. Konsequenzen für Kunde, Projekt und Termin sind prüfbar.
7. Filter und Sortierung liefern erwartbare Ergebnisse.
8. Role Preview zeigt unterschiedliche Rollendarstellungen, ohne reale Berechtigungen zu verändern.
9. Reports/Exporte enthalten später dieselben fachlich plausiblen Testfälle.
10. Leere bzw. unkritische Zustände können ebenfalls geprüft werden.

### 9.7 Testdaten als Entwicklungsregel

Bei neuen fachlichen Funktionen ist zu prüfen, ob der vorhandene Demo-Datensatz die Funktion bereits ausreichend abdeckt. Falls nicht, wird der zentrale Demo-Datensatz gezielt erweitert, statt komponentenspezifische Ad-hoc-Testdaten in der UI zu hardcodieren.

Automatisierte Unit-/Integrationstests und Systemhaus-Demo-Daten erfüllen unterschiedliche Zwecke: Demo-Daten ersetzen keine automatisierten Tests, und automatisierte Tests ersetzen nicht die fachliche manuelle Abnahme mit realistischen Szenarien.

### 9.8 Testpflicht für Cockpitänderungen

Bei Änderungen an Cockpit-, AVKK- oder Managementansichten sind mindestens folgende Perspektiven mit den definierten Demo-Daten zu prüfen:

- Systemingenieur,
- Projektmanager,
- Geschäftsführer,
- App-Entwickler/Admin mit Role Preview,
- Benutzer ohne erforderliche Berechtigung.

Dabei sind UI-Verhalten und RBAC/RLS getrennt zu bewerten. Eine optisch korrekte Role Preview gilt ausdrücklich nicht als Berechtigungsnachweis.
