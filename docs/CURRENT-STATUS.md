# Sysing Dashboard — aktueller verbindlicher Status

Stand: 2026-08-24

## Zweck

Dieses Dokument benennt die aktuell maßgeblichen Status- und Abnahmequellen. Ältere Sprint-, Planungs- und Release-Candidate-Dokumente bleiben als historische Evidenz erhalten, sind aber für Aussagen zum heutigen F-11-/MVP-Abnahmestand nachrangig.

## Aktuelle Referenzen

Für den F-11-/MVP-Abschluss gelten in dieser Reihenfolge:

1. `docs/F11-MVP-CONSOLIDATION-2026-08-24.md`
2. `docs/ROLE-ACCEPTANCE-09C-FINAL-2026-08-24.md`
3. `docs/MVP-CLOSURE-STATUS-2026-08-24.md`
4. die mit PR #39 nach `main` übernommene F-11-Runtime-Evidenz
5. der laufaktuelle technische Prüfbericht aus dem jeweils letzten vollständig grünen CI-Lauf

Historische Dokumente wie `docs/ROLE-ACCEPTANCE-09C.md`, `docs/MVP-ACCEPTANCE-REPORT.md`, `docs/MVP-CLOSURE-STATUS-2026-08-21.md` und `.lovable/plan/*` werden nicht rückwirkend umgeschrieben. Abweichende OPEN-/PARTIAL-Aussagen darin beschreiben den damaligen Prüfzeitpunkt und sind durch die oben genannten Abschlussnachweise fortgeschrieben.

## Produkt- und Plattformstatus

- Produktive Anwendung: `https://sysingdashboard.lovable.app`
- Source of Truth für Code und Dokumentation: GitHub `bmarnau/sysingdashboard`
- Dashboard-Version: `1.59.6`
- Produktiver MVP-Daten-/Auth-Provider: Supabase
- Authentifizierung, RBAC und RLS: technisch und durch reale Rollen-/Negativtests nachgewiesen
- Azure SQL, Azure Table Storage und weitere Azure-Zielprovider: optionaler Migrations-/Erweiterungspfad, nicht Voraussetzung des aktuellen MVP
- Lovable: veröffentlichte Referenzumgebung, keine fachlich unersetzbare Laufzeitlogik

## F-11

**Status: CLOSED / PASS**

Nachgewiesen sind unter anderem:

- reale Rollen- und Negativtests für Systemingenieur, Projektmanager, Teamleitung, Viewer und Administrator,
- Benutzerverwaltung und Namensdarstellung,
- Backup-Runtime einschließlich Integrität und Zeitstempellogik,
- Downloadbereich,
- Log Viewer,
- finale Administrator-Gesamtsicht,
- produktiver Systemstatus-Retest mit SYSSTAT-01 bis SYSSTAT-04 PASS,
- serverseitige Berechtigungsgrenzen und RLS-Negativpfade.

`Role Preview` ist für den aktuellen MVP **N/A — kein Produktbestandteil**. Es wird kein künstliches Impersonation-/Preview-Feature nur zur Erfüllung eines historischen Prüfpunkts gebaut.

## MVP-Abschluss

Die fachliche F-11-Abzeichnung ist abgeschlossen. Der letzte formale Schritt ist der frische CI-/Security-/Technical-Report-/Quality-Gate-Lauf dieses Konsolidierungsstands.

Bis dieser Lauf vollständig grün ist, gilt:

**MVP: funktional und fachlich abgenommen · finale Baseline-Kennzeichnung noch ausstehend.**

Erst nach dem grünen Abschlusslauf wird `MVP 100 % / BASELINE` verbindlich gesetzt und der Baseline-Commit dokumentiert.
