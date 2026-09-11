---
document_id: SYSING-IDEA-WALLBOARD
title: Operatives Management-Wallboard
document_type: TDF Managementkonzept
version: 0.5.0-draft
status: IDEA_ONLY
date: 2026-09-11
repository: bmarnau/sysingdashboard
related_issue: 123
authorship: ChatGPT (OpenAI), fachlich gesteuert durch Bernd Marnau und GF-Rueckmeldung
---

# Operatives Management-Wallboard

![Konzeptvisualisierung des operativen Management-Wallboards mit getrennten SharePoint-Kacheln fuer Projekte, Arbeitspakete, Taetigkeiten und Urlaub, PRTG-Infrastrukturstatus sowie reinen Exchange-Online-Postfachzaehlwerten.](assets/management-wallboard-v0.5.0-draft.jpg)

*Abbildung 1 - Management-Wallboard V0.5.0-draft nach GF-Feedback. KI-generierte Konzeptvisualisierung mit ChatGPT/OpenAI; Werte sind illustrativ, keine Produktabbildung.*

**Status:** IDEA / CONCEPT ONLY - keine Implementierungsfreigabe.

## 1. Management Summary

Die Geschaeftsfuehrung wuenscht fuer einen grossen Monitor im Systemhaus eine dauerhaft aktuelle, schnell erfassbare Managementsicht. Die Rueckmeldung konkretisiert das Zielbild und reduziert zugleich die technische Komplexitaet.

Die gewuenschten Bereiche sind:

| Bereich | Gewuenschte Darstellung | Quelle |
| --- | --- | --- |
| Projekte | eigene Kachel; Anzahl und Ampelstatus | SharePoint |
| Arbeitspakete | eigene Kachel; Anzahl und Ampelstatus | SharePoint |
| Taetigkeiten | eigene Kachel; Anzahl und Ampelstatus | SharePoint |
| Urlaub / Abwesenheit | nur aggregierte Anzahl fuer diese und naechste Woche | SharePoint |
| Infrastruktur | aggregierte Sensorlage rot/gelb/gruen | PRTG |
| Support-Postfach | nur Anzahl E-Mails: gesamt, heute, gestern, aelter | Microsoft 365 / Exchange Online |

**Kernaussage:** Das Sysing Dashboard bleibt die empfohlene Basis. SharePoint und Microsoft 365 / Exchange Online sind bereits im strategischen Ausbaupfad vorgesehen. PRTG ist die eigentliche neue Datenquelle.

## 2. Was aendert sich durch die praezisierte Idee?

Die Rueckmeldung aendert nicht das Ziel - eine dauerhaft sichtbare Geschaeftsfuehrungssicht - sondern Informationszuschnitt, Datenschutzprofil und technische Komplexitaet.

| Thema | Bisherige Idee | Praezisierte Idee | Auswirkung |
| --- | --- | --- | --- |
| Arbeitslage | Taetigkeiten und Projekte zusammengefasst | Projekte, Arbeitspakete und Taetigkeiten getrennt | bessere Ebenen- und Ursachenanalyse |
| Urlaub | nicht Bestandteil | Anzahl diese Woche / naechste Woche aus SharePoint | einfache zusaetzliche SharePoint-Auswertung |
| Support-Postfach | KI-Triage, Inhalte, Konfidenz, Traceability | nur Posteingang gesamt / heute / gestern / aelter | LLM und Inhaltsverarbeitung entfallen im Pilot |
| Live-Status-Bausteine | drei Agenten als Arbeitshypothese | drei Module bleiben, technisch zunaechst deterministische Provider/Collector | weniger Komplexitaet, Kosten und Fehlerrisiko |
| Datenschutz E-Mail | hoch wegen Inhaltsdaten und KI-Verarbeitung | deutlich reduziert durch reine Zaehlwerte | kein Mailinhalt auf Grossmonitor oder in KI-Pipeline erforderlich |
| Pilot | Integrations- plus KI-Pilot | read-only Integrations-/Wallboard-Pilot | klarer testbar und leichter abnehmbar |

### Managementwirkung

Die neue Idee ist fachlich praeziser und technisch einfacher. Fuer den bestaetigten Pilotumfang ist kein produktiver KI-Agent erforderlich. Die Bezeichnung Agent 1-3 kann als Projektname bestehen bleiben; technisch genuegen im ersten Schritt deterministische Read-Collector.

## 3. Eignung des Sysing Dashboards

Der aktuelle Produkt- und Architekturstand spricht fuer die Wiederverwendung des bestehenden Dashboards:

