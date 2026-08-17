# Sysing Dashboard — Verbindliche Roadmap MVP → BSF → Integration

Stand: 2026-08-17
Status: verbindliche, chat-unabhängige Planungsgrundlage

## 1. Zweck und Geltung

Dieses Dokument schreibt die weitere Entwicklungsplanung des Sysing Dashboards chat-unabhängig fest. GitHub ist die maßgebliche Quelle. Neue Chats, Lovable-Prompts und Entwicklungsarbeiten sollen diese Roadmap als Planungsgrundlage verwenden und bei Änderungen synchron fortschreiben.

Die Roadmap unterscheidet drei Horizonte:

1. **MVP** — funktionsfähige und formal freigegebene Produktbaseline.
2. **BSF — Betriebsfähiges Systemhaus-Fundament** — belastbares fachliches und technisches Fundament für den realen Systemhausbetrieb.
3. **Integration/Automation** — erst nach BSF, beginnend mit Microsoft Graph / Exchange Online und später weiterführender Automatisierung und KI.

Microsoft Graph ist ausdrücklich **kein Bestandteil des BSF**. Vor Beginn der Graph-Integration wird ein eigenes Integrations-Readiness-Gate durchgeführt.

## 2. Aktueller Planungshorizont

### MVP

Aktiver Abschluss: manuelle F-11-Mehrbenutzerabnahme, verbleibende UX-/Hardening-Punkte und formale MVP-Release-/Baseline-Freigabe. Der operative nächste Pfad bleibt die Wiederherstellung des Zugangs für Petra und die Fortsetzung der F-11-Abnahme.

SharePoint-Beispieldaten und MCP-/API-Ergebnisse dürfen parallel analysiert werden, sind aber BSF-Vorarbeit und ändern den MVP-Scope nicht.

Planungsgröße zum Stand dieses Dokuments: ungefähr **2–3 Prompts bis zur formalen MVP-Baseline**. Diese Schätzung ist nach jedem Prompt anhand des tatsächlichen Ergebnisses neu zu bewerten.

### BSF — Betriebsfähiges Systemhaus-Fundament

Nach der MVP-Baseline wird BSF zum aktiven Meilenstein. Ziel ist nicht bloß weiterer Feature-Ausbau, sondern die Herstellung eines belastbaren Fundaments für reale Systemhausdaten, Kundenbeziehungen, Betreiberhoheit, Portabilität und spätere Integrationen.

Planungsgröße aus heutiger Sicht: ungefähr **14–21 weitere Prompts nach MVP bis BSF**. Auch diese Schätzung wird nach jedem Prompt neu bewertet.

## 3. Verbindlicher BSF-Umfang

### 3.1 Kundenmodell

Ein Kunde wird als eigenständige fachliche Entität mit stabiler Kunden-ID modelliert. Projekte, Arbeitspakete und Tätigkeiten müssen eindeutig einem Kunden zugeordnet werden können. Das Modell ist providerneutral auszulegen und muss spätere Datenquellen wie SharePoint, Supabase oder Azure SQL unterstützen.

### 3.2 Kundenverantwortung und kundenbezogene Sichtberechtigung

Ein Systemingenieur kann für einen oder mehrere Kunden eine **Kundenverantwortung** besitzen.

Fachregel: Ist ein Systemingenieur für einen Kunden verantwortlich, muss er alle diesem Kunden zugeordneten Projekte, Arbeitspakete und Tätigkeiten sehen können, auch wenn er für die einzelnen Objekte nicht verantwortlich ist.

Dabei gilt zwingend:

- Kundenverantwortung ist nicht gleich Objektverantwortung.
- Kundenverantwortung ist nicht gleich AVKK-Verantwortung.
- Sichtbarkeit aufgrund Kundenverantwortung erzeugt nicht automatisch Schreibrechte.
- Der Grund der Sichtbarkeit soll nachvollziehbar sein, z. B. „sichtbar aufgrund Kundenverantwortung“.
- Mehrere Kunden je Systemingenieur sind vorzusehen.
- Eine spätere Mehrfachverantwortung je Kunde soll architektonisch möglich bleiben.
- RBAC, RLS, Audit und Providertrennung sind einzuhalten.
- Eine Sicht bzw. ein Filter „Meine Kunden“ ist vorzusehen.
- Auswirkungen auf persönliche Cockpits, AVKK und Managementcockpit sind zu berücksichtigen.
- Die spätere Übernahme von Kundenbeziehungen aus dem bestehenden SharePoint ist vorzubereiten.

