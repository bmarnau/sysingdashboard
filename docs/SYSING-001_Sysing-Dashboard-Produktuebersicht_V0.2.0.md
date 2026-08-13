# SYSING-001 — Sysing Dashboard Produktübersicht

## Dokumentmetadaten

- **document_id:** SYSING-001
- **title:** Sysing Dashboard Produktübersicht
- **subtitle:** Idee, Funktionen, Nutzen, Schnittstellen und Automatisierung
- **document_type:** Produkt- und Managementübersicht (Living Document)
- **owner:** Projekt Sysing Dashboard
- **version:** 0.2.0
- **release_date:** 2026-08-13
- **source_review_date:** 2026-08-13
- **release_candidate:** Dashboard v1.58.0 (Sprint 09B, MVP Release Candidate)
- **classification:** intern

## 0. Lesehinweis und Kennzeichnung

Dieses Dokument beschreibt sowohl den heutigen Funktionsumfang als auch die
beabsichtigte Weiterentwicklung. Jede Aussage trägt eine Kennzeichnung:

| Kennzeichnung                | Bedeutung                                                   |
| ---------------------------- | ----------------------------------------------------------- |
| UMGESETZT                    | im Release Candidate vorhanden und geprüft                  |
| IN ERPROBUNG                 | vorhanden, aber noch nicht abschließend fachlich abgenommen |
| GEPLANT / POST-MVP           | bewusst nach dem MVP eingeplant                             |
| MÖGLICHE SPÄTERE ERWEITERUNG | Ideenstand, keine Zusage, keine beschlossene Roadmap        |
| BEKANNTE GRENZE              | bewusste Einschränkung mit dokumentierter Begründung        |

## 1. Produktidee

Das Sysing Dashboard ist das persönliche Arbeits-, Steuerungs- und
Berichtswerkzeug für Systemingenieure eines Systemhauses. Es führt Projekte,
Arbeitspakete, Tätigkeiten, Zeiten, Verantwortung und Führungsinformationen an
einer Stelle zusammen und macht daraus belastbare Aussagen für die eigene
Arbeit, für die Projektsteuerung und für die Geschäftsführung.

Der fachliche Kern ist AVKK: **A**ufgabe, **V**erantwortung, **K**ompetenz
(Voraussetzungen), **K**onsequenz. AVKK beantwortet nicht „wer arbeitet wie
schnell", sondern „welche Aufgabe ist unklar, unbesetzt, ohne Voraussetzung
oder mit hoher Konsequenz belastet". Personenbezogene Rankings und
Leistungsbewertungen sind dauerhaft ausgeschlossen (ADR-0027).

## 2. Funktionsumfang des Release Candidate

| Bereich                                                                      | Stand                        |
| ---------------------------------------------------------------------------- | ---------------------------- |
| Authentifizierung über Lovable Cloud (Supabase), E-Mail/Passwort             | UMGESETZT                    |
| Rollen- und Rechtemodell (RBAC v2, 7 Rollen)                                 | UMGESETZT                    |
| Datenbankseitige Absicherung (RLS-Policies)                                  | UMGESETZT                    |
| Inaktivitäts-Abmeldung (konfigurierbar)                                      | UMGESETZT                    |
| Persönliches Arbeitsdashboard (Projekte, Arbeitspakete, Tätigkeiten, Zeiten) | UMGESETZT                    |
| AVKK-Arbeitsplatz „Mein AVKK"                                                | UMGESETZT                    |
| AVKK-Management-Cockpit (Führungssicht)                                      | UMGESETZT                    |
| Reference Data als Plattformdienst                                           | UMGESETZT                    |
| Reporting-Schicht mit Corporate Templates                                    | UMGESETZT                    |
| Ausgabeformate PDF, Druck, Word, JSON, CSV                                   | UMGESETZT                    |
| Ausgabeformat Excel                                                          | GEPLANT / POST-MVP           |
| Backup 2.0 mit Manifest und SHA-256                                          | UMGESETZT                    |
| Restore lokaler Daten                                                        | UMGESETZT                    |
| Automatischer Rückschreib-Restore der AVKK-Cloud-Daten                       | BEKANNTE GRENZE              |
| JSON-Import/-Export mit Vorschau und Rollback                                | UMGESETZT                    |
| Downloadbereich mit Aufbewahrungsregel                                       | UMGESETZT                    |
| Integriertes Benutzerhandbuch, Systemstatus, Log Viewer                      | UMGESETZT                    |
| Systemhaus-Demo-Datensatz für Schulung und Abnahme                           | UMGESETZT                    |
| Kontextindikatoren als produktive Erhebung                                   | GEPLANT / POST-MVP           |
| Microsoft Graph, Exchange Online, Entra ID                                   | GEPLANT / POST-MVP           |
| Azure SQL, Azure Table Storage, SharePoint                                   | GEPLANT / POST-MVP           |
| KI-Copilot, KI-Agenten                                                       | MÖGLICHE SPÄTERE ERWEITERUNG |

## 3. Nutzen je Rolle

**Systemingenieur (UMGESETZT).** Sieht den eigenen Arbeitsvorrat, Dringlichkeit,
Zeiten und die eigenen AVKK-Sachverhalte inklusive fehlender Voraussetzungen.
Erzeugt Leistungsnachweise und persönliche AVKK-Berichte.

**Projektmanager (UMGESETZT).** Sieht die eigenen Projekte mit Lage „im Plan",
„gefährdet", „kritisch" und „überfällig", die zugehörigen Arbeitspakete und
Tätigkeiten sowie AVKK-Lücken und deren Konsequenzen mit Drill-down.

**Geschäftsführer (UMGESETZT).** Sieht die Portfoliolage, kritische und
gefährdete Projekte, wesentliche Konsequenzen und den Handlungsbedarf, ohne in
die Detailarbeit einsteigen zu müssen.

**Administrator / App-Entwickler (UMGESETZT).** Verwaltet Benutzer und Rollen,
nutzt Role Preview zur Darstellungsprüfung, betreut Backup, Import/Export,
Systemstatus und Prüfberichte. Role Preview verändert ausschließlich die
Darstellung und umgeht weder RBAC noch RLS.

## 4. Architektur in Kurzform

- Frontend und serverseitige Funktionen in einer TanStack-Start-Anwendung (ADR-0001).
- Authentifizierung und Datenhaltung über Supabase; Zugriff ausschließlich unter
  RLS mit den Rechten des angemeldeten Benutzers (ADR-0025).
- Fachlogik, Auth-Adapter und Providerimplementierungen sind getrennt, damit ein
  späterer Wechsel zu Entra ID oder Azure SQL keine Fachlogik anfasst (ADR-0007, ADR-0020).
- Reporting arbeitet auf einem neutralen Dokumentmodell mit austauschbarer
  Template-Provider-Kette und garantiertem neutralem Fallback (ADR-0028).
- Backups tragen ein Manifest 2.0 mit Prüfsummen je Eintrag (ADR-0022).
- Führungsdaten werden historisiert statt gelöscht (ADR-0026).

## 5. Informationshoheit (Zielbild)

Welches System ist perspektivisch für welche Information zuständig:

| System            | Zuständigkeit                                                 | Stand                         |
| ----------------- | ------------------------------------------------------------- | ----------------------------- |
| Legacy SharePoint | reale operative Projekte, Arbeitspakete, Tätigkeiten          | GEPLANT / POST-MVP als Quelle |
| Sysing Dashboard  | AVKK, Steuerung, Aggregation, Managementsicht, Arbeitskontext | UMGESETZT                     |
| Supabase          | Daten- und Authentifizierungsplattform des MVP                | UMGESETZT                     |
| Exchange Online   | E-Mail-Kommunikation                                          | GEPLANT / POST-MVP            |
| Microsoft Graph   | Integrationsschnittstelle zu Microsoft 365                    | GEPLANT / POST-MVP            |
| KI                | Analyse, Zusammenfassung, Vorschläge                          | MÖGLICHE SPÄTERE ERWEITERUNG  |
| Agenten           | später kontrollierte, freigabepflichtige Aktionen             | MÖGLICHE SPÄTERE ERWEITERUNG  |

## 6. Zukunftsbild und Informationsflüsse

### 6.1 Legacy SharePoint (GEPLANT / POST-MVP)

Heute existiert ein älterer lokaler SharePoint mit den realen operativen
Systemhausdaten: Projekte, Arbeitspakete, Tätigkeiten. **AVKK existiert dort
nicht.** AVKK ist eine zusätzliche Fachschicht des Sysing Dashboards und darf
niemals als SharePoint-Bestand dargestellt werden.

```text
Legacy SharePoint
Projekte / Arbeitspakete / Tätigkeiten
        |
        v
SharePoint Provider / Mapping
        |
        v
Sysing Domain Model
        |
        v
AVKK als zusätzliche Sysing-Fachschicht
        |
        v
persönliche Sicht / Projektsteuerung / Management
        |
        v
Reporting / Kommunikation / spätere KI
```

### 6.2 Integrationsstrategie SharePoint (GEPLANT / POST-MVP)

Erstes Zielbild ist **READ / SYNC**: Lesen und Abgleichen operativer
Arbeitsobjekte in Richtung Sysing. Eine automatische bidirektionale
Synchronisation ist **nicht** beschlossen; ein Zurückschreiben nach SharePoint
wäre eine eigene Architekturentscheidung mit eigenem ADR. Für ein belastbares
Mapping werden später Screenshots, Feldlisten und reale Strukturinformationen
des bestehenden SharePoints ausgewertet.

### 6.3 Microsoft Graph und Exchange Online (GEPLANT / POST-MVP)

```text
Exchange Online -> Microsoft Graph -> Mail Ingestion -> TaskCandidate
        -> Benutzerprüfung -> Tätigkeit / Arbeitspaket -> AVKK
```

In der ersten Stufe entsteht **keine** produktive Aufgabe ohne Benutzerprüfung.

### 6.4 E-Mail-Ausgang (GEPLANT / POST-MVP)

```text
Sysing / Projekt / AVKK -> Kommunikationsvorlage -> Mailentwurf
        -> Benutzerprüfung -> Microsoft Graph -> Exchange Online
```

### 6.5 KI-Copilot (MÖGLICHE SPÄTERE ERWEITERUNG)

```text
SharePoint  \
Exchange     >  normalisierte Sysing-Informationen -> KI-Copilot (READ / PROPOSE)
AVKK        /                                        |
                                                     v
                              Analyse / Zusammenfassung / Vorschläge
                                                     |
                                                     v
                                            Benutzerentscheidung
```

### 6.6 Agent Lab (MÖGLICHE SPÄTERE ERWEITERUNG)

Lernumgebung ausschließlich auf Mock- und Demodaten, ohne produktive
EXECUTE-Rechte:

```text
Mock SharePoint + Mock E-Mails + Mock AVKK
        -> AI Agent Provider (z. B. ein Claude-Demo-Agent als erstes Experiment)
        -> READ / PROPOSE
        -> Risiken erkennen / zusammenfassen / Maßnahmen vorschlagen / Mailentwurf vorschlagen
        -> Benutzerreview
```

Die Architektur bleibt providerneutral:

```text
AgentContextService -> AiAgentProvider -> konkreter Modell-/Agentprovider
```

Ein konkreter Anbieter ist ein austauschbares Experiment, keine dauerhafte
Architekturabhängigkeit.

### 6.7 Mögliche Reifegrade von Agenten (MÖGLICHE SPÄTERE ERWEITERUNG)

| Stufe | Inhalt                                                                      |
| ----- | --------------------------------------------------------------------------- |
| 0     | Mock-Daten, nur lesend                                                      |
| 1     | Mock-Daten, lesend mit Vorschlägen                                          |
| 2     | reale Daten, nur lesend                                                     |
| 3     | reale Daten, lesend mit Vorschlägen                                         |
| 4     | kontrollierte Tool-Aktionen mit expliziter Benutzerfreigabe                 |
| 5     | eng begrenzte automatisierte Aktionen mit Policies, Audit, Limits, Rückfall |

Dies ist ein Entwicklungs- und Lernmodell, keine beschlossene Roadmap.

## 7. Betrieb und Portabilität

- Betrieb heute auf der Lovable-Cloud-Plattform mit Supabase; die Anwendung
  bleibt containerfähig ausgelegt (UMGESETZT als Architekturprinzip,
  Docker-Betrieb IN ERPROBUNG).
- Keine Windows-Pfad-Hardcodierung in der Fachlogik; Vorlagen kommen über die
  Template-Provider-Kette (UMGESETZT).
- Secrets ausschließlich über die Secret-Verwaltung, niemals im Code
  (UMGESETZT).

## 8. Bekannte Grenzen

1. AVKK-Daten werden historisiert und nicht gelöscht (ADR-0026). Demo- und
   Testdaten dürfen deshalb **niemals** in eine Produktivinstanz eingespielt
   werden.
2. AVKK-Daten werden im Backup vollständig transportiert und geprüft, aber beim
   Restore nicht automatisch in die Cloud zurückgeschrieben.
3. Kontextindikatoren sind fachlich beschrieben, aber nicht produktiv erhoben.
4. Für den Leistungsnachweis existiert weiterhin ein eigener PDF-Pfad neben der
   zentralen Reporting-Schicht.
5. Excel ist als Ausgabeformat geplant, aber nicht umgesetzt.

## 9. Verweise

`docs/AVKK.md`, `docs/AVKK-CONTEXT-INDICATORS.md`, `docs/REFERENCE-DATA.md`,
`docs/DATA-SCHEMA.md`, `docs/DEMO-DATA.md`, `docs/MVP-PLAN.md`,
`docs/MVP-ACCEPTANCE-REPORT.md`, `docs/PROJECT-GOVERNANCE.md`, `docs/ADR/`.
