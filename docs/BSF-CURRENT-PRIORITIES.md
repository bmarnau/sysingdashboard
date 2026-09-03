# Sysing Dashboard — aktuelle BSF-Prioritäten

Stand: 2026-09-03  
Status: operative Prioritätenliste für den täglichen Wiederanlauf  
Strategische Grundlage: `docs/GESAMTPLAN-SYSING-DASHBOARD.md`  
Operative Detailplanung: `docs/SPRINT-PLAN-MVP-BSF.md`

## Zweck

Diese Datei beantwortet für jede Arbeitssitzung vier Fragen:

1. Was ist bereits abgeschlossen?
2. Woran arbeiten wir gerade?
3. Was ist der nächste fachliche Schritt?
4. Wo ist Lovable tatsächlich notwendig?

Sie ist die kompakte operative Source of Truth für den täglichen Wiederanlauf. Der strategische Gesamtplan bleibt für die fachliche Reihenfolge maßgeblich; Wochen- und Tagesplanung dürfen diese Reihenfolge konkretisieren, aber nicht stillschweigend verändern.

## Statuslegende

- `DONE` — vollständig abgeschlossen und dokumentiert
- `IN ARBEIT` — aktuell laufender Punkt
- `BLOCKED` — fachlich aktiv, aber mit klar benanntem Gate/Blocker
- `NÄCHSTER PUNKT` — unmittelbar nach Abschluss des laufenden Punkts
- `GEPLANT` — verbindlich vorgesehen, aber noch nicht begonnen

## Wochenfokus 31.08.–06.09.2026

Der Wochenplan ist bewusst seriell. Es wird kein paralleler neuer Fachsprint eröffnet, solange BSF-02C nicht vollständig abgeschlossen ist.

1. **BSF-02C Phase A — DONE**
   - Shared-Projection-DDL, Grants, RLS und T01–T30 sind abgenommen.
   - PR #110 ist auf `main` gemergt.
   - `main` nach Phase A: `18d4f460955831ce35fa8186a11578bbbe5dee18`.

2. **BSF-02C Phase B Runtime — IN ARBEIT / PR #111 DRAFT**
   - providerneutraler Repository-/Service-Vertrag,
   - Supabase-Adapter,
   - User-JWT-Publish-/Read-Pfad,
   - `snapshotComplete: true` als Reconciliation-Grenze,
   - skipped/unresolved wird nicht mit gelöscht gleichgesetzt,
   - Engineer-Activity-Publish bleibt von Project-Strukturrechten getrennt.

3. **BSF-02C Phase B2 transaktionale Publish-RPC — BLOCKED BIS LOVABLE-LAUF**
   - Nachgewiesene Lücke: mehrere einzelne Data-API-Writes bilden keinen atomaren Snapshot.
   - Erforderlich ist eine transaktionale `SECURITY INVOKER`-RPC im selben User-JWT.
   - DB-/Function-/Grant-Änderung ausschließlich über ausdrücklich freigegebenen Lovable-Prompt gemäß `docs/DATABASE-CHANGE-GOVERNANCE.md`.
   - Kritisches Gate: vollständiger Atomic-Rollback-Test eines absichtlich spät fehlschlagenden Snapshot-Publish.

4. **BSF-02C finalisieren — nach B2**
   - DB-B2 separat abnehmen und integrieren,
   - PR #111 auf die abgenommene RPC umstellen,
   - Runtime-/Security-/Import-Export-/Backup-Restore-/AVKK-Regression,
   - Exact-Head Security + vollständige CI,
   - erst danach #88 und Parent #76 schließen.

5. **BSF-03 beginnen — nur falls BSF-02C vollständig DONE**
   - `Meine Kunden`, Kundenverantwortung, Sichtscope, getrennte Sicht-/Schreibrechte.

## Aktuelle Prioritätenliste

1. **Governance / MVP / BSF-01 — DONE**
   - geschützter `main`-Pfad,
   - MVP-Baseline,
   - providerneutraler Systemhouse-/Customer-Scope,
   - Kundenverantwortung als Beziehung/Scope statt globale Rolle,
   - Projektmanager-Leistungssicht read-only abgegrenzt,
   - Teamlead-Leistungsnachweis als eigener Write-/Finalisierungs-/Audit-Scope.
   - Lovable-Einsatz: **0 Credits**.

