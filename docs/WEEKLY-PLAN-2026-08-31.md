# Sysing Dashboard — Wochenplan 31.08.–04.09.2026

Stand: 2026-08-31  
Status: verbindlicher operativer Wochenplan  
Repository: `bmarnau/sysingdashboard`  
Ausgangs-`main`: `830eba42f7d9368fcc8080fc0d46b1a9c3d89325`

## 1. Ziel der Woche

Die Woche dient nicht dem parallelen Start möglichst vieler Themen, sondern dem kontrollierten Abschluss der aktuell offenen Sicherheits- und Datenbasisarbeit und dem anschließenden Übergang in den sichtbaren BSF-Nutzwert.

Verbindlicher roter Faden:

`SEC-02 abschließen -> BSF-02C implementieren und abnehmen -> BSF-03 beginnen/abschließen -> BSF-03A nur als Stretch-Ziel`

Ein Sprint gilt erst als abgeschlossen nach:

`Analysieren -> minimal umsetzen -> testen -> dokumentieren -> Abschlussbericht -> PR/Required Checks -> Abnahme`

GitHub bleibt Source of Truth. Datenbank-, Grant-, RLS- und vergleichbare Supabase-Änderungen erfolgen ausschließlich nach dem dokumentierten Database-Change-Governance-Prozess. Keine produktiven Schlüssel, Tokens, Passwörter oder Service-Role-Keys in Code, Prompts, Berichten oder Dokumentation.

## 2. Prioritäten dieser Woche

| Priorität | Sprint / Arbeitspaket                      | Wochenziel                                                                         | Status zu Wochenbeginn  |
| --------- | ------------------------------------------ | ---------------------------------------------------------------------------------- | ----------------------- |
| 1         | SEC-02 — Reference-Data Grants             | abgebrochenen Lauf vollständig bis READY FOR PR / DONE führen                      | JETZT ZUERST            |
| 2         | BSF-02C — gemeinsamer Customer-Read-Pfad   | minimale Shared Projection real implementieren, absichern und abnehmen             | HAUPTSPRINT             |
| 3         | BSF-03 — Kundenverantwortung / Kundensicht | `Meine Kunden` und sicheren Customer-Scope beginnen; bei gutem Verlauf abschließen | NÄCHSTER FEATURE-SPRINT |
| 4         | BSF-03A — Projektmanager-Leistungssicht    | Architektur/ersten kontrollierten Umsetzungsschritt vorbereiten                    | STRETCH                 |
| später    | BSF-03B — Teamlead Leistungsnachweis V1    | noch nicht vorziehen                                                               | GEPLANT                 |

## 3. Montag — SEC-02 vollständig abschließen

Issue: #91 `SEC-02: Reference-Data Grants nach Least Privilege härten`

### Ausgangslage

- Least-Privilege-Zielvertrag ist analysiert.
- `anon` / `PUBLIC`: keine Table Grants auf Reference Data.
- `authenticated`:
  - `reference_catalog`: nur `SELECT`,
  - `reference_value`: `SELECT, INSERT, UPDATE`,
  - `reference_value_history`: nur `SELECT`.
- kein fachlicher DELETE-/TRUNCATE-Pfad.
- RLS bleibt zweite Schutzschicht.
- reproduzierbares Testartefakt `supabase/tests/sec02-reference-data-grants.sql` mit T01–T24 ist vorbereitet.
- letzter Lauf wurde wegen Creditlimit vor vollständigem Abschluss abgebrochen.
- fachlich notwendige Seed-Korrektur: der Benutzer für T07 darf keine durch `on_auth_user_created` automatisch vergebene Viewer-Rolle behalten; der Test muss tatsächlich `ohne referencedata.view` prüfen.

### Arbeitsauftrag

1. vorhandenen Arbeitsstand übernehmen, nicht neu beginnen.
2. T07-Seedkorrektur dauerhaft in das Testartefakt übernehmen.
3. T01–T24 vollständig real ausführen.
4. Grant-/RLS-/Trigger-Semantik gegen den Zielvertrag prüfen.
5. keine neuen DELETE-Policies einführen.
6. AVKK-/Reference-Data-Regression prüfen.
7. produktive/ungewollte Lovable-Overlay-/Auth-Dateien ausschließen.
8. Dokumentation synchronisieren.
9. Security + vollständige CI auf exact PR head.
10. Abschlussbericht mit PASS/BLOCKED und Evidenz.

