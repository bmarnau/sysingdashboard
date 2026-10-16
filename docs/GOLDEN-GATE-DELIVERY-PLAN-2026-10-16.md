# Sysing Dashboard – Golden-Gate Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans for each independently specified implementation slice. This document is the *delivery program*, not a substitute for the feature's approved design, TDD task plan, or exact-head release gates. Track individual tasks with checkboxes and commit-level evidence.

**Stand:** 2026-10-16  
**Status:** DELIVERY PLAN CANDIDATE – erst nach signierter Integration in `main` verbindlich.  
**Goal:** Das definierte Golden Gate mit einem vollständig verwendbaren, sicheren, dokumentierten und anhand synthetischer Daten demonstrierbaren Sysing Dashboard erreichen.  
**Architecture:** Bestehende Domänen-/Read-Modelle und Supabase-RLS-Sicherheitsgrenzen weiterverwenden, Fachlogik/Provider/UI trennen. Codex integriert Funktion und Tests über GitHub-PRs; Lovable implementiert und prüft UI in *isolierten, an einen überprüften GitHub-Stand gebundenen Varianten*.  
**Tech Stack:** TypeScript, React/TanStack Start, Supabase (Daten und Auth), Bun/Vitest, Playwright, GitHub Actions, Codex, Lovable.  
**Spec:** [Golden-Gate-Ziel/Scope #175](https://github.com/bmarnau/sysingdashboard/issues/175), [Projekt-Governance](docs/PROJECT-GOVERNANCE.md), [P0-Cockpit-Design in PR #176](https://github.com/bmarnau/sysingdashboard/pull/176) und nach Integration `docs/BSF-07-MANAGEMENT-COCKPIT-DESIGN.md`.  
**Strategische Reihenfolge:** GG-01 DONE → GG-02 Cockpit → GG-03 Management-Kiosk → GG-04 Kunden-PDF → GG-05 manueller Import → GG-06 Reporting → GG-07/08 Hardening & Golden Dataset → GG-09 finale Freigabe.  
**Tracking:** #175 ist der zentrale Golden-Gate-Tracker, #140/174 sind die BSF-07-Fachtickets. Dieser Plan ändert **nicht** das Golden-Gate-Ziel, sondern ersetzt die bisherige operative Ausführungsweise nach seiner Integration.

## 1. Verifizierter Ausgangspunkt / nicht verwechseln

| Sachverhalt | Evidenzstand 16.10.2026 |
| --- | --- |
| GitHub Source of Truth | `main@601874ec8684450b2ec6f7fe29e2a2c4e1ffe1e8` |
| BSF-03E / GG-01 | DONE; PR #185 + P5-PR #187 integriert; Issue #63 CLOSED |
| Lovable-Hauptprojekt | `IT Task Hub`, Project-ID `3c209338-443a-40f8-8a16-7c3c1b51da0e`, Code-Commit `601874ec...` |
| Veröffentlichtes GitHub-Release | weiterhin `v1.65.0`; Kandidat im Repository `1.68.0` |
| Tatsächlich publizierte Laufzeit | 1.68.0 **NICHT** automatisch als deployt annehmen; Runtime/Browser separat prüfen |
| Managementcockpit-Prototyp | Lovable `Cockpit Insights`, Project-ID `24ac2003-a75c-4b5f-af57-254ecdb406b3` – Designreferenz, nicht Produktcode |
| P0-Vertrag | PR #176 OPEN/DRAFT, alte Basis `b5acf3d`, Head `b33ab9196dd...`, 6 unsigned Commits, aktuell `mergeable=false` |
| Supabase-Stand GG-01 | Drei BSF-03E-Migrationen 3/3 im dokumentierten Lovable-Postflight bestätigt; neueste Änderungen jeweils separat prüfen |

Das illustrative Managementcockpit-Bild ist **kein** freigegebener KPI-/Datensatzvertrag. Keine erfundenen Summen, Trendpfeile, Kundenidentitäten oder Personenbewertungen übernehmen.

## 2. Verbindliches neues Lieferprinzip

1. **Nutzerwert zuerst:** Jede Fachiteration demonstriert einen vollständigen Nutzerpfad im überprüfbaren App-Kandidaten. TDD/CI ohne nutzbare Browserfunktion ist nur Zwischenstand, kein fertiger Liefergegenstand.
2. **Jeweils ein vertikaler Schnitt:** Kein weiterer paralleler Hauptfachsprint und keine zusätzlichen Prototypen ohne klaren Abnahmezweck.
3. **Vier getrennte Statusfelder:** `CODE_MERGED`, `GATES_PASS`, `PREVIEW_VERIFIED`, `PUBLISHED_VERIFIED`. Ein Feld darf das andere niemals ersetzen.
4. **Kurzer Zyklus:** Ideal 1–3 Arbeitstage je überprüfbarer Teillieferung, große Fachbereiche in mehrere solche Schnitte zerlegen. Keine fixe Termin-/Erfolgsgarantie; nach jedem Schnitt auf Grundlage realer Evidenz neu schätzen.
5. **Kein Endlos-Loop:** Bei eindeutigem Kleinfehler nach 15–20 Minuten ohne bestätigte Ursache stoppen, Ursache/Werkzeug/Scope prüfen und neu entscheiden (gemäß `docs/CODEX-GIT-CI-RULE.md`). Bei Sicherheits-/Provider-/Signing-Konflikt sofort fail-closed.
6. **Mehr Lovable, aber gezielt:** Verfügbare Credits bewusst für echte Bedienbarkeit, Variantenprüfung, responsive Layouts und Browserabnahme einsetzen. Kein Credit-Verbrauch für neue Bilder/Mockups ohne Produktbezug.
7. **Dokumentation gehört zur Umsetzung:** Handbuch, Changelog, Status, technischer Prüfbericht, AQGS und Projektmanifest bei jedem fachlich betroffenen Schnitt; nicht auf das Ende verschieben.
8. **Vorhandenes nutzen:** BSF-03A Controlling, BSF-03B Leistungsnachweis, BSF-03E P3b-Arbeitspakete, AVKK und vorhandene Kiosk-Provider niemals als parallele neue Fachmodelle nachbauen.

## 3. Codex / Lovable / GitHub – eindeutige Zuständigkeiten

| Tätigkeit | Federführung | Gegenprüfung / Nachweis |
| --- | --- | --- |
| Ist-Analyse, Komponenten- und Vertragsinventar, Sicherheitsrisiken | Codex | GitHub-Dateien und unabhängiger Review |
| Domänenlogik, Services, Supabase-Adapter, RLS/RBAC-/Negativtests | Codex | TDD + vollständige GitHub-CI/Security |
| Git-Branch, signierte Commits, PR, Minimal-Fixes, Merge-Konflikte | Codex | Verified-Signaturen, Exact-Head-Checks, sauberer Diff |
| Fachlich definierte UI und Bedienbarkeit | Lovable, **isolierter Variant** | Codex überträgt/prüft Diff gegen autoritativen GitHub-Tree |
| Echte Browserabläufe, 1280/820/390 und ggf. 1920/1366, Tastatur/Axe/Konsole | Lovable + Playwright/Codex | URL, geprüfter SHA, Rollenfall, Screenshots/Testprotokoll |
| Demo-/Golden-Daten, unabhängige Expected Results, feste Referenzzeit | Codex | fachliche Review, Golden-Validator |
| Integration in `main` | ausschließlich geprüfter PR-Prozess | exakter Head, Signing, CI, Security und Review |
| Release und Publish | separates freizugebendes Release-Gate | Live-URL, Runtime-Version/SHA, Demo-E2E; kein Auto-Publish |

**Lovable-Prozess je Arbeitspaket:** Ausgangs-`main`-SHA prüfen → neuen isolierten Variant/Remix mit nachweisbarer Exact-Tree-Bindung erstellen → **analysieren → umsetzen → testen → dokumentieren → Abnahmekriterien** → geänderte Dateien/Diff/Tests liefern. Fehlt die Bindung, keine schreibende Umsetzung. Keine regulären Writes im Lovable-Main-Projekt, keine unbeauftragten DB-/Auth-/Migration-/RLS-Änderungen und niemals Direkt-Merge/Publish aus einer Variant.

**Codex-Prozess je Arbeitspaket:** Start-SHA und sauberen isolierten Worktree ermitteln (bei problematischem OneDrive-Checkout außerhalb OneDrive) → Test RED → kleinste Implementierung GREEN → vollständige betroffene Regression → Signing → PR → Exact-Head-CI/Security → Review → Merge → Post-Merge-Nachweis.

## 4. Lieferpakete mit Sichtbarkeitsnachweis

### L0 – Vorhandenen Produktstand wieder praktisch nutzbar machen

**Zeitrahmen:** 1–2 Arbeitstage Orientierung, ohne Veröffentlichungsgarantie.  
**Codex:** GitHub/Runtime/Release/Schema/Versionen abgleichen; bestehende Benutzerwege Kunden → Projekt → AP → Tätigkeit, Leistungsnachweis, Vertretung und Kiosk mit synthetischen Referenzdaten in einem Smoke-Protokoll festhalten; fehlende Demo-Daten/Route/Build-Abweichungen als konkrete Blocker statt als pauschales „PASS“ ausweisen. Kein blindes Re-Release von 1.68.0.  
**Lovable:** Aktuelle Preview/UI mit konkreten Testrollen und Demo-Zuständen browserseitig prüfen; Systemstatus und sichtbaren Demo-Einstieg aufnehmen. Keine Veröffentlichung.  
**Abnahme:** Eine verlinkte, tatsächlich geprüfte App-Preview mit Datenstand, sichtbarer Version/Commit, mindestens einem reproduzierbaren End-to-End-Demopfad und Liste der noch nicht verfügbaren Funktionen. Separate Entscheidung, wann Kandidat 1.68.0 veröffentlicht werden darf.  
**Tracker:** #175; neues Issue nur bei eindeutigem technischen Blocker.

### L1 – GG-02 / BSF-07 P0-Klärung und bestehendes Design integrieren

**Zeitrahmen:** 1–2 Arbeitstage.  
**Codex:** [PR #176](https://github.com/bmarnau/sysingdashboard/pull/176) gegen den aktuellen `main` kontrakt-/dateigenau prüfen. Fachdesign, KPI-Quellen, Capability-Matrix, Zustandsvertrag, MC01–MC35-RED-Matrix und Golden-1.2.0-Plan über signierten Restack **oder** nachvollziehbaren Ersatz-PR übernehmen; veraltete GG-01-HOLD-Texte nicht wieder einführen. Vorhandene Issue #173-Dokumentationsdrift gezielt und historisch korrekt bewerten. Alte PR erst nach vollständig nachweisbarer Übernahme als SUPERSEDED schließen.  
**Lovable:** Vorhandenen `Cockpit Insights`-Prototyp read-only als Designreferenz anhand des P0-Vertrags bewerten; keine neue Fachlogik und keinen zweiten Prototyp erstellen.  
**Abnahme:** BSF-07-Design liegt auf signiert abgenommenem `main`; #174/#140 korrekt aktualisiert; P1-RED-Auftrag eindeutig startbar. Keine Release-/Deploy-Behauptung.  
**Wichtig:** `P0 DESIGN READY` ist nicht `BSF-07 DONE`.

### L2 – GG-02 erster nutzbarer Cockpit-Schnitt

**Zeitrahmen:** 3–5 Arbeitstage, jeweils kleinere Prüfschritte.  
**Codex:** Pure, providerneutraler Composer aus bestehendem ProjectControlling/CustomerPortfolio; serverseitige Capability-/Customer-/Systemhouse-Grenze mit User-JWT; keine neue Management-Role/Permission. RED→GREEN für Datenzustände, keine Rechteunion, ungültige IDs und IDOR/BOLA. Zuerst **eine** echte Managementfrage: „Welche meiner autorisierten Projekte erfordern Aufmerksamkeit – und warum?“  
**Lovable:** Isolierter, an den freigegebenen Kandidaten gebundener UI-Variant: Start-/Routensicht, Handlungsbedarf vor Statistik, 1–2 nachvollziehbare Drill-downs, AVAILABLE/EMPTY/PARTIAL/UNKNOWN/UNAVAILABLE/DENIED ohne geschönte Nullwerte.  
**Abnahme:** Berechtigter Projektmanager sieht Projekt-/AP-Kontext aus realen freigegebenen internen oder klar als Demo markierten Daten; unberechtigte Rolle sieht kein Objekt, keinen Count und keine ID. Preview/E2E/Responsive/A11y sind für diesen Schnitt belegt.

### L3 – GG-02 Managementcockpit vollständig

**Zeitrahmen:** 4–6 Arbeitstage.  
**Codex:** Bestehende AVKK-/Responsibility-/P3b-Arbeitspakete, CustomerPortfolio und Leistungsdaten ohne zweite KPI-Berechnung integrieren; Golden-Dataset gezielt auf 1.2.0 mit unabhängigen `expected/management-cockpit.json`-Werten erweitern. Fünf Darstellungs-/Rollenperspektiven; Engineer ohne Management-Capability bleibt im persönlichen Dashboard, Role Preview erzeugt keine Rechte. Keine personenbezogenen Rankings/Scores.  
**Lovable:** Fünf nutzbare Rollenoberflächen und konkrete Drill-downs zu Ursachen, Datenqualität und nächster Handlung. Desktop/Tablet/Mobil, Tastatur, Konsole, Axe; Komponente für Komponente gegen den echten Serververtrag prüfen.  
**Abnahme:** BSF-07 P0–P5, Fachsemantik, Rollen/Negativtests, Golden, technische Dokumentation, vollständige Exact-Head-Gates und Lovable-Browser-Evidenz PASS. **Erster großer, vollständig sichtbarer Meilenstein:** funktionsfähiges Managementcockpit als freigabefähiger Kandidat.

### L4 – GG-03 Management-Kiosk auf Cockpit-Daten

**Zeitrahmen:** 3–5 Arbeitstage.  
**Codex:** Bestehenden `KioskDataProvider` weiterverwenden; nur explizit freigegebene read-only Managementdaten aus BSF-07 anbieten; keine eigene KPI- oder Berechtigungslogik. Sicherheits-/Datenschutz-Negativtests.  
**Lovable:** Kiosk-/Wallboard-Layout auf 1920, 1366 sowie kompakteren Viewports, klare Datenstände und Quellen, lesbare Großbildsicht.  
**Abnahme:** Derselbe fachliche Status im Managementcockpit und im Kiosk; keine sensiblen Zusatzdaten, keine erforderliche externe Schnittstelle; Demo-Profil reproduzierbar.

### L5 – GG-04 Kunden-PDF mit TDF-Nachweis

**Zeitrahmen:** 3–5 Arbeitstage.  
**Codex:** Autorisierter Kundensnapshot (Kunde/Zeitraum/Projekte/APs/Leistungen/offene Arbeit/Datenqualität/Provenance), PDF-Vertrag, Snapshot-Reproduzierbarkeit, Kunden-Scope-/IDOR-Tests. Keine Kopplung der Laufzeit an die Reportfamilie und keine Rechnungslogik.  
**Lovable:** Bedienweg und Dokumentvorschau, visuelle PDF-Abnahme jeder Seite inklusive Umbrüche, Typografie und Mobil-/Desktop-Auslöser.  
**Abnahme:** Ein synthetischer Kunde kann einen vollständigen, fachlich korrekten, lesbaren und datensparsamen PDF-Bericht exportieren; Golden Expected Result/Render-Abgleich PASS.

### L6 – GG-05 manueller kanonischer Import und Demo-Reset

**Zeitrahmen:** 3–5 Arbeitstage.  
**Codex:** Providerneutraler Canonical-Import-Vertrag mit festen IDs, Normalisierung, Validation, Matching/Identity, Preview, manuellem Commit und Export-Import-Roundtrip; kontrollierter deterministischer Demo-Reset ohne Produktionsdatenrisiko.  
**Lovable:** Verständlicher Import-Dialog mit Vorprüfung, Fehler-/Warnzuständen und ausschließlich ausdrücklich bestätigtem manuellen Apply.  
**Abnahme:** Positiv-/Negativfixture, Identity-/Scope-Negativtests, idempotenter Roundtrip, importierbare Beispieldatei und klare Fehlermeldungen. Keine externe Automation.

### L7 – GG-06 Reporting 2 und Golden Reporting

**Zeitrahmen:** 3–5 Arbeitstage.  
**Codex:** Vorhandene PDF-/CSV-/JSON-Pfade regressionssicher erweitern, Provenance/Unknown/Partial, Management-/Kundenberichte auf freigegebenen Daten und unabhängige Golden Expected Results prüfen.  
**Lovable:** Berichtsauswahl, Bedienung und sichtbare Vorschauen; Exportformate und Darstellung gegenüber derselben Referenz kontrollieren.  
**Abnahme:** Interne Management- und Kundenberichte sind ohne Graph, SharePoint oder weitere Fremdsysteme nutzbar; Datenstände, Fehlstellen und Fachdefinitionen sind nachvollziehbar.

### L8 – GG-07/08/09: Gesamt-Hardening, Golden-Demo und finale Freigabe

**Zeitrahmen:** 4–7 Arbeitstage, abhängig von tatsächlichen Befunden.  
**Codex:** Vollständiger Golden-Demoablauf vom Login bis Import, Arbeitspaket, Leistung, Cockpit, Kiosk, Kunden-PDF, Reporting, Export, Backup/Restore; alle relevanten Rollen/Scopes einschließlich Negativfälle. CI, Schema Drift, Security Advisor, RLS/RBAC, Signaturen, SemVer/Tags, technischer Prüfbericht, Changelog, Hilfe und Projektstatus nachziehen. Bekannte Dokumentationsdrifts (#173) und Accessibility-Befund (#172) schließen oder ausdrücklich freigeben/bewerten.  
**Lovable:** Reale UI-Abnahme des **exakten Kandidaten** über Browsermatrix und komplette Golden-Demo-Tour. Freigabe von Publish **erst** nach gesondertem Go/No-Go; veröffentlichte Runtime/Version/SHA und Supabase-Ziel erneut nachprüfen.  
**Abnahme:** Die Anforderungen aus #175 GG-09 sind einzeln belegt, kein offener CRITICAL/HIGH-Sicherheitsbefund, keine unbestätigten PASS-Statusanzeigen, Golden Expected Results PASS. Erst dann `GOLDEN_GATE=PASS`.

## 5. Orientierung und Promptbudget – keine PASS-Kennzahl

| Lieferpaket | Codex-Aufträge (Schätzung) | Lovable-Prompts (Schätzung) | Sichtbares Ergebnis |
| --- | ---: | ---: | --- |
| L0 Basis nutzbar | 3–5 | 2–3 | geprüfte Preview und Demo-Tour |
| L1 BSF-07 Vertrag | 3–5 | 1–2 | eindeutiges P0-Gate |
| L2 Cockpit erste Funktion | 7–12 | 4–7 | erster nutzbarer Management-Drill-down |
| L3 Cockpit komplett | 8–14 | 5–9 | fünf Perspektiven mit autorisierten Daten |
| L4 Management-Kiosk | 6–9 | 4–7 | Großbildansicht |
| L5 Kunden-PDF | 6–10 | 3–6 | fertiger Kundenbericht |
| L6 manueller Import | 7–10 | 2–4 | Import/Validierung/Roundtrip |
| L7 Reporting | 7–10 | 3–5 | nutzbare Reports |
| L8 Golden Gate | 8–12 | 4–6 | Gesamtabnahme |
| **Gesamt** | **55–87** | **28–49** | **funktionsfähiger MVP** |

Schätzwerte sind **Arbeits-/Promptbudget**, keine Garantie und kein Produktfortschrittsmaß. Sie lösen die frühere grobe Budgetannahme aus PR #176 als **neu zu validierende Planung** ab; Ausführung und Befunde können es deutlich verändern. Freie Lovable-Credits sind kein Grund für einen künstlichen zusätzlichen Scope.

## 6. Abnahme je Schnitt – evidenzbasiertes Lieferprotokoll

Jede Iteration endet mit genau einem kompakten GitHub-Issue-/PR-Eintrag:

```text
DELIVERY_ID =
BASE_MAIN_SHA =
PR / EXACT_HEAD =
VERIFIED_SIGNING = YES|NO|BLOCKED
CODE_MERGED = YES|NO
EXACT_HEAD_CI = PASS|FAIL|BLOCKED
EXACT_HEAD_SECURITY = PASS|FAIL|BLOCKED
SUPABASE_SCHEMA_RLS_RBAC = PASS|FAIL|NOT_TOUCHED|BLOCKED
GOLDEN_EXPECTED = PASS|FAIL|NOT_TOUCHED
LOVABLE_PROJECT_OR_VARIANT =
LOVABLE_BASE_TREE_MATCH = YES|NO|BLOCKED
PREVIEW_URL =
BROWSER_ROLE_DEMO = PASS|FAIL|BLOCKED
VIEWPORT_A11Y_CONSOLE = PASS|FAIL|BLOCKED
RELEASE_TAG =
PUBLISHED_RUNTIME_SHA = VERIFIED:<sha>|NOT_VERIFIED|NOT_PUBLISHED
DOCS_HELP_TECHNICAL_REPORT = PASS|BLOCKED
USER_VISIBLE_RESULT =
OPEN_FINDINGS_WITH_OWNERS =
NEXT_DELIVERY =
```

Die Veröffentlichung erhält **ein eigenes** Go/No-Go nach vollständiger Kandidatenabnahme. `main`-SHA, Lovable-Code-Commit, GitHub-Release-Tag und live laufende Runtime-SHA sind vier unterschiedliche Belege. Kein Feld wird aus einem anderen geraten.

## 7. Global Constraints / Schutzregeln

- GitHub ist die einzige maßgebliche Quelle für Fachcode und Doku; Branch Protection und signierte/verifizierte Commits gelten. Keine direkten `main`-Writes.
- Supabase bleibt MVP-Daten-/Auth-Provider; Zielprojekt-ID vor jeder DB-Aktion unabhängig und eindeutig prüfen. Kein Service-Role-Key im Browser und keine Secrets in Ausgaben oder Prompts.
- Keine RLS-/RBAC-Änderung ohne gesonderten dokumentierten Scope; bestehende serverseitige Customer-/Systemhouse-Grenzen und User-JWT bleiben Sicherheitsgrenze.
- Fachlogik getrennt von UI, Authentifizierung, Datenzugriff und Supabase-Adaptern; langfristige Entra/Azure-/Docker-Portabilität darf nicht verbaut werden.
- Golden-Dataset `sysing.golden.v1`, aktuelle ausführbare Dataset-Version **1.1.0** als Ausgangsbasis; Erweiterung auf 1.2.0 erst nach beabsichtigter, geprüfter Migration der Fixtures. Feste Referenzzeit, keine zufälligen Daten und kein `now()`-Test.
- Datenzustände: `AVAILABLE`, `EMPTY`, `PARTIAL`, `UNKNOWN`, `UNAVAILABLE`, `DENIED`. Keine „0 = unbekannt“-Abkürzung.
- Keine Mitarbeiter-/Personenrankings, keine erfundenen Kombiscores, keine Customer-Korrelation über Namen, keine zweite Management-Source-of-Truth.
- Technische Prüfung gemäß AQGS/`quality-gates.yaml`: Static, Unit, Backend, API, Security, RLS/RBAC, Schema, Import/Export, Backup/Restore, Build, Browser/E2E, A11y, Golden und technischer Prüfbericht je nach betroffenem Scope; kompletter aktueller CI/Security- und Abschlussgate vor Merge. `no_silent_skip` und exakte SHA-Evidenz bleiben verbindlich.
- Nach Golden Gate erst Docker/On-Premises-Verifikation, Microsoft Graph, produktive Microsoft-Integrationen, Azure-/Entra-Migration, MCP/Agenten.
- Es werden **keine** unkontrollierten produktiven Schema-/Datenbank-/Deploy-Änderungen allein zur Erfüllung einer Demo durchgeführt.

## 8. Sofort nächster Auftrag (Codex + Lovable)

**Codex, jetzt L0+L1 beginnen:** 
1. Aktuellen `main`, PR #176, offene Issues, Signing und CI lesen; im lokalen Repo den geschützten Worktree prüfen.
2. Eine tatsächlich testbare Vorschau des derzeitigen Funktionsumfangs 1.68.0 und vorhandene Demo-Nutzerpfade **ohne Publish** evidenzbasiert feststellen (falls nur Cloud-Browser verfügbar, fehlenden Zugang als `BLOCKED` dokumentieren).
3. P0-Design von PR #176 auf den aktuellen `main` signiert integrieren (alter Draft nicht blind mergen); nur diesen Scope verändern.
4. Exact-Head-Gates und unabhängigen Review bestehen; alten PR #176 nach vollständigem Ersatz schließen oder integrieren, Status #174/#140/#175 synchronisieren.
5. Danach L2 mit erstem RED→GREEN-Fach-/Read-Vertrag starten; Lovable-UI-Variante erst an den geprüften neuen Kandidaten binden.

**Lovable, parallel nur read-only bis Branch-Bindung:** Vorhandene Cockpit-Prototyp-Evidenz und Hauptprojekt-Preview vergleichen; dem Codex-Auftrag gezielt UI-Gaps und Benutzerpfad-Abnahmekriterien liefern. Sobald die neue Variant auf **exakt dem geprüften GitHub-Kandidaten** basiert: Analyse → gezielte Implementierung → Tests → Dokumentation → konkrete Browserabnahme. Kein direkter `main`-Write und kein Release/Publish.

**Go/No-Go für die erste sichtbare Lieferung:** Der erste Management-Drill-down funktioniert mit eindeutig erlaubtem Demo-/internem Scope, ein gesperrter Nutzer erhält keine Daten, die UI-Zustände bleiben ehrlich, und der Benutzer kann ihn in der überprüften Lovable-Preview selbst bedienen.

## 9. Planpflege

- Nach jedem Lieferpaket in #175: Ergebnis, Evidenz, Ist-Status, neue Restschätzung und nächster Schnitt.
- Eine Änderung an Reihenfolge oder Scope benötigt Begründung und aktualisierten Plan – keine zweite parallele Roadmap.
- Das vorhandene Issue #175 definiert weiter das **Ziel**; dieser Plan definiert nach Merge die **Liefersteuerung**; `docs/SPRINT-PLAN-MVP-BSF.md`, `docs/PROJECT-STATUS.yaml` und `docs/CURRENT-STATUS.md` spiegeln den tatsächlichen Stand.
- Wenn GitHub-Dokumentations-/Planungscommit unsigned bleibt: **nicht mergen**. Codex muss den Tree im signierten Kandidaten übernehmen und CI/Security für den neuen Exact Head bestätigen.

**Erfolgskriterium:** Nicht die Anzahl geschlossener Tickets, sondern die Zahl nachweislich nutzbarer, sicherer und überprüfbarer Nutzerpfade wächst.