2. **BSF-02 — Customer-Entität + minimale gemeinsame Mehrbenutzer-Datenbasis (#76) — IN ARBEIT**
   - BSF-02A/B-Grundlage ist vorhanden.
   - BSF-02C ist der letzte offene Teil.
   - fachliche Identität bleibt `(systemhouseId, customerId)`.
   - vollständige Local-First-Ablösung bleibt ausdrücklich BSF-04.

3. **BSF-02C — gemeinsamer Customer-Read-/Projection-Pfad (#88) — IN ARBEIT / B2 BLOCKED**
   - Phase A: DONE via PR #110.
   - Phase B: Runtime-Code in Draft-PR #111 vorbereitet.
   - aktueller Blocker: transaktionale Snapshot-RPC als additive DB-Ergänzung über Lovable.
   - kein Merge von #111 vor atomarer DB-Abnahme.
   - Gate: real nutzbarer, fail-closed Customer-Pfad `Customer → Project → WorkPackage → Activity` mit vollständiger Security-/CI-Abnahme.

4. **BSF-03 — Kundenverantwortung / Kundensicht (#105) — NÄCHSTER PUNKT**
   - `Meine Kunden`,
   - mehrere Kunden je verantwortlichem Systemingenieur,
   - Customer Responsibility als Scope/Beziehung, keine neue globale Rolle,
   - Customer-Sicht und Schreibrechte getrennt,
   - serverseitige Customer-Grenze; Cross-Customer bleibt DENY.
   - Lovable-Einsatz: **1–2 Credits**, vor allem für UI/Preview nach festem Sicherheitsvertrag.

5. **BSF-03D — Arbeitspaket-Kategorien (#103) — GEPLANT**
   - bewusst **nach BSF-03 und vor BSF-03A**,
   - systemhausweite editierbare Stammdaten,
   - optional genau eine Hauptkategorie je Arbeitspaket,
   - Standard: keine Kategorie,
   - freie Tags bleiben unabhängig,
   - Kategorie erzwingt weder Billable noch Priorität noch Status.
   - bevorzugt Reference Data `workpackage.category`, sofern Systemhouse-Scope sauber bestätigt ist.

6. **BSF-03A — Projektmanager-Leistungssicht / Controlling (#106) — GEPLANT**
   - reine Read-only-Auswertung,
   - Filter nach Zeitraum, Kunde, Projekt, Arbeitspaket, AP-Kategorie und Billable,
   - Summen und Drill-down,
   - keine Teamlead-Finalisierung oder Abrechnungsfreigabe.
   - Lovable-Einsatz: **2–4 Credits** für UI/Preview nach festem Read-Vertrag.

7. **BSF-03B — Leistungsnachweis Teamlead V1 (#107) — GEPLANT**
   - Leistungsnachweis, keine Rechnung,
   - Kunde + fester Zeitraum,
   - billable und non-billable in Prüfsicht,
   - Teamlead darf Billable vor Finalisierung ändern,
   - unveränderbarer finaler Snapshot,
   - Doppelverwendung verhindern,
   - Audit,
   - Kundenausgabe ohne automatische Nennung des Leistungserbringers.
   - Lovable-Einsatz: **2–4 Credits** für Prüfsicht, Finalisierungsdialog und Export-Preview.

8. **BSF-03E — Vertretungs- und Personensicht (#63) — GEPLANT**
   - nach den Kernfunktionen #105, #103, #106 und #107,
   - Personensicht für Management,
   - Verantwortung und Vertretung als getrennte Beziehungen,
   - keine Gesundheits-/Krankheitsdaten,
   - bestehende Responsibility-Logik wiederverwenden, nicht duplizieren.

9. **BSF-03C — Kunden-PDF / Kundenpaket (#98) — GEPLANT**
   - nach belastbarer Kunden-/Leistungsbasis,
   - operative Kundensicht als PDF,
   - keine Duplizierung der Reportfamilie-Fachlogik,
   - Datenminimierung und reproduzierbarer Snapshot,
   - finaler Leistungsnachweis ohne automatische Nennung des Leistungserbringers.

10. **BSF-DOC-01 bis BSF-DOC-03 — GEPLANT**
    - Dokumentationskonsolidierung,
    - SYSING-001 im TDF-Format auf realen Stand fortschreiben,
    - freigegebenes SYSING-001 read-only aus dem Board erreichbar machen,
    - keine zweite divergierende Dokumentquelle.

11. **BSF-04 — zentrale/synchronisierte Datenstrategie (#108) — GEPLANT**
    - vollständige Local-First-Grenze,
    - Source of Truth,
    - Sync-/Konfliktregeln,
    - Migration,
    - Provideradapter,
    - Backup/Restore,
    - Docker-/On-Premises- und spätere Azure-/Entra-Fähigkeit.

12. **BSF-04A — Vorlagen und wiederkehrende AP/Tätigkeiten (#102) — GEPLANT NACH BSF-04**
    - zuerst Template Library / manuelle Instanziierung,
    - danach wiederkehrende Serien,
    - Vorlage bleibt editierbarer Vorschlag,
    - keine automatische Ist-Leistung, Finalisierung oder Abrechnung,
    - Serien idempotent und Docker-/On-Premises-fähig.

13. **BSF-05 ff. — GEPLANT**
    - Canonical Import Model / SharePoint,
    - Betreiberhoheit / Docker,
    - Managementcockpit 2,
    - Reporting 2,
    - kontrolliertes NAVIS-/KI-Labor,
    - BSF-FINAL,
    - Integration Readiness,
    - erst danach produktive Microsoft-Integrationen.

## Architekturhinweis zur Priorisierung

BSF-02/02C übernimmt nur die **minimal erforderliche gemeinsame Daten-/Read-Basis**, damit Kundenverantwortung und spätere Leistungssichten belastbar werden. Der vollständige Architekturentscheid über zentrale bzw. synchronisierte operative Daten bleibt BSF-04.

Die fachliche Kundenidentität bleibt systemhausgebunden und providerneutral:

`(systemhouseId, customerId)`

Eine Microsoft Tenant ID kann später Provider-/Mappinginformation sein, ist aber nicht der fachliche Primärscope des Sysing Dashboards.

Für neue BSF-Scopes ist `systemhouse:{id}` kanonisch. Historische vorbereitende `tenant:{id}`-Scopes bleiben als Pre-BSF-Kompatibilität erhalten und werden nicht stillschweigend als Microsoft-Tenant oder Systemhaus umgedeutet.

## Definition of Done ab BSF

Ein Fachpunkt gilt nur dann als abgeschlossen, wenn neben Code und Tests auch alle durch die Änderung betroffenen Dokumentationsflächen aktuell sind.

Je nach Scope gehören dazu:

- kontextsensitive Hilfe,
- Benutzerhandbuch,
- technische Dokumentation,
- `docs/ENTWICKLUNGSTAGEBUCH.md`,
- `docs/CURRENT-STATUS.md`, wenn der laufende Produkt-/Governance-Status betroffen ist,
- technischer Prüfbericht bzw. CI-/Quality-Gate-Evidenz,
- SYSING-001 ab dem Zeitpunkt seiner BSF-Fortschreibung.

Historische, datierte Abschlussdokumente werden nicht rückwirkend umgeschrieben.

## Lovable-Einsatz

Lovable wird nicht nach Credit-Verbrauch, sondern nach notwendigem Nutzen eingesetzt.

Grundsätze:

- DB-/RLS-/Grant-/Function-Änderungen ausschließlich nach ausdrücklich freigegebenem Lovable-Prompt gemäß DB-Governance.
- UI-/Preview-/Layout-Aufgaben bevorzugt mit Lovable, wenn dies gegenüber Code-only sinnvoll ist.
- Keine künstliche Credit-Auslastung und keine unnötigen Build-/Fix-Schleifen.
- Bei Lovable-relevanten Tagen möglichst echte Korrektur-/Abnahmereserve lassen.
- Lovable arbeitet auf isolierter Nicht-`main`-Variant.
- Lovable entscheidet nicht über Merge oder Release.
- Integration erfolgt über GitHub-Branch → PR → Required Checks → dokumentierte Abnahme.

## Regel zur Übersicht im Chat

Nach jedem vollständig abgeschlossenen Punkt dieser Liste wird:

1. diese Datei aktualisiert,
2. der abgeschlossene Punkt auf `DONE` gesetzt,
3. der nächste aktive Punkt eindeutig als `IN ARBEIT` bzw. `NÄCHSTER PUNKT` markiert,
4. dem Nutzer im Abschlussbericht die vollständige aktuelle Reihenfolge erneut gezeigt.

## Fachlicher roter Faden

`BSF-02C → BSF-03 → BSF-03D → BSF-03A → BSF-03B → BSF-03E/03C → Dokumentationsblock → BSF-04 → BSF-04A → BSF-05 ff.`

Die genaue Einordnung von BSF-03E gegenüber BSF-03C wird vor dem PDF-Sprint fachlich feinjustiert; sie erzeugt keinen parallelen zweiten Responsibility-Scope.