- Management- und Fuehrungssichten sind bereits Bestandteil des Produkts.
- RBAC/RLS, Server-Routes, Providertrennung und Governance sind vorhanden.
- SharePoint ist als produktive Integrationsquelle im spaeteren Ausbaupfad vorgesehen.
- Microsoft 365 / Exchange Online / Microsoft Graph sind ebenfalls im Ausbaupfad vorgesehen.
- Managementcockpit 2 und Integration Readiness sind im Gesamtplan verankert.
- Ein separates viertes Dashboard wuerde Rollen-, UI-, Reporting- und Betriebslogik duplizieren.

**Gesamturteil:** GUT GEEIGNET - unter Architekturauflagen.

## 4. Zielarchitektur

Das Wallboard ist eine read-only Aggregationssicht. Die Quellsysteme bleiben fachlich fuehrend. Providerspezifische Logik gehoert nicht in die UI.

```text
SharePoint -----------------> SharePoint-Collector -----\
PRTG Core Server -----------> PRTG-Collector -----------> normalisierte Status-/Freshness-Projektion
Exchange Online ------------> Mail-Statistik-Collector -/                    |
                                                                           v
                                                                  Sysing Dashboard
                                                                           |
                                                                           v
                                                          Management-Wallboard read-only
```

| Quelle | Collector / Provider | Gelieferte Werte | KI erforderlich? |
| --- | --- | --- | --- |
| SharePoint | SharePoint-Collector | Projekt-/AP-/Taetigkeitsstatus, Aenderungszeitpunkte, Urlaub aggregiert | Nein |
| PRTG | PRTG-Collector | Sensorstatus, Fehler/Warnungen/OK, Zeitstempel | Nein |
| Exchange Online | Mail-Statistik-Collector | Posteingang gesamt, heute, gestern, aelter, Zeitstempel | Nein |

### TDF-Simplicity-Test

Zuerst stabile, nachvollziehbare Read-Modelle bauen. KI erst dort ergaenzen, wo deterministische Regeln den Geschaeftszweck nicht ausreichend erfuellen. Fuer die aktuell bestaetigte Support-Mengenansicht ist ein LLM nicht erforderlich.

## 5. Fachliche Wallboard-Sicht

### 5.1 Projekte, Arbeitspakete und Taetigkeiten

Die drei Ebenen werden bewusst getrennt. Die Wallboard-Sicht zeigt verdichtete Managementwerte; Detailansichten bleiben in normalen rollenbasierten Sichten.

### 5.2 Urlaub / Abwesenheit

Quelle ist SharePoint. Auf dem Grossmonitor werden ausschliesslich aggregierte Mitarbeiterzahlen angezeigt. Vor Umsetzung ist fachlich zu entscheiden, ob `naechste Woche` alle Abwesenden der Folgewoche oder nur Mitarbeitende mit Urlaubsbeginn in der Folgewoche bezeichnet.

### 5.3 Support-Postfach

Die Exchange-Online-Sicht dient nur der Last-/Rueckstandsindikation. Inhalte, Betreff, Absender, Empfaenger oder KI-bewertete Dringlichkeit sind nicht Bestandteil des Wallboards.

Zielkennzahlen:

- Posteingang gesamt
- Heute
- Gestern
- Aelter

## 6. Management-Wallboard als eigene Betriebsart

Zielbild:

- dedizierter Wallboard-Benutzer,
- ausschliesslich read-only,
- automatische Aktualisierung,
- Grossmonitor-/Kiosk-Betrieb,
- keine normalen CRUD-, Admin-, Benutzerverwaltungs- oder Exportrechte,
- keine normale Inaktivitaetsabmeldung fuer genau diesen Wallboard-Anwendungsfall.

Die Session-Ausnahme ist eine bewusste Abweichung vom normalen Sicherheitsmodell und benoetigt vor Umsetzung eine eigene Architektur-/Security-Entscheidung. Sie darf nicht als generelle Ausnahme fuer andere Benutzer oder Ansichten eingefuehrt werden.

## 7. Datenschutz und Datenminimierung

Die GF-Rueckmeldung entschaerft die bisherige E-Mail-Thematik deutlich. Fuer das Wallboard werden keine Mailinhalte, Betreffzeilen, Absender oder Empfaenger benoetigt. Damit entfallen im Pilot die wesentlichen zusaetzlichen Datenschutz- und Qualitaetsrisiken einer inhaltlichen LLM-Triage.

Urlaubsdaten haben weiterhin personenbezogenen Ursprung, werden auf dem Wallboard aber nur aggregiert dargestellt. Auch bei reduzierter Sensitivitaet bleiben Berechtigung, Zweckbindung, Datenminimierung und die offene Sichtbarkeit auf einem Grossmonitor zu pruefen.

## 8. Konsolidierte Anforderungen

- REQ-001: Projekte, Arbeitspakete und Taetigkeiten MUESSEN getrennt dargestellt werden.
- REQ-002: SharePoint MUSS Status/Ampel und Aenderungszeitpunkte read-only liefern koennen.
- REQ-003: Urlaub/Abwesenheit MUSS aus SharePoint aggregiert als Mitarbeiteranzahl fuer diese und naechste Woche dargestellt werden.
- REQ-004: PRTG MUSS read-only Sensorzustaende in einem konfigurierbaren Intervall liefern; Pilotziel ca. zwei Minuten.
- REQ-005: Exchange Online MUSS ausschliesslich Posteingangs-Zaehlwerte nach definierten Altersklassen liefern; keine Inhaltsanalyse.
- REQ-006: Jede Domaene MUSS letzte erfolgreiche Aktualisierung/Freshness sichtbar machen.
- REQ-007: Das Wallboard MUSS unter einem dedizierten read-only Account betrieben werden.
- REQ-008: Die Session-Ausnahme MUSS technisch auf den Wallboard-Anwendungsfall begrenzt sein.
- REQ-009: Teilfehler einer Quelle DUERFEN die uebrigen Bereiche nicht unbrauchbar machen.
- REQ-010: Ampeln MUESSEN farbunabhaengig zusaetzlich mit Text/Zahlen verstaendlich sein.

## 9. Pilotvorschlag und Aufwand mit Sicherheitsreserve

Planungswerte, kein Festpreis. Ein Prompt bezeichnet einen abgegrenzten Engineering-Auftrag mit Abschlussbericht, Tests und Dokumentation.

| Arbeitspaket | Nettozeit | mit 30 % Reserve | Prompts |
| --- | ---: | ---: | ---: |
| Anforderungen, ADR/Vertraege, Datenmodell | 6-8 h | 8-11 h | 2-3 |
| SharePoint: Projekte/AP/Taetigkeiten + Urlaub | 10-16 h | 13-21 h | 3-5 |
| PRTG-Collector + Mapping | 12-18 h | 16-24 h | 3-5 |
| Exchange Online: Mail-Zaehlwerte | 8-12 h | 11-16 h | 2-4 |
| Wallboard-UI + Auto-Refresh + Freshness | 10-14 h | 13-19 h | 3-4 |
| Security, Tests, Dokumentation, Abnahme | 12-18 h | 16-24 h | 3-5 |
| **Gesamt technischer Pilot** | **58-86 h** | **ca. 77-115 h** | **16-26** |

Management-Planungsgroesse: etwa 10-15 Arbeitstage Gesamtaufwand fuer einen realistischen Pilot mit allen drei Quellen, wenn die Arbeiten neben dem Tagesgeschaeft erfolgen. Ein reiner UI-/Mock-Pilot ist deutlich kleiner und liegt grob bei 1-2 Tagen.

Empfohlene Abfolge:

1. P0 - Layout und Datenvertrag fachlich bestaetigen.
2. P1 - PRTG und Wallboard-Grundgeruest.
3. P2 - SharePoint-Domaenen und Urlaub.
4. P3 - Exchange-Online-Zaehlwerte.
5. P4 - Security/Wallboard-Betrieb und Abnahme.

## 10. Risiken und offene Entscheidungen

| Thema | Bewertung | Entscheidung / Kontrolle |
| --- | --- | --- |
| Wallboard ohne Idle-Logout | hoch | eigener ADR, dedizierter read-only Account, physische Zugriffskontrolle, Revocation |
| SharePoint-/PRTG-Reachability | hoch | Deploy-Ort und Netzwerkpfad des internen Collectors festlegen |
| SharePoint-Feldmapping | mittel | Canonical Import/Read Contract und reale Feldliste pruefen |
| Urlaubsdefinition naechste Woche | mittel | anwesend/abwesend vs. Urlaubsbeginn fachlich festlegen |
| Exchange-Online-Zaehlregel | mittel | Ordner, Zeitfilter, gelesen/ungelesen und `aelter` eindeutig definieren |
| Datenfrische | mittel | Schwellenwerte pro Quelle und letzte Aktualisierung definieren |

## 11. Einordnung in den bestehenden Gesamtplan

Die Idee wird nicht als sofortige Umsetzung behandelt. Sie passt in den vorhandenen Ausbaupfad des Sysing Dashboards: SharePoint-Vertrag/Importbasis, zentrale/synchronisierte Datenstrategie, Managementcockpit, Integration Readiness und erst danach produktive externe Integrationen. PRTG wird als neue Provider-Idee ergaenzt. Das GF-Feedback aendert die laufende Sprintreihenfolge nicht automatisch.

## 12. TDF-Abschlusscheck

| Pruefpunkt | Status | Nachweis / Bemerkung |
| --- | --- | --- |
| Zweck, Zielgruppe, Scope | PASS | Management-Wallboard und GF-Nutzen klar abgegrenzt |
| GF-Feedback | PASS | Projekte/AP/Taetigkeiten getrennt; Urlaub und Support-Zaehlwerte ergaenzt |
| Ist / Plan / Idee | PASS | IDEA ONLY und keine Implementierungsfreigabe ausdruecklich festgehalten |
| Architekturgrenzen | PASS | Quellen, Collector/Provider, Aggregation und UI getrennt |
| TDF-Simplicity-Test | PASS | im Pilot kein LLM/Agent erforderlich |
| Security / Least Privilege | PASS mit OPEN | Session-Ausnahme benoetigt eigene Architektur-/Security-Entscheidung |
| Datenschutz / Datenminimierung | PASS mit OPEN | Mailinhalte entfallen; Urlaub nur aggregiert; Grossmonitor-Sichtbarkeit bleibt zu pruefen |
| Aufwand / Sicherheitszeiten | PASS | Netto- und 30-%-Reserve getrennt ausgewiesen |
| Versionierung | PASS | 0.5.0-draft nach TDF Document Semantic Versioning |
| Visuelle Kommunikation | PASS | neues Managementbild, illustrative Werte und AI-Herkunft gekennzeichnet |
| Barrierefreiheit / Farbunabhaengigkeit | PASS mit HINWEIS | Ampeln werden mit Text/Zahlen erklaert; DOCX-Hero besitzt Alt-Text; Strukturaudit: 0 HIGH, 10 MEDIUM ausschliesslich durch layoutbasierte Callout-Tabellen |
| Layout | PASS | final gerendert und visuell geprueft; keine unbeabsichtigten Leerseiten, Ueberlagerungen oder abgeschnittenen Tabellen |

**TDF-Gesamtergebnis:** PASS MIT OFFENEN ARCHITEKTUR-/SECURITY-ENTSCHEIDUNGEN. Das Dokument ist als Management- und Entscheidungsgrundlage geeignet; es ist keine Implementierungsfreigabe.

## 13. Versionshistorie

Fruehere Arbeitsfassungen wurden mit der damaligen Kurznotation gefuehrt. Ab `0.5.0-draft` wird der TDF Document Semantic Versioning Standard (`MAJOR.MINOR.PATCH`) angewendet. Die Eintraege zu 0.1 bis 0.4 sind aus vorhandenen Arbeitsartefakten rekonstruiert.

| Version | Datum | Aenderung | AI-Unterstuetzung |
| --- | --- | --- | --- |
| 0.1 (historisch) | 11.09.2026 | Erstes Markdown-Konzept: drei Domaenen, SharePoint/PRTG/Support-Postfach, Collector-/Agentenidee und grobe Sprintplanung | Ja - ChatGPT (OpenAI) |
| 0.2 (historisch) | 11.09.2026 | Erste TDF-Managementfassung mit Sysing-Eignungsanalyse, Wallboard-Betriebsart, Pilotaufwand und Sicherheitsreserve | Ja - ChatGPT (OpenAI) |
| 0.3 (historisch) | 11.09.2026 | GF-Feedback eingearbeitet: Projekte/AP/Taetigkeiten getrennt, Urlaub aus SharePoint, Mailansicht auf Zaehlwerte reduziert | Ja - ChatGPT (OpenAI) |
| 0.4 (historisch) | 11.09.2026 | Neues Wallboard-Bild eingesetzt, Dokumentsteuerung ergaenzt, Agentenidee als drei Module mit deterministischen Collectorn praezisiert; Datenschutzbewertung geschaerft | Ja - ChatGPT (OpenAI) |
| 0.5.0-draft | 11.09.2026 | Aenderungsanalyse Alt/Neu, TDF-SemVer, Versionssynchronisation, AI-Transparenz/Alt-Text, A11y-Hinweis und Versionshistorie als letzter Dokumentabschnitt | Ja - ChatGPT (OpenAI), fachlich durch Bernd Marnau und GF-Rueckmeldung gesteuert |