### Gate SEC-02

DONE nur wenn mindestens:

- `anon` ohne Tabellenzugriff,
- `authenticated` nur mit Minimalgrants,
- `referencedata.view` Lesen PASS,
- ohne `referencedata.manage` Schreiben DENY,
- mit `referencedata.manage` vorgesehener Value-INSERT/UPDATE-Pfad PASS,
- DELETE/TRUNCATE DENY,
- History-/Versions-Trigger PASS,
- AVKK-/Reference-Data-Regression PASS,
- Security + vollständige CI PASS.

Falls ein technisches Limit die reale Ausführung blockiert: nicht künstlich PASS melden; Status `BLOCKED` mit exakt benanntem Restgate.

## 4. Hauptsprint — BSF-02C minimaler gemeinsamer Customer-Read-Pfad

Issue: #88 `BSF-02C: Minimaler gemeinsamer Read-Pfad Customer -> Project -> WorkPackage -> Activity`

Architektur-Baseline auf `main`:

- ADR-0032 / Shared-Projection-Design über PR #97 gemergt.
- Architekturentscheidung ist damit vorbereitet; jetzt folgt die minimale Runtime-/Datenbankumsetzung.

### Ziel

Serverseitig lesbarer, providerneutraler Mehrbenutzerpfad:

`Systemhouse -> Customer -> Project -> WorkPackage -> Activity -> Leistungserbringer`

### Verbindliche Grenzen

- kein Big-Bang-Umbau der vollständigen Local-First-Datenhaltung,
- BSF-04 nicht vorziehen,
- bestehende Project-/WorkPackage-/Activity-IDs wegen AVKK möglichst stabil halten,
- `project.client` bleibt Matchinghilfe und wird nicht zur Customer-Identität umgedeutet,
- fachliche Identität bleibt `(systemhouseId, customerId)`,
- Cross-Systemhouse DENY,
- Cross-Customer DENY,
- IDOR/BOLA DENY,
- globale Rolle bzw. `dashboard.view` allein erzeugt keinen Customer-Zugriff,
- Viewer erhält keine neuen Schreibrechte,
- UI-Gating ist keine Security Boundary,
- keine Service Role im Client,
- Provider-/Docker-/Azure-/Entra-Migrationsfähigkeit erhalten.

### Abnahme

- Shared Projection / minimaler Read-Pfad real vorhanden,
- Customer-Auflösung fail-closed,
- vorhandene lokale Daten nicht verloren,
- AVKK-Referenzen nicht unkontrolliert gebrochen,
- echte negative Server-/RLS-Tests PASS,
- Import/Export und Backup/Restore geprüft,
- Security + vollständige CI inkl. E2E, Accessibility, Technical Debt und `14 · Technical Report & Quality Gate` PASS,
- Dokumentation synchron,
- Merge nur über geschützten PR mit Expected-Head-SHA.

## 5. Nächster Feature-Sprint — BSF-03 Kundenverantwortung / Kundensicht

Startbedingung: BSF-02C ist vollständig abgenommen.

### Ziel

Erster deutlich sichtbarer Nutzwert der neuen Customer-Datenbasis:

`Meine Kunden -> Kunde öffnen -> zulässige Projekte / Arbeitspakete / Tätigkeiten sehen`

### Fachliche Regeln

- Kundenverantwortung ist Beziehung/Scope, keine globale Rolle.
- mehrere Kunden je Systemingenieur möglich.
- Sicht- und Schreibrechte getrennt.
- Serverseitige Customer-Scope-Prüfung/RLS bleibt Sicherheitsgrenze.
- keine impliziten globalen Rechte durch Kundenzuordnung.

### Lovable-Einsatz

Geplant: 1–2 Credits gezielt für UI/Preview von `Meine Kunden`, Kundenkontext und Sichtbarkeitsindikatoren.

Architektur-, Auth-, RBAC-, RLS- und Datenmodellentscheidungen werden nicht an Lovable delegiert.

### Wochenziel

Mindestens sauber beginnen; bei stabilem Verlauf vollständig umsetzen und abnehmen.

## 6. Stretch-Ziel — BSF-03A Projektmanager-Leistungssicht / Controlling

Nur beginnen, wenn SEC-02, BSF-02C und die notwendige BSF-03-Basis kontrolliert abgeschlossen bzw. stabil sind.

Zielbild:

- read-only,
- Zeitraum,
- Kunde,
- Projekt,
- Tätigkeiten,
- abrechenbar / nicht abrechenbar,
- Summen,
- Drill-down,
- serverseitig auf zulässigen Projekt-/Customer-Scope begrenzt,
- keine Teamlead-Finalisierungsrechte.

Geplanter Lovable-Einsatz später: 2–4 Credits für Filter, Tabellen, Summen und Preview.

Diese Woche ist BSF-03A ausdrücklich ein Stretch-Ziel und kein Grund, vorgelagerte Security-/RLS-Gates abzukürzen.

## 7. Bewusst nicht vorziehen

### BSF-03B — Teamlead Leistungsnachweis V1

Bleibt nach BSF-03A geplant:

- Kunde + Zeitraum,
- abrechenbare und nicht abrechenbare Leistungen in Prüfsicht,
- Abrechenbarkeit vor Finalisierung änderbar,
- Summe abrechenbarer Zeiten,
- finaler unveränderbarer Snapshot,
- Doppelabrechnungsschutz,
- Audit,
- Kundenreport/-export,
- Leistungserbringer nicht in endgültiger Kundenfassung.

Keine Rechnung in V1.

### Weitere Backlog-Punkte

PORT-01, Dokumentationskonsolidierung, SYSING-001/TDF, BSF-04 und spätere Roadmap bleiben erhalten, verdrängen aber diese Woche nicht den roten Faden.

PORT-01 darf als credit-freier Ausweichblock genutzt werden, wenn ein Lovable-/Runtime-Gate kurzfristig blockiert, jedoch nur in getrenntem Branch/PR und ohne Vermischung mit SEC-02 oder BSF-02C.

## 8. Lovable-Planung der Woche

Operative Planungsgröße bleibt 5 Credits pro Tag, sofern tarifseitig verfügbar.

Prinzipien:

- Credits nicht künstlich verbrauchen.
- SEC-02: nur für den ausdrücklich benötigten verifizierten DB-/Runtime-Lauf.
- BSF-02C: nur dort, wo die freigegebene DB-Governance Lovable für den realen Supabase-Kontext vorsieht.
- BSF-03: 1–2 Credits für UI/Preview.
- Reserve für Korrektur/Abnahme erhalten.
- keine direkten unbeauftragten Writes auf `main`.

## 9. Realistisches Freitagsziel

### Verbindliches Ziel

- SEC-02 = DONE
- BSF-02C = DONE
- BSF-03 = mindestens begonnen

### Sehr guter Verlauf

- SEC-02 = DONE
- BSF-02C = DONE
- BSF-03 = DONE
- BSF-03A = sauber spezifiziert / erster kontrollierter Schritt begonnen

### Nicht als Erfolgsmaßstab verwenden

Nicht versuchen, BSF-03A und BSF-03B um jeden Preis noch in derselben Woche vollständig abzuschließen. Die neue Mehrbenutzer-/Customer-/RLS-Grenze hat Vorrang vor Sprintgeschwindigkeit.

## 10. Abschlussbericht je Arbeitsauftrag

Nach jedem größeren Prompt bzw. Arbeitspaket wird wieder ein Abschlussbericht erstellt mit:

- STATUS = PASS / BLOCKED / READY FOR PR / DONE,
- umgesetzter Scope,
- bewusst nicht umgesetzter Scope,
- Tests und reale Evidenz,
- Security-/RBAC-/RLS-Befund,
- Git-/PR-Stand,
- Dokumentationsstand,
- offene Restpunkte,
- nächster konkreter Schritt,
- aktualisierte Sprint-/Prioritäteneinordnung.

## 11. Wochenabschluss

Am Ende der Woche wird dieser Plan gegen den tatsächlichen GitHub-Stand abgeglichen. Abweichungen werden nicht rückwirkend beschönigt, sondern mit Ursache, Restgate und Folgeplanung dokumentiert.