### 3.3 Datenhaltung und Local-First-Grenze

Die heutige browsergebundene Local-First-Haltung von Projekten, Arbeitspaketen und Tätigkeiten wird für BSF fachlich und technisch bewertet. Ziel ist eine klare, dokumentierte Strategie für zentrale bzw. synchronisierte Datenhaltung, ohne unnötigen Architekturumbau vor dem erforderlichen Zeitpunkt.

Provider-spezifische Implementierungen bleiben von Fachlogik und UI getrennt.

### 3.4 SharePoint-Zielbild

Der bestehende lokale/ältere ARBION-SharePoint enthält perspektivisch die realen Systemhausdaten, insbesondere Kunden, Projekte, Arbeitspakete und Tätigkeiten. AVKK existiert dort derzeit nicht.

Für BSF wird ein Zielbild für die spätere Verbindung erstellt:

- Bestandsaufnahme anhand realer Strukturen, Beispieldaten und später bereitgestellter Screenshots,
- Mapping SharePoint → Sysing-Dashboard-Fachmodell,
- eindeutige und stabile Schlüssel und Beziehungen,
- Informationsflüsse und führende Datenquelle,
- zunächst READ/SYNC-orientiert,
- kein unkontrolliertes Rückschreiben,
- Konflikt-, Fehler-, Provenienz- und Auditstrategie,
- Providertrennung für spätere Alternativen.

Ein parallel entstehender SharePoint-MCP-/API-PoC darf bereits vor BSF reale Beispieldaten liefern und als Mapping-Vorarbeit dienen. Er darf den MVP-Abschluss nicht blockieren und zunächst keine AVKK-Logik oder direkten Datenbank-Schreibpfade enthalten.

### 3.5 Providerneutrales Importmodell und unvollständige Quelldaten

Externe Quellen müssen **nicht** das vollständige Sysing-Fachmodell liefern. Dies gilt gleichermaßen für SharePoint, Microsoft Graph, JSON/CSV, MCP-Adapter und spätere Provider.

Verbindlicher Grundsatz:

> **Fehlende Quelldaten dürfen niemals durch erfundene fachliche Werte ersetzt werden. Ein Import darf partiell sein. Identität, Herkunft und bekannte Beziehungen müssen belastbar sein. Fehlende Informationen werden explizit als unbekannt bzw. nicht geliefert behandelt und können später durch andere Quellen, Benutzer oder Sysing-Fachlogik ergänzt werden. AVKK wird ausschließlich innerhalb Sysing geführt und ist keine Pflichtanforderung an externe Datenquellen.**

Die kanonische Verarbeitungskette lautet:

```text
SOURCE → NORMALIZE → VALIDATE → MATCH → ENRICH → REVIEW → PERSIST → AVKK
```

Das BSF muss hierfür ein providerneutrales **Canonical Import Model** bzw. eine entsprechende versionierte Schemaweiterentwicklung definieren.

Mindestens zu unterscheiden sind:

1. **Identitäts-/Beziehungsfelder** — stabile IDs und bekannte Beziehungen; bei fehlender belastbarer Identität kann Import/Matching BLOCKED sein.
2. **Optionale Quelldaten** — z. B. Beschreibung, Budget, Tags, Stundensatz; fehlende Werte werden nicht durch `0`, `false`, leere Strings oder andere erfundene Defaults ersetzt.
3. **Sysing-eigene Anreicherung** — insbesondere AVKK, Kundenverantwortung und Management-/Führungsinformationen; externe Quellen müssen diese nicht liefern.

Partiell befüllte Entitäten sind ausdrücklich zulässig. Sysing soll perspektivisch zwischen `vorhanden`, `nicht geliefert`, `unbekannt` und `nicht anwendbar` unterscheiden können.

Für importierte Daten sind Provenienz, stabile Quell-ID, Freshness/Beobachtungszeitpunkt, Match-Status und fehlende relevante Felder nachvollziehbar zu halten. Eine technische Informationsvollständigkeit darf nicht als Compliance-, Qualitäts-, Mitarbeiter- oder Reifegradscore interpretiert werden.

Das bestehende JSON-Schema 1.1.0 ist eine Grundlage, muss im BSF aber darauf geprüft werden, ob heutige Pflichtfelder für externe Provider zu streng sind. Insbesondere dürfen bei Tätigkeiten keine künstlichen Werte für `duration`, `hourlyRate`, `billable` oder `billingStatus` erzeugt werden, wenn die Quelle diese Informationen nicht besitzt.

Die ausführliche Leitlinie ist in `docs/INTEGRATION-IMPORT-PRINCIPLES.md` festgeschrieben.

### 3.6 AVKK-Grenze bei Importen

AVKK ist Sysing-Fachlogik und wird nicht als Pflichtbestandteil externer Importdaten behandelt.

Für importierte operative Objekte sind fachlich mindestens folgende Zustände zulässig:

- kein AVKK-Subject vorhanden — Objekt ist importiert, AVKK noch nicht aufgenommen,
- AVKK begonnen — Bewertung ist unvollständig,
- AVKK vollständig bewertet.

Ein fehlendes AVKK ist damit **kein Importfehler**.

Importierte Quelldaten und Sysing-eigene AVKK-/Führungsinformationen müssen so getrennt sein, dass ein erneuter Quellimport bestehende Sysing-Anreicherungen nicht unkontrolliert überschreibt.

### 3.7 Betreiberhoheit, Backend und Portabilität

Der dokumentierte Befund F-15 zur plattformverwalteten Backend-Instanz wird im BSF konkret bearbeitet. Ziel ist der Nachweis, dass Lovable Cloud keine technisch unersetzbare Laufzeitabhängigkeit darstellt.

Zu betrachten sind mindestens:

- Betreiberzugriff und administrative Hoheit über Daten/Auth,
- Datenexport und Migration,
- Supabase-/Postgres-Portabilität,
- Backup/Restore,
- Docker-Betrieb,
- spätere Entra-ID-/Azure-SQL-/Azure-Storage-Fähigkeit,
- dokumentierter Exit-/Migrationspfad.

### 3.8 Managementcockpit und Rollen

Die rollenbezogenen Sichten werden auf Kunden- und reale Systemhauskontexte erweitert. Projektmanager, Systemingenieur, Führung und Administration erhalten jeweils fachlich geeignete Sichten, ohne Berechtigungen durch reine UI-Filter zu ersetzen.

### 3.9 Reporting

Reporting wird auf Kunden-/Projektkontexte erweitert. Excel bleibt als geplanter Ausbau zu betrachten. Bestehende PDF-/Word-/JSON-/CSV-Pfade sollen konsolidiert und providerneutral bleiben.

### 3.10 KI-/Agenten-Labor

Innerhalb BSF ist ein kleines, isoliertes Lern- und Demonstrationslabor mit Mock-Daten zulässig. Ziel ist das Erproben einer providerneutralen KI-/Agenten-Schnittstelle, z. B. mit einem kleinen Claude-/LLM-Agenten.

Es gelten:

- keine produktiven autonomen Aktionen,
- keine produktiven Secrets,
- Mock-/Demodaten,
- Human-in-the-loop,
- nachvollziehbare Informationsflüsse,
- klare Trennung von deterministischer Fachlogik und KI,
- Anbieterwechsel muss möglich bleiben.

Das KI-Labor ersetzt nicht die spätere produktive Integrationsarchitektur.

## 4. SYSING-001 als lebendes TDF-Dokument

`SYSING-001` bleibt ein zentrales, lebendes Produkt- und Architekturdokument im TDF-Format und ist verbindlicher Bestandteil der Roadmap.

### 4.1 Zweck und Zielgruppe

SYSING-001 soll Idee, aktuelles Produkt, Nutzen, Architektur, Sicherheits- und Betriebsmodell, Informationsflüsse, bekannte Grenzen sowie die geplante Weiterentwicklung des Sysing Dashboards in einer verständlichen, management- und technikorientierten Gesamtfassung darstellen.

Es ist ausdrücklich kein rein technischer Prüfbericht. Es soll zugleich als Produktübersicht, Architektur-/Zielbild und nachvollziehbare Entwicklungsreferenz dienen.

