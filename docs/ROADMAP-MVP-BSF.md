# Sysing Dashboard — Verbindliche Roadmap MVP → BSF → Integration

Stand: 2026-08-14
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

Aktiver Abschluss: manuelle F-11-Mehrbenutzerabnahme, verbleibende UX-/Hardening-Punkte und formale MVP-Release-/Baseline-Freigabe.

Planungsgröße zum Stand dieses Dokuments: ungefähr **2 Prompts bis zur formalen MVP-Baseline**. Diese Schätzung ist nach jedem Prompt anhand des tatsächlichen Ergebnisses neu zu bewerten.

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

- Bestandsaufnahme anhand realer Strukturen und später bereitgestellter Screenshots,
- Mapping SharePoint → Sysing-Dashboard-Fachmodell,
- eindeutige Schlüssel und Beziehungen,
- Informationsflüsse und führende Datenquelle,
- zunächst READ/SYNC-orientiert,
- kein unkontrolliertes Rückschreiben,
- Konflikt-, Fehler- und Auditstrategie,
- Providertrennung für spätere Alternativen.

### 3.5 Betreiberhoheit, Backend und Portabilität

Der dokumentierte Befund F-15 zur plattformverwalteten Backend-Instanz wird im BSF konkret bearbeitet. Ziel ist der Nachweis, dass Lovable Cloud keine technisch unersetzbare Laufzeitabhängigkeit darstellt.

Zu betrachten sind mindestens:

- Betreiberzugriff und administrative Hoheit über Daten/Auth,
- Datenexport und Migration,
- Supabase-/Postgres-Portabilität,
- Backup/Restore,
- Docker-Betrieb,
- spätere Entra-ID-/Azure-SQL-/Azure-Storage-Fähigkeit,
- dokumentierter Exit-/Migrationspfad.

### 3.6 Managementcockpit und Rollen

Die rollenbezogenen Sichten werden auf Kunden- und reale Systemhauskontexte erweitert. Projektmanager, Systemingenieur, Führung und Administration erhalten jeweils fachlich geeignete Sichten, ohne Berechtigungen durch reine UI-Filter zu ersetzen.

### 3.7 Reporting

Reporting wird auf Kunden-/Projektkontexte erweitert. Excel bleibt als geplanter Ausbau zu betrachten. Bestehende PDF-/Word-/JSON-/CSV-Pfade sollen konsolidiert und providerneutral bleiben.

### 3.8 KI-/Agenten-Labor

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

### MVP-Baseline

Zur formalen MVP-Freigabe wird SYSING-001 auf den tatsächlich erreichten MVP-Endstand aktualisiert und als nachvollziehbare Baseline ausgegeben. Die bestehende Single-Source-Erzeugung für Word/PDF ist beizubehalten.

### Fortschreibung im BSF

Während BSF wird SYSING-001 schrittweise fortgeschrieben. Es soll mindestens abbilden:

- Idee, Problemstellung und Zielbild,
- Zielgruppen und Rollen,
- aktueller Funktionsstand,
- AVKK und Managementcockpit,
- Nutzen und Vorteile,
- Kundenmodell und Kundenverantwortung,
- Architektur und Providertrennung,
- Supabase/Backend und aktuelle Grenzen,
- SharePoint als spätere reale Datenquelle,
- schematische Informationsflüsse SharePoint ↔ Sysing Dashboard,
- Reporting und Dokumentausgabe,
- Automatisierungsstufen,
- KI-/Agenten-Zielbild und Mock-Labor,
- Docker-/On-Premises-Portabilität,
- spätere Entra-ID-/Azure-SQL-/Azure-Storage-Fähigkeit,
- bekannte Risiken und Findings,
- Roadmap MVP → BSF → Integration/Graph → Automatisierung/KI.

Umgesetzte, geplante, mögliche und rein konzeptionelle Inhalte sind klar voneinander zu kennzeichnen. Nichts Geplantes darf als umgesetzt dargestellt werden.

Zum BSF-Abschluss wird erneut eine definierte SYSING-001-Baseline erzeugt.

## 5. Bekannte Arbeitspakete bis BSF

Die folgende Reihenfolge ist eine rollierende Planung und kann aufgrund von Findings angepasst werden. Umfangsschätzungen sind keine Zusagen.

| Arbeitspaket | Inhalt | grobe Prompt-Schätzung |
| --- | --- | ---: |
| MVP F-11 Abschluss | Alex, Sam, Petra, Georg, Rollen-/Negativtests | 1 |
| MVP Release/Baseline | finale Gates, Prüfbericht, SYSING-001, Version/Tag/Baseline | 1 |
| BSF Planungs-/Architekturbaseline | Backlog, ADR-Review, Tech Debt priorisieren | 1 |
| Kundenmodell | Kunde, IDs, Beziehungen zu Projekt/AP/Tätigkeit | 1–2 |
| Kundenverantwortung | kundenbezogene Sichtberechtigung, RBAC/RLS, Cockpit | 2 |
| Zentrale Datenhaltung / Provider | Local-First-Grenze und Providerstrategie | 2–3 |
| SharePoint-Zielbild | Mapping, Schlüssel, READ/SYNC, Informationsflüsse | 2–3 |
| Betreiberhoheit / Portabilität | F-15, Docker, Backup/Restore, Exit-Pfad | 1–2 |
| Managementcockpit 2 | Kunden-, Projekt- und Portfoliosichten | 1–2 |
| Reporting 2 | Excel und kunden-/projektbezogene Berichte | 1–2 |
| KI-/Agenten-Labor | Mock-Daten, providerneutral, Human-in-the-loop | 2–3 |
| SYSING-001 Fortschreibung | TDF-Dokument auf BSF-Zielbild/-Stand bringen | 1–2 |
| BSF-Abnahme | technische/fachliche Baseline und Freigabe | 1 |

## 6. Integrations-Readiness-Gate nach BSF

Nach BSF wird vor Microsoft Graph ein eigener Meilenstein bzw. Gate definiert. Vor Beginn der Graph-Entwicklung müssen mindestens folgende Fragen belastbar beantwortet sein:

- Welche Systeme sind für welche Daten führend?
- Wie wird ein Kunde eindeutig erkannt?
- Wie werden Projekt, Arbeitspaket und Tätigkeit referenziert?
- Wie werden externe Informationen zugeordnet?
- Welche Aktionen sind rein lesend?
- Welche Aktionen benötigen menschliche Freigabe?
- Was wird auditiert?
- Wie werden Fehler, Dubletten und Konflikte behandelt?
- Wie bleiben Provider und Fachlogik getrennt?

Erst danach beginnt die produktive Microsoft-Graph-/Exchange-Online-Thematik.

## 7. Post-BSF: Microsoft Graph und E-Mail

Geplante Reihenfolge:

1. **MS Graph Eingang** — Exchange-Online-Mailzugriff, Authentifizierung, sichere Mailklassifikation und Aufgabenentwurf.
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
