# Sysing Dashboard — Golden-Gate-MVP-Plan

Stand: 2026-10-11  
Status: **operative Zielplanung bis zum Golden Gate**  
Tracking-Issue: `#175`  
Repository: `bmarnau/sysingdashboard`

## 1. Ziel

Bis zum Golden Gate wird das Sysing Dashboard als **voll funktionsfähige, stabile, sichere und ausbaufähige interne MVP-Anwendung** fertiggestellt.

Das Golden Gate bewertet zuerst die Qualität und Vollständigkeit des Produkts selbst. Es setzt **keine Docker-/Containerplattform und keine produktive automatische externe Schnittstelle** voraus.

Die komplette App muss mit kontrollierten synthetischen Demo-/Golden-Daten reproduzierbar demonstrierbar und testbar sein.

## 2. Verbindlicher Scope bis zum Golden Gate

Bis zum Golden Gate gehören zum Pflichtumfang:

- Supabase als führender MVP-Daten- und Auth-Provider,
- Authentifizierung, RBAC, RLS, Customer Scope und Audit,
- Customer → Project → WorkPackage → Activity,
- Zeit-/Leistungsfluss einschließlich BSF-03B,
- AVKK, Responsibility, Vertretung und Arbeitspaketsicht,
- Managementcockpit 2,
- Management-Kiosk,
- Kunden-PDF und internes Reporting,
- manuelle Import-/Exportpfade,
- Backup/Restore-Nachweis,
- vollständig synthetische Demo-/Golden-Daten,
- reproduzierbare Golden Expected Results,
- Benutzerhandbuch, Hilfe, Systemstatus und technischer Prüfbericht,
- vollständige CI-, Security-, E2E-, Accessibility- und Quality-Gates.

## 3. Bewusst nicht Bestandteil vor dem Golden Gate

Die folgenden Themen werden **hinter das Golden Gate** verschoben:

- Docker / Containerisierung / On-Premises-Nachweis (`BSF-06 / #121`),
- Microsoft Graph,
- produktive Microsoft Entra ID-Anbindung,
- produktive SharePoint-/Exchange-/PRTG-Anbindungen,
- automatische externe Synchronisationen, Polling und Webhooks,
- Azure-SQL-/Azure-Storage-Migration,
- MCP, NAVIS und Agenten,
- autonome KI-Aktionen,
- externe Producer als Runtime-Abhängigkeit.

Providerneutrale Interfaces und Adaptergrenzen bleiben vor dem Golden Gate Pflicht, damit diese Erweiterungen später ohne Umbau der Fachlogik ergänzt werden können.

## 4. Arbeitsregel je Golden-Gate-Phase

`Analysieren → Vertrag/RED → minimal umsetzen → testen → Security/Scope prüfen → UI/Browser prüfen → dokumentieren → Exact-Head-Gate → Abschluss`

Kein fachlicher Expected Result wird nur deshalb geändert, weil Produktionscode einen Test nicht erfüllt.

## 5. Operative Reihenfolge bis zum Golden Gate

### GG-01 — BSF-03E abschließen

Status: **AKTUELL / Abschluss blockiert nur durch Signatur-Gate**

Tracking: `#63`, Draft-PR `#171`.

Pflicht:

1. fünf PR-Commits lokal signiert restacken,
2. Tree-Inhalt gegenüber dem abgenommenen Kandidaten unverändert halten,
3. Exact-Head CI + Security erneut PASS,
4. PR #171 mergen,
5. P5-Gesamtregression,
6. technischer Prüfbericht, Hilfe, Status, Changelog und Abschlussnachweis synchronisieren,
7. #63 schließen.

`P4 Bulk` bleibt optional und ist kein Golden-Gate-Pflichtumfang, solange kein fachlicher Blocker daraus entsteht.

### GG-02 — BSF-07 Managementcockpit 2

Tracking: `#140`, P0 `#174`.

Umsetzung P0–P5:

- capability-basierte Teilbereiche statt impliziter Rechteausweitung,
- fünf Sichten: Systemingenieur, Kundenverantwortlicher, Projektmanager, Teamlead, Administration/Führung,
- vorhandene AVKK-, Controlling-, Customer-Responsibility- und P3b-Verträge komponieren,
- keine zweite KPI-/Responsibility-Logik,
- Datenzustände `AVAILABLE`, `EMPTY`, `PARTIAL`, `UNKNOWN`, `UNAVAILABLE`, `DENIED`,
- `UNASSIGNED` und `NO_DUE_DATE` bleiben fachliche Zustände,
- keine Personenrankings/-scores,
- Drill-down Kunde → Projekt → AP → Ursache/AVKK,
- Golden Expected Results ergänzen.