### 4.2 Strukturreferenz und TDF-Konformität

Für Aufbau und Qualitätsniveau ist das TDF-Repository `bmarnau/technical-documentation-framework` maßgeblich. Zusätzlich dient der bereitgestellte `TDF_Check_Reportfamilie_V1.5.0` ausschließlich als **Struktur- und Qualitätsreferenz**, nicht als fachlicher Inhalt für Sysing.

Aus dieser Referenz sollen insbesondere folgende Prinzipien übernommen bzw. für SYSING-001 passend adaptiert werden:

- klarer Dokumentkopf mit Identität, Version, Datum, Verantwortlichkeit und Geltungsbereich,
- nachvollziehbare Trennung von Ist-Zustand, Zielbild, offenen Gates und Freigabeentscheidung,
- Inhaltsverzeichnis und interne Navigation,
- konsistente Kopf-/Fußzeilen mit Version, Datum und `Seite X von Y`,
- reale Produkt-Screenshots mit Beschriftung,
- Architektur- und Informationsflussdiagramme,
- tabellarische Qualitäts-/Statusdarstellungen,
- kontrollierte offene Gates mit eindeutiger Blockerwirkung,
- Quellen-/Provenienz- und Traceability-Prinzipien,
- Versions- und Bestandregression (TDF-VREG) gegen die jeweils freigegebene Vorversion,
- nachvollziehbare Freigabeentscheidung je Baseline.

### 4.3 TDF-Prüfklassen für SYSING-001

Die folgenden TDF-Prüfklassen sollen als Qualitätsvertrag für SYSING-001 und spätere Integrationen berücksichtigt und an die Sysing-Domäne angepasst werden:

- `TDF-TRACE` — Managementaussage muss bis zur relevanten Original-/Primärquelle bzw. zum belegbaren Systemzustand rückverfolgbar sein.
- `TDF-SCHEMA` — schemaVersion, Migration, Pflichtfelder und Rückwärtskompatibilität dokumentieren.
- `TDF-IMPORT` — Idempotenz, Diff, Staging, Transaktion und Rollback für Import-/Sync-Pfade dokumentieren.
- `TDF-SOURCE` — Source of Truth, Konfliktregeln, Zeitstempel/Freshness und Provenienz dokumentieren.
- `TDF-AI` — Evidence Binding, Prompt-/Regelversion, KI-Kandidat und Freigabe dokumentieren.
- `TDF-SEC` — Secrets, Least Privilege, Mandanten-/Scope-Trennung sowie Logging-/Backup-Grenzen dokumentieren.
- `TDF-RESILIENCE` — Degraded Mode, Last Known Good, stale/expired/unknown dokumentieren.
- `TDF-RELEASE` — Dokumentations-, PoC- und Produktionsblocker klar trennen.

Ein Implementierungs-PASS darf nur vergeben werden, wenn der jeweilige technische Pfad tatsächlich umgesetzt und mit Testevidenz abgenommen wurde. Geplante Funktionen bleiben als Zielbild gekennzeichnet.

### 4.4 Pflichtinhalte von SYSING-001

SYSING-001 soll mindestens enthalten:

- Idee, Problemstellung und Zielbild,
- Zielgruppen und Rollen,
- aktueller Funktionsstand,
- AVKK und Managementcockpit,
- Nutzen und Vorteile,
- Kundenmodell und Kundenverantwortung,
- Architektur und Providertrennung,
- Supabase/Backend und aktuelle Grenzen,
- SharePoint als spätere reale Datenquelle,
- providerneutrales Canonical Import Model und Umgang mit partiellen Quelldaten,
- schematische Informationsflüsse SharePoint ↔ Sysing Dashboard,
- Reporting und Dokumentausgabe,
- Automatisierungsstufen,
- KI-/Agenten-Zielbild und Mock-Labor,
- Docker-/On-Premises-Portabilität,
- spätere Entra-ID-/Azure-SQL-/Azure-Storage-Fähigkeit,
- bekannte Risiken und Findings,
- offene Gates und Freigabeentscheidungen,
- Roadmap MVP → BSF → Integration/Graph → Automatisierung/KI.

