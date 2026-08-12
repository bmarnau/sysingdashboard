# SYSING-001 — Sysing Dashboard Produktübersicht

## Dokumentmetadaten

- **document_id:** SYSING-001
- **title:** Sysing Dashboard Produktübersicht
- **subtitle:** Idee, Funktionen, Nutzen, Schnittstellen und Automatisierung
- **document_type:** Produkt- und Managementübersicht
- **owner:** Projekt Sysing Dashboard
- **version:** 0.1.0
- **release_date:** 2026-08-12
- **source_review_date:** 2026-08-12
- **language:** de-DE
- **lifecycle_status:** draft / living document bis MVP-Freigabe
- **confidentiality:** intern
- **canonical_repository:** https://github.com/bmarnau/sysingdashboard
- **production_reference:** https://sysingdashboard.lovable.app
- **keywords:** Sysing Dashboard, AVKK, Management-Cockpit, Supabase, RBAC, RLS, Reporting, Backup, Microsoft Graph, Automatisierung, KI, Systemhaus

## 1. Zweck und Zielgruppe

Dieses Dokument beschreibt das Sysing Dashboard aus Produkt-, Management- und Nutzungssicht. Es fasst die Idee, den erreichten Stand, die Kernfunktionen, den erwarteten Nutzen, die geplanten Schnittstellen und die Automatisierungsstrategie zusammen.

Zielgruppen sind insbesondere:

- Geschäftsführung,
- Projektmanager,
- Systemingenieure,
- App-Entwicklung und Administration,
- technische Entscheider,
- spätere Betreiber und Integrationsverantwortliche.

Das Dokument ist bewusst keine vollständige technische Spezifikation. Detailentscheidungen bleiben in Architektur-, Datenmodell-, ADR-, Sicherheits- und Betriebsdokumenten dokumentiert.

## 2. TDF-Einordnung

Dieses Dokument folgt den für den Anwendungsfall relevanten Prinzipien des Technical Documentation Framework (TDF), insbesondere:

- klare Dokumentmetadaten und Versionsführung,
- Trennung zwischen umgesetzt, geplant und empfohlen,
- managementorientierte Darstellung von Nutzen, Risiken und nächsten Schritten,
- nachvollziehbare Architektur- und Schnittstellenbeschreibung,
- maschinenlesbare Überschriften, Listen und Tabellen,
- TDF-konforme Vorbereitung für spätere PDF-/Word-Ausgabe,
- konsistente Terminologie,
- explizite Grenzen und Wartungshinweise.

Relevante TDF-Referenzen:

- `document-naming-standard.md`
- `document-semver-standard.md`
- `management-presentation-standard.md`
- `architecture-guidelines.md`
- `visual-communication-standard.md`
- `rendering-publishing-standard.md`
- `export-output-standard.md`
- `ai-retrieval-readiness-standard.md`

TDF ist Qualitäts- und Dokumentationsreferenz, keine Laufzeitabhängigkeit des Sysing Dashboards.

## 3. Die Idee

Das Sysing Dashboard soll den Arbeitsalltag eines Systemhauses in einer zentralen, nachvollziehbaren und sicher betreibbaren Anwendung bündeln.

Ausgangspunkt ist die praktische Situation, dass Aufgaben, Projekte, Arbeitspakete, Termine, Verantwortungen, Risiken und Kommunikation häufig über mehrere Werkzeuge verteilt sind. Dadurch entstehen Informationsverluste, unklare Prioritäten und zusätzlicher Abstimmungsaufwand.

Das Dashboard verbindet deshalb drei Ebenen:

1. **persönliche Arbeitssteuerung** — Was muss ich tun?
2. **Projektsteuerung** — Was ist im Plan, gefährdet oder kritisch?
3. **Managementsteuerung** — Wo besteht übergreifender Handlungs- oder Entscheidungsbedarf?

Die fachliche Grundlage bildet das AVKK-Modell:

- **A — Aufgabe:** Was soll erreicht oder erledigt werden?
- **V — Verantwortung:** Wer ist wofür verantwortlich?
- **K — Kompetenz:** Sind Wissen, Zeit, Material, Berechtigungen und weitere Voraussetzungen vorhanden?
- **K — Konsequenz:** Welche Auswirkungen entstehen bei Nichterfüllung oder Verzögerung?

AVKK dient der transparenten Aufgaben- und Risikosteuerung. Es ist kein Instrument zur automatisierten personenbezogenen Leistungsbewertung.

## 4. Aktueller Produktstand in Richtung MVP

### 4.1 Bereits umgesetzt

Zum aktuellen Stand sind unter anderem umgesetzt:

- Supabase-basierte Daten- und Authentifizierungsplattform,
- rollenbasierte Berechtigungen und Row Level Security,
- persönliche Sitzungssteuerung mit Inaktivitätstimeout,
- Tätigkeiten, Arbeitspakete und Projekte als bestehende Arbeitsobjekte,
- AVKK-Datenmodell und Reference Data in Supabase,
- persönlicher Bereich „Mein AVKK“,
- strukturierte Bewertung von Verantwortung, Kompetenz und Konsequenz,
- AVKK-Frühindikator für gefährdete Aufgaben,
- Auditierung relevanter Änderungen,
- Backupformat 2.0 mit Manifest und SHA-256-Prüfsummen,
- AVKK- und Reference-Data-Bestandteile im Backup,
- JSON-Export mit AVKK-Unterstützung,
- technischer Prüfbericht,
- Entwicklungstagebuch,
- Project Manifest und automatisierte Projektstatusprüfung,
- dokumentierte Security-Ausnahmen und Löschstrategie.

### 4.2 Bis MVP noch vorgesehen

Vor der MVP-Freigabe sind insbesondere noch vorgesehen:

- rollenabhängiges AVKK-/Management-Cockpit,
- realistische Systemhaus-Demo-/Testdaten für manuelle Abnahmen,
- konfigurierbarer Report-Service,
- gemeinsame PDF-/Word-/Druckvorlagen über Template-Provider,
- TDF-konforme Ausgabe- und Exportprüfung,
- vollständiger UI-/End-to-End-/Security-/Backup-/Export-Gesamttest,
- MVP-Abnahmebericht mit GO, GO WITH FINDINGS oder NO-GO.

## 5. Rollen und Sichten

Das Dashboard verwendet keine universelle Einheitsansicht. Rolle und realer Berechtigungsscope bestimmen die Verdichtung und den sichtbaren Arbeitskontext.

| Rolle | Primäre Frage | Typische Sicht |
| --- | --- | --- |
| Systemingenieur | Was muss ich als Nächstes tun? | Eigene Projekte, Arbeitspakete und Tätigkeiten nach Dringlichkeit und AVKK-Handlungsbedarf |
| Projektmanager | Sind meine Projekte im Plan? | Zugeordnete Projekte mit Drill-down auf Arbeitspakete, Tätigkeiten und AVKK |
| Geschäftsführer | Wo bestehen unternehmensweite Risiken? | Verdichtete Portfolio-/Projektübersicht mit kritischen und gefährdeten Themen |
| App-Entwickler/Admin | Was sehen die Rollen? | Role Preview innerhalb des realen Admin-/Entwicklerscopes |

Role Preview verändert ausschließlich Darstellung und Standardfilter. Es verändert niemals reale RBAC-/RLS-Berechtigungen.

## 6. Zentrale Funktionen

### 6.1 Persönliche Arbeitssteuerung

- eigene Aufgaben und Arbeitspakete,
- Suche, Filter und Sortierung,
- Termin- und Dringlichkeitssicht,
- persönliche AVKK-Bewertung,
- nachvollziehbare Gefährdungsgründe.

### 6.2 Projektsteuerung

Geplant bzw. im Managementausbau vorgesehen:

- Projektstatus im Plan / gefährdet / kritisch,
- offene und überfällige Arbeitspakete,
- Kompetenz-/Voraussetzungslücken,
- Konsequenzen auf Projekt und Kunde,
- Drill-down bis zur konkreten Tätigkeit.

### 6.3 Managementsteuerung

Geplant für Sprint 09:

- verdichtete Kennzahlen im berechtigten Scope,
- Handlungsbedarf vor dekorativer Statistik,
- kritische und gefährdete Projekte/Arbeitspakete,
- Kompetenzlücken als Unterstützungsbedarf,
- Konsequenz- und Risikosicht,
- verständliche Erklärung „AVKK verstehen“,
- keine Mitarbeiter-Rankings oder automatisierten Performance-Scores.

### 6.4 Backup, Portabilität und Nachweis

- Manifest-basiertes Backupformat 2.0,
- Prüfsummen und Integritätsprüfung,
- AVKK und Reference Data als reguläre Backupbestandteile,
- Quarantäne bei inkonsistenten Restore-Daten,
- JSON-Export für maschinenlesbare Weiterverarbeitung,
- technischer Prüfbericht als Freigabe- und Nachweisinstrument.

### 6.5 Reporting und Dokumentausgabe

Bis MVP vorgesehen:

- zentraler konfigurierbarer Report-Service,
- PDF,
- Druck,
- CSV und JSON,
- Word und Excel soweit im MVP-Scope freigegeben,
- Corporate Document Templates über einen austauschbaren Template-Provider,
- TDF-konforme Qualitätsprüfung für Ausgabe, Rendering und Export.

## 7. Nutzen und Vorteile

### 7.1 Für Systemingenieure

- klare Prioritäten,
- schneller Überblick über eigene Arbeit,
- frühe Sichtbarkeit fehlender Voraussetzungen,
- weniger Informationssuche,
- nachvollziehbare Verantwortung und Konsequenzen.

### 7.2 Für Projektmanager

- schneller Überblick über Projektzustand,
- frühe Erkennung gefährdeter Arbeitspakete,
- gezielte Unterstützung bei Kompetenz- oder Ressourcenlücken,
- Drill-down von Projekt bis Tätigkeit,
- weniger manuelle Statusaggregation.

### 7.3 Für die Geschäftsführung

- verdichtete Sicht auf Portfolio und Risiken,
- Konzentration auf Handlungs- und Entscheidungsbedarf,
- nachvollziehbare Ursachen statt Black-Box-Kennzahlen,
- bessere Priorisierung knapper Ressourcen,
- strukturierte Grundlage für Managementberichte.

### 7.4 Für Entwicklung und Betrieb

- GitHub als maßgebliche Quelle,
- Supabase als MVP-Plattform,
- Providertrennung für spätere Migrationen,
- dokumentierte RBAC-/RLS-Regeln,
- automatisierte Quality Gates,
- containerfähige Zielarchitektur,
- keine technisch unersetzbare Lovable-Cloud-Abhängigkeit.

## 8. Schnittstellen und Integrationsstrategie

### 8.1 Aktuelle MVP-Schnittstellen

Der MVP bleibt bewusst ohne zwingende Microsoft-365-/Azure-Abhängigkeit. Die Kernanwendung soll vollständig mit Supabase funktionieren.

### 8.2 Microsoft Graph nach MVP

Erste priorisierte externe Integration nach MVP:

```text
ARBION Exchange Online
        ↓
Microsoft Graph
        ↓
GraphMailProvider
        ↓
MailIngestionService
        ↓
TaskCandidate
        ↓
Benutzerprüfung
        ↓
Arbeitspaket + AVKK
```

Eine E-Mail erzeugt niemals autonom ein produktives Arbeitspaket. Der Benutzer bestätigt die Übernahme.

### 8.3 E-Mail-Ausgang

Nach stabiler Eingangsintegration:

```text
Arbeitspaket / Projekt / AVKK / Status
        ↓
CommunicationService
        ↓
versionierte Kommunikationsvorlage
        ↓
MailDraft
        ↓
Benutzerfreigabe
        ↓
GraphMailProvider
        ↓
ARBION Exchange Online
```

Der erste Versand erfolgt kontrolliert und benutzerbestätigt.

### 8.4 Weitere geplante Schnittstellen

- SharePoint,
- Kalender,
- Microsoft Entra ID,
- Azure SQL,
- Azure Table Storage,
- optional weitere Mail-/Dokumentenprovider,
- KI-Provider über providerneutrale Serviceschnittstelle.

## 9. Automatisierungsstrategie

Automatisierung wird stufenweise eingeführt.

### Stufe 1 — deterministisch

- Regeln,
- Filter,
- Reference Data,
- automatische Gefährdungsableitung,
- Backup-/Integritätsprüfung,
- standardisierte Report-/Mailvorlagen.

### Stufe 2 — KI-Copilot

Nach stabiler MVP- und Graph-Basis:

- E-Mail-Zusammenfassung,
- Vorschlag für TaskCandidates,
- Vorschlag für Titel, Beschreibung oder Termin,
- Kommunikationsentwürfe,
- Managementzusammenfassungen.

KI startet mit den Rechten:

- **READ** — analysieren,
- **PROPOSE** — Vorschläge erzeugen.

Produktive Änderungen oder externe Aktionen bleiben zunächst ausgeschlossen.

### Stufe 3 — kontrollierte Agenten

Später können einzelne EXECUTE-Aktionen zugelassen werden. Voraussetzung sind je Aktion:

- explizite Policy,
- RBAC,
- Risikoklasse,
- Freigaberegel,
- Limits,
- Idempotenz,
- Audit,
- Fehler-/Rollback-Verhalten,
- Not-Aus/Feature Flag.

## 10. Architekturprinzipien

```text
UI / Cockpit
      ↓
Hooks / Facades
      ↓
Fachservices
      ↓
Repositories / Provider
      ↓
Supabase / spätere externe Systeme
```

Verbindliche Prinzipien:

- Fachlogik kennt keine UI-Details.
- React-Komponenten greifen nicht direkt auf providerspezifische Datenzugriffe zu.
- Supabase ist MVP-Provider, nicht die fachliche Domäne.
- Microsoft Graph, Azure und KI werden als austauschbare Provider integriert.
- RBAC und RLS bilden die Sicherheitsgrenzen.
- keine produktiven Secrets im Client oder Repository.

## 11. Demo- und Testkonzept

Für manuelle Abnahmen werden reproduzierbare, vollständig fiktive Systemhaus-Szenarien verwendet, z. B.:

- Microsoft-365-Rollout,
- Firewall-/Netzwerk-Erneuerung,
- Infrastrukturmigration,
- Backup-/Restore-Projekt,
- Server-/Storage-Migration.

Die Testdaten enthalten bewusst Fälle wie:

- im Plan,
- gefährdet,
- kritisch,
- überfällig,
- fehlende Zeit,
- fehlendes Material,
- fehlende Berechtigung,
- hohe Kunden- oder Projektkonsequenz.

Die Daten dürfen keine realen Kunden-, Mitarbeiter- oder Zugangsinformationen enthalten.

## 12. MVP-Abnahme

Der MVP-Gesamttest umfasst insbesondere:

- alle relevanten UI-Komponenten,
- Rollen- und Scope-Sichten,
- Authentifizierung und Sessionmanagement,
- RBAC/RLS,
- AVKK-End-to-End-Abläufe,
- Backup und Restore-Prüfung,
- JSON-/CSV-/PDF-/Druck-/ggf. Word-/Excel-Ausgaben,
- Corporate Templates,
- responsive Darstellung,
- Accessibility-Basis,
- fachliche Plausibilität von Managementkennzahlen und Reports.

Die Freigabe erfolgt als:

- **GO**,
- **GO WITH FINDINGS**,
- **NO-GO**.

## 13. Grenzen und bekannte Entscheidungen

Aktuell ausdrücklich zu beachten:

- AVKK-Subject-Verknüpfung besitzt noch eine dokumentierte polymorphe Integritätsgrenze.
- AVKK-Backupdaten werden vor Restore vollständig geprüft; ein automatisches produktives Rückschreiben in Supabase ist aktuell bewusst nicht Bestandteil des Restore-Vertrags.
- dokumentierte Security-Ausnahmen werden nicht allein zur Scannerbereinigung verändert.
- Kontextindikatoren wie Belastung oder Kundenzufriedenheit bleiben fachlich von AVKK getrennt.
- Microsoft Graph, Entra ID, Azure und KI sind Post-MVP-Erweiterungen.

## 14. Entwicklungsweg

```text
Idee
  ↓
technischer Prototyp
  ↓
plattformfähiges Dashboard
  ↓
AVKK-Fachmodell
  ↓
persönlicher AVKK-Arbeitsplatz
  ↓
Management-Cockpit
  ↓
Report-Service und Corporate Templates
  ↓
MVP-Gesamttest
  ↓
MVP-Freigabe
  ↓
Microsoft-Graph-Integration
  ↓
Kommunikationsautomatisierung
  ↓
KI-Copilot
  ↓
kontrollierte Agenten
```

## 15. Pflege und Versionierung

Dieses Dokument ist bis zur MVP-Freigabe ein Living Document.

Pflegeregeln:

- relevante Funktions- oder Architekturerweiterung → mindestens MINOR-Version,
- reine Korrektur → PATCH-Version,
- grundlegende Änderung von Zweck, Zielgruppe oder Struktur → MAJOR-Version,
- umgesetzt/geplant dürfen nicht vermischt werden,
- Versionen und Status müssen vor PDF-/Word-Freigabe mit Repository und Produktstand synchronisiert werden.

Zum MVP soll aus derselben freigegebenen Quelle eine TDF-konforme PDF- und, sofern vorgesehen, Word-Fassung erzeugt werden.

## 16. Nächste geplante Aktualisierung

Nächste inhaltliche Aktualisierung nach Sprint 09:

- konkrete rollenbasierte Management-Sichten,
- final implementierte Kennzahlen,
- Systemhaus-Demo-Szenarien,
- tatsächlicher Kontextindikatorstatus,
- aktualisierte MVP-Reife.

Vor MVP-Freigabe folgen zusätzlich:

- Report-Service und Dokumentausgabe,
- finale Schnittstellenübersicht,
- Test-/Abnahmenachweise,
- MVP-Freigabestatus und bekannte Restpunkte.