Der vorhandene Lovable-Prototyp ist Designreferenz, nicht Source of Truth für Fachlogik.

### GG-03 — BSF-KIOSK-03 Management-Kiosk

Tracking: `#137`.

Pflicht:

- read-only Präsentation der in BSF-07 freigegebenen Managementsemantik,
- kein zweites Fachmodell und keine eigene Berechtigungslogik,
- Demo-/Golden-Provider vollständig nutzbar,
- Großbild-/Kiosk-Layout und Datenminimierung,
- keine externe Unternehmensschnittstelle erforderlich,
- reproduzierbare Browser-/Kiosk-Abnahme.

### GG-04 — BSF-03C Kunden-PDF / Kundenpaket

Tracking: `#98`.

Bis Golden Gate vollständig umsetzen:

- Sysingdashboard-Kunden-PDF,
- Kunde, Zeitraum und Datenstand,
- Projekte und Arbeitspakete,
- freigegebene Leistungen/Stunden,
- offene Arbeit und Termine,
- Datenqualität und Aussagegrenzen,
- Provenance und Datenminimierung,
- reproduzierbarer Snapshot,
- Golden-/Rendering-Abnahme.

Nicht vor Golden Gate:

- keine Runtime-Kopplung an die Reportfamilie,
- kein automatisches gemeinsames Kundenpaket aus externen Systemen.

### GG-05 — BSF-05A-light: Canonical Demo-/Import-Vertrag

Tracking: `#138`.

Bis Golden Gate bewusst auf manuelle interne Datenwege begrenzt:

- providerneutrales Canonical Import Model,
- synthetische Beispieldaten,
- manueller Dateiimport,
- Preview und Validierung,
- Provenance/Freshness/Unknown-Semantik,
- stabile Identity-/Matching-Regeln,
- deterministischer Demo-Reset,
- Export-/Import-Roundtrip.

Kein Graph, kein SharePoint-Automatikpfad, kein API-Polling, kein Webhook und kein Agent.

### GG-06 — BSF-09 Reporting 2 / Golden Reporting

BSF-09 wird vor das Golden Gate gezogen.

Pflicht:

- nutzbare interne Management-/Kundenreports,
- PDF/JSON/CSV regressionssicher,
- Reporting Expected Results im Golden Dataset,
- Datenstand und Provenance,
- Missing/Unknown korrekt,
- vollständig aus internen MVP-/Demo-Daten erzeugbar.

### GG-07 — Produkt- und Dokumentations-Hardening

Der bisherige DOC-01/02/03-Block wird als Golden-Gate-Hardening gebündelt.

Pflicht:

- Benutzerhandbuch/Hilfe vollständig aktuell,
- rollen- und routenspezifische Hilfe,
- belastbarer Systemstatus: Version, Datum, Git-/Build-Stand, Backend-/Datenstatus,
- technischer Prüfbericht aktuell zu Auth, RBAC, RLS, Supabase, DB, Security, Tests, Backup/Restore und Providergrenzen,
- AQGS-Nachweise,
- Changelog/SemVer/Tags konsistent,
- Dokumentationsdrifts wie `#173` schließen.

### GG-08 — Demo-/Golden-Baseline finalisieren

Pflicht:

- vollständig synthetische und versionierte Daten,
- feste Referenzzeit und stabile IDs,
- Customer, Project, WorkPackage, Activity,
- AVKK und Responsibility,
- Controlling und Leistungsnachweis,
- Managementcockpit und Kiosk,
- Kunden-PDF/Reporting,
- Negativfälle: Cross-Customer, Cross-Systemhouse, DENIED, UNKNOWN, PARTIAL, UNAVAILABLE, UNASSIGNED, NO_DUE_DATE,
- Expected Results unabhängig von Produktionscode,
- kompletter E2E-Demopfad ohne echte Unternehmensdaten.

### GG-09 — FINAL GOLDEN GATE

Golden Gate ist nur PASS, wenn alle vier Gate-Gruppen erfüllt sind:

#### Funktion

- Kernworkflow Customer → Project → WorkPackage → Activity vollständig nutzbar,
- Zeit/Leistung und Leistungsnachweis nutzbar,
- AVKK/Responsibility/Vertretung nutzbar,
- Managementcockpit nutzbar,
- Management-Kiosk nutzbar,
- Kunden-PDF/Reporting nutzbar,
- manueller Import/Export nutzbar,
- Backup/Restore geprüft.

#### Auth / Security

- Auth/MFA gemäß MVP-Vertrag,
- RBAC-Matrix vollständig,
- RLS/Customer Scope vollständig,
- IDOR/BOLA/Cross-Scope negativ getestet,
- keine Service Role im Browser-Normalpfad,
- keine CRITICAL/HIGH Security Findings,
- Supabase Advisor geprüft,
- keine Secrets in Code/Doku/Prompts.