Umgesetzte, geplante, mögliche und rein konzeptionelle Inhalte sind klar voneinander zu kennzeichnen. Nichts Geplantes darf als umgesetzt dargestellt werden.

### 4.5 Bilder und Diagramme

Das Dokument soll aktuelle reale Screenshots des Sysing Dashboards enthalten, soweit sie den Stand verständlich belegen. Zusätzlich sollen relevante Architektur- und Informationsflussdiagramme enthalten sein, insbesondere zu:

- aktuellem MVP-/BSF-Systemkontext,
- Rollen-/Informationssichten,
- Local-First vs. Backend,
- SharePoint → Provider Adapter → Canonical Import Model → Sysing Domain Model → AVKK,
- späterem Microsoft-Graph-/E-Mail-Fluss über dieselbe Importpipeline,
- KI-/Agenten-Reifestufen und Human-in-the-loop.

Screenshots und Diagramme sollen bei jeder freigegebenen Baseline gegen den tatsächlichen Stand geprüft werden.

### 4.6 TDF-VREG für SYSING-001

Ab der ersten freigegebenen SYSING-001-Baseline wird TDF-VREG als Release-Gate verwendet. Eine Folgeversion darf nur freigegeben werden, wenn kontrollierte Baseline-Elemente erhalten, nachvollziehbar geändert/verschoben oder begründet entfernt wurden.

Zu kontrollieren sind mindestens:

- Überschriften/Kapitel,
- Glossarbegriffe,
- Quellen/Referenzen,
- eingebettete Abbildungen,
- kontrollierte Narrativelemente,
- Tabellen,
- Autor/Metadaten,
- Inhaltsverzeichnis,
- Footer,
- bekannte Gates/Findings.

Unbegründeter Informationsverlust ist ein Release-Blocker für die Dokumentbaseline.

### 4.7 MVP-Baseline

Zur formalen MVP-Freigabe wird SYSING-001 auf den tatsächlich erreichten MVP-Endstand aktualisiert und als nachvollziehbare TDF-Baseline ausgegeben. Die bestehende Single-Source-Erzeugung für Word/PDF ist beizubehalten.

Zum MVP-Baseline-Zeitpunkt soll zusätzlich eine hochwertige redaktionelle/visuelle Release-Fassung direkt in ChatGPT aus dem GitHub-Stand erzeugt und geprüft werden. GitHub/Markdown bleibt dabei die Single Source of Truth; ChatGPT dient als zusätzliche Publikations- und Qualitätssicherungsstufe.

### 4.8 Fortschreibung im BSF

Während BSF wird SYSING-001 schrittweise fortgeschrieben. Zum BSF-Abschluss wird erneut eine definierte SYSING-001-Baseline mit TDF-VREG erzeugt.

### 4.9 Abruf im Sysing Dashboard

Die jeweils **neueste freigegebene SYSING-001-Version** soll im Sysing Dashboard selbst abrufbar sein.

Vorgesehene Integration:

- Bereich **Service** als primärer Einstieg,
- Eintrag z. B. **„Produkt- & Systemdokumentation (SYSING-001)“**,
- Anzeige von Dokumenttitel, Version, Freigabestatus und Datum,
- Abruf der neuesten freigegebenen PDF-Fassung,
- optional zusätzlicher Download der Word-Fassung,
- keine manuell duplizierte zweite Dokumentquelle,
- Referenz auf die versionierte GitHub-/Artefaktquelle,
- Zugriff rollen-/berechtigungsbewusst nach bestehendem Service-/Dokumentationsmodell,
- sichere externe Links bzw. Downloadpfade ohne Secrets,
- klare Kennzeichnung, wenn eine neuere Entwurfsfassung existiert, aber noch nicht freigegeben ist.

Die UI soll immer die **letzte freigegebene** Fassung als Standard anbieten. Entwürfe dürfen nicht stillschweigend als aktuelle Freigabe erscheinen.

### 4.10 Dokument-Rendering und Freigabecheck

Für jede freigegebene SYSING-001-Baseline sind mindestens zu prüfen:

- DOCX-Render,
- PDF-Export,
- Seitenformat A4,
- Inhaltsverzeichnis,
- PDF-Bookmarks/Outline,
- Kopf-/Fußzeilen,
- `Seite X von Y`,
- Metadaten,
- Screenshots/Diagramme,
- lange Tabellen und Seitenumbrüche,
- Accessibility-High-Severity-Befunde,
- TDF-VREG,
- Abgleich Ist/Zielbild,
- offene Gates und Freigabeentscheidung.

## 5. Bekannte Arbeitspakete bis BSF

Die folgende Reihenfolge ist eine rollierende Planung und kann aufgrund von Findings angepasst werden. Umfangsschätzungen sind keine Zusagen.

| Arbeitspaket | Inhalt | grobe Prompt-Schätzung |
| --- | --- | ---: |
| MVP F-11 Abschluss | Petra-Zugang, Petra/Georg, Rollen-/Negativtests | 1–2 |
| MVP Release/Baseline | finale Gates, Prüfbericht, SYSING-001 als TDF-Baseline, TDF-VREG, ChatGPT-Releasefassung, Version/Tag/Baseline | 1–2 |
| SYSING-001 Board-Abruf | Neueste freigegebene PDF/Word-Version im Service-Bereich abrufbar machen | 1 |
| BSF Planungs-/Architekturbaseline | Backlog, ADR-Review, Tech Debt priorisieren | 1 |
| Kundenmodell | Kunde, IDs, Beziehungen zu Projekt/AP/Tätigkeit | 1–2 |
| Kundenverantwortung | kundenbezogene Sichtberechtigung, RBAC/RLS, Cockpit | 2 |
| Zentrale Datenhaltung / Provider | Local-First-Grenze und Providerstrategie | 2–3 |
| Canonical Import Model | Partial Entities, Pflicht/Optionalfelder, Provenienz, Matching, Idempotenz, Schemaweiterentwicklung | 1–2 |
| SharePoint-Zielbild / Import Contract | reale Beispieldaten, Mapping, stabile Schlüssel, READ/SYNC, API/MCP, Informationsflüsse | 2–3 |
| Betreiberhoheit / Portabilität | F-15, Docker, Backup/Restore, Exit-Pfad | 1–2 |
| Managementcockpit 2 | Kunden-, Projekt- und Portfoliosichten | 1–2 |
| Reporting 2 | Excel und kunden-/projektbezogene Berichte | 1–2 |
| KI-/Agenten-Labor | Mock-Daten, providerneutral, Human-in-the-loop | 2–3 |
| SYSING-001 Fortschreibung | TDF-Dokument auf BSF-Zielbild/-Stand bringen, TDF-VREG fortführen | 1–2 |
| BSF-Abnahme | technische/fachliche Baseline, SYSING-001 BSF-Baseline und Freigabe | 1 |

Der neue Punkt `Canonical Import Model` ist eine Konkretisierung der bereits geplanten Provider-/SharePoint-Arbeit. Er soll möglichst mit diesen Sprints gebündelt werden und nicht unnötig als isolierter zusätzlicher Großsprint wachsen.

## 6. Integrations-Readiness-Gate nach BSF

Nach BSF wird vor Microsoft Graph ein eigener Meilenstein bzw. Gate definiert. Vor Beginn der Graph-Entwicklung müssen mindestens folgende Fragen belastbar beantwortet sein:

- Welche Systeme sind für welche Daten führend?
- Wie wird ein Kunde eindeutig erkannt?
- Wie werden Projekt, Arbeitspaket und Tätigkeit referenziert?
- Wie werden externe Informationen zugeordnet?
- Wie werden partielle/fehlende Quelldaten dargestellt?
- Welche Felder sind Identitäts-/Beziehungsfelder, optional oder Sysing-eigene Anreicherung?
- Welche Provenienz- und Freshness-Informationen werden gespeichert?
- Wie funktioniert Matching bei sicheren, unsicheren und unbekannten Zuordnungen?
- Welche Aktionen sind rein lesend?
- Welche Aktionen benötigen menschliche Freigabe?
- Was wird auditiert?
- Wie werden Fehler, Dubletten und Konflikte behandelt?
- Wie bleiben Provider und Fachlogik getrennt?
- Wie wird verhindert, dass ein erneuter Import AVKK oder andere Sysing-Anreicherungen überschreibt?