#### Qualität

- vollständige CI PASS,
- Security PASS,
- Unit/Integration/E2E PASS,
- Browser-/Responsive-Matrix PASS,
- Accessibility PASS,
- Production Build PASS,
- Schema Drift PASS,
- Backup/Restore PASS,
- Technical Debt / Quality Gate PASS,
- technischer Prüfbericht aktuell.

#### Demo / Golden

- Golden Dataset Validator PASS,
- alle Golden Expected Results PASS,
- kompletter E2E-Demopfad reproduzierbar,
- keine externe Schnittstelle für die Demo erforderlich,
- Microsoft Graph ist für das Golden Gate nicht erforderlich.

## 6. Promptplanung ab 2026-10-11

### Zählregel

Als **Lovable-Prompt** zählt ein eigener, klar abgegrenzter Arbeitslauf an Lovable für UI/Preview, Browserabnahme oder plattformspezifische Prüfung.

ChatGPT-, GitHub-, Codex-, lokale Git-, CI-, Dokumentations- oder reine Analysearbeit zählt nicht als Lovable-Prompt.

Die Zahlen sind **Planungsbereiche und kein Verbrauchsziel**. Bereits vor Aktivierung dieses Plans verbrauchte Lovable-Prompts werden nicht nachträglich eingerechnet.

<!-- prettier-ignore -->
| Phase | Kurzinhalt | Noch geplante Lovable-Prompts | Einsatzschwerpunkt |
|---|---|---:|---|
| GG-01 | BSF-03E Abschluss | 0 | Git/Signatur/CI; Lovable nicht nötig |
| GG-02 | BSF-07 Managementcockpit 2 | 2–4 | UI-Verfeinerung, Rollen-/Responsive-/A11y-Gates |
| GG-03 | Management-Kiosk | 2–3 | Großbildlayout, Kiosk-Preview, Browsermatrix |
| GG-04 | Kunden-PDF | 1–2 | Preview-/Rendering-/Layout-Abnahme |
| GG-05 | Canonical Demo-/Import-Vertrag | 0–1 | optional Import-Preview; Kernvertrag außerhalb Lovable |
| GG-06 | Reporting 2 | 1–2 | Report-Preview und Rendering |
| GG-07 | Produkt-/Doku-Hardening | 0–1 | nur sichtbare Hilfe/Systemstatus-Preview |
| GG-08 | Demo-/Golden-Baseline | 1–2 | vollständiger Demo-E2E-/Visual-Smoke |
| GG-09 | Final Golden Gate | 1 | finaler visueller Exact-Head-Smoke |

**Noch erwarteter Lovable-Bedarf bis Golden Gate: etwa 8–16 Prompts.**

Wenn ein Gate ohne Lovable belastbar über GitHub CI, lokale Tests oder Codex nachgewiesen werden kann, wird der dafür geplante Lovable-Prompt nicht künstlich verbraucht.

## 7. Themen nach dem Golden Gate

Nach erfolgreichem GG-09 folgt eine neue Planungsbaseline:

1. BSF-04 zentrale/synchronisierte Datenstrategie, soweit dann noch erforderlich,
2. BSF-04A Vorlagen / wiederkehrende AP und Tätigkeiten,
3. BSF-06 Docker / Betreiberhoheit / Installierbarkeit,
4. Integration Readiness,
5. Microsoft Entra ID,
6. Microsoft Graph,
7. SharePoint / Exchange / PRTG,
8. Azure SQL / Azure Storage,
9. MCP / Agenten / NAVIS,
10. weitere Automatisierung.

## 8. Golden-Gate-Grundsatz

**Das Golden Gate bewertet ein vollständiges, stabiles, sicheres und reproduzierbares Produkt mit Demodaten – nicht die Anzahl bereits angeschlossener externer Systeme.**

Externe Automation folgt erst, wenn die interne Fachsemantik über Golden Dataset, Expected Results, Security- und E2E-Gates stabil bewiesen ist.

## 9. Traceability

- Golden-Gate-Tracking: `#175`
- aktueller Abschluss-Sprint: `#63` / PR `#171`
- Managementcockpit: `#140` / P0 `#174`
- Management-Kiosk: `#137`
- Kunden-PDF: `#98`
- Canonical Import: `#138`
- Dokumentationsdrift Golden 1.1.0: `#173`
- Docker/Post-Golden-Gate: `#121`

Dieses Dokument ist nach Merge die operative Planungsbaseline für den Weg bis zum Golden Gate. Historische Planungs- und Closure-Dokumente bleiben als Evidenz unverändert.