Erst danach beginnt die produktive Microsoft-Graph-/Exchange-Online-Thematik.

## 7. Post-BSF: Microsoft Graph und E-Mail

Geplante Reihenfolge:

1. **MS Graph Eingang** — Exchange-Online-Mailzugriff, Authentifizierung, sichere Mailklassifikation und Aufgabenentwurf. Graph-Rohdaten werden über dieselbe providerneutrale Pipeline `SOURCE → NORMALIZE → VALIDATE → MATCH → ENRICH → REVIEW → PERSIST → AVKK` verarbeitet. Unvollständige Daten sind zulässig; unsichere Zuordnungen werden als Kandidaten behandelt und benötigen Human Review.
2. **MS Graph Ausgang** — vorgefertigte E-Mail-Inhalte, Templates, Freigabe und Audit; zunächst Human-in-the-loop.
3. **KI-/Agenten-Ausbau** — kontrollierte Nutzung von Mail-, Dashboard- und später SharePoint-Kontext für Vorschläge und Automatisierungen.

Die Firmenmails stammen perspektivisch aus Exchange Online. Eine Weiterleitung auf private Konten ist nicht als Zielarchitektur festzuschreiben.

## 8. Verbindlicher Statusblock nach jedem Entwicklungs-/Lovable-Prompt

Nach **jedem** Entwicklungs- oder Lovable-Prompt muss eine kompakte Zusammenfassung für den Betreiber erstellt und, soweit der bestehende Prozess dies vorsieht, in den Projektstatus/Entwicklungsnachweis übernommen werden.

Mindestens auszugeben:

### VERSION / SPRINT

- Version
- Sprint/Arbeitspaket
- Status

### REIFEGRAD

- **MVP-Reifegrad: xx %**
- **BSF-Reifegrad: xx %**
- Was wurde mit diesem Prompt erreicht?

Nach Erreichen des MVP wird der MVP-Reifegrad auf **100 % / BASELINE** eingefroren. Danach ist BSF der aktive Reifegrad.

### PROBLEME / FINDINGS

- Critical
- High
- Medium
- Low
- neu aufgetreten
- behoben
- akzeptierte Restrisiken

### MANUELLE PRÜFUNGEN

- erforderlich
- bestanden
- offen

### QUALITY GATES

Mindestens, soweit im Projekt vorhanden/anwendbar:

- Tests
- Typecheck
- ESLint
- Prettier
- Build
- docs:check
- project-status:check
- rbac:check
- no-console
- Security
- Architecture
- Tech Debt

### ROADMAP / PROGNOSE

- **Geschätzte verbleibende Prompts bis MVP: ca. x**
- **Geschätzte verbleibende Prompts bis BSF: ca. x**

Die Schätzungen müssen nach jedem Prompt anhand des tatsächlich erreichten Stands neu bewertet werden. Sie dürfen nicht lediglich aus dem vorherigen Bericht übernommen werden.

### NÄCHSTER EMPFOHLENER SCHRITT

- Sprint/Arbeitspaket
- Ziel
- Begründung

### ENTSCHEIDUNG

- MVP: `GO` / `GO WITH FINDINGS` / `NO-GO`
- BSF: `ON TRACK` / `AT RISK` / `BLOCKED`

## 9. Governance

Bei Änderungen an dieser Roadmap gilt:

- GitHub bleibt Source of Truth.
- Relevante Änderungen werden dokumentiert und versioniert.
- Architekturentscheidungen mit langfristiger Wirkung werden als ADR betrachtet.
- Keine produktiven Schlüssel, Tokens, Passwörter oder Service-Role-Keys in Roadmap, Prompts oder Dokumentation.
- Fachlogik, Authentifizierung, Datenzugriff und Provider bleiben getrennt.
- Änderungen müssen testbar, dokumentiert, sicher, RBAC-/RLS-konform und containerfähig sein.

## 10. Meilensteinregel

Nach **MVP = 100 % / BASELINE** wird BSF der aktive Meilenstein.

Nach **BSF = 100 % / BASELINE** wird bewusst ein neuer Meilenstein definiert, bevor größere Integrationen fortgesetzt werden. Der derzeit vorgesehene nächste Horizont ist **Integration/Automation**, beginnend mit Microsoft Graph / Exchange Online.
