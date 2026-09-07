# Sysing Dashboard — aktuelle BSF-Prioritäten

Stand: 2026-09-07  
Status: operative Prioritätenliste für den täglichen Wiederanlauf  
Strategische Grundlage: `docs/GESAMTPLAN-SYSING-DASHBOARD.md`  
Operative Detailplanung: `docs/SPRINT-PLAN-MVP-BSF.md`  
Historische Lovable-Planbasis: `docs/LOVABLE-PROMPT-PLAN-2026-09-06.md`

## Zweck

Diese Datei ist die kompakte operative Source of Truth für den laufenden BSF-Ausbau. Sie beantwortet für jede Arbeitssitzung:

1. Was ist abgeschlossen?
2. Woran wird als Nächstes gearbeitet?
3. Welches Gate gilt vor dem nächsten Sprint?
4. Wo ist Lovable tatsächlich notwendig?
5. Wie viele Lovable-Prompts waren geplant, wurden verbraucht und werden noch erwartet?

Historische, datierte Abschlussdokumente werden nicht rückwirkend umgeschrieben. Abweichende ältere Statusaussagen werden durch diesen laufenden Stand und die jeweils neueren Abschlussnachweise fortgeschrieben.

## Statuslegende

- `DONE` — vollständig abgeschlossen, getestet und integriert
- `IN ARBEIT` — aktuell laufender Punkt
- `BLOCKED` — fachlich aktiv, aber mit benanntem Gate
- `NÄCHSTER PUNKT` — unmittelbar als nächstes vorgesehen
- `GEPLANT` — verbindlich vorgesehen, aber noch nicht begonnen

## Aktueller Stand

### BSF-02 / BSF-02C — DONE

Der minimale gemeinsame Mehrbenutzer-Daten-/Read-Pfad ist abgeschlossen.

Nachweise:

- Phase A Shared Projection / Grants / RLS: PR #110 — DONE
- B2 transaktionale `SECURITY INVOKER`-Publish-RPC: PR #116 — DONE
- Runtime Publish-/Read-Pfad auf akzeptierter RPC: PR #111 — DONE
- B2 T31–T51 einschließlich T51 Atomic Rollback: PASS
- offizieller Supabase Security Advisor vom 2026-09-07: PASS für B2; keine neue BSF-02C-Warnung
- finaler Runtime-Head vor Merge: `0cc1fb4179aebff059a22217d638445b9986dd32`
- Security Run #519 / `34080533051`: PASS
- CI Run #527 / `34080533041`: PASS
- Static, Unit/Components, Backend, API, RBAC/Security, Import/Export, Backup/Restore, Production Build, Playwright E2E, Accessibility, Technical Debt sowie Technical Report & Quality Gate: PASS
- Runtime-Merge auf `main`: `60ed2d81542cc25543dafa2b4821740cfff45043`
- kein Service-Role-Normalpfad
- keine Lovable-Preview/Auth-Overlay-Dateien in den Produkt-PRs

Der fachliche Pfad lautet nun:

`Customer → Project → WorkPackage → Activity → Leistungserbringer`

mit providerneutralem Runtime-Service und Supabase als austauschbarem MVP-Provider. Die vollständige Ablösung der Local-First-Datenhaltung bleibt bewusst BSF-04.

### Nächster fachlicher Punkt

**BSF-03 — Kundenverantwortung / „Meine Kunden“ (#105) — NÄCHSTER PUNKT**

Start erst nach formalem Abschluss der Dokumentations-/Issue-Konsolidierung von #88 und Parent #76.

Verbindlicher Vertrag:

- Customer Responsibility ist Beziehung/Scope, keine neue globale Rolle,
- ein Systemingenieur kann für mehrere Kunden verantwortlich sein,
- ein Kunde kann einen verantwortlichen Systemingenieur haben,
- Sichtbarkeit und Schreibrechte bleiben getrennt,
- Customer-Grenze wird serverseitig erzwungen,
- Cross-Customer und Cross-Systemhouse bleiben DENY,
- keine UI-Regel ersetzt RBAC/RLS.

## Tägliche Lovable-Prompt-Steuerung

Der unveränderliche Ausgangsplan steht in `docs/LOVABLE-PROMPT-PLAN-2026-09-06.md`. Die operative Bilanz wird hier fortgeschrieben.

| Sprint | Plan laut Snapshot | Verbraucht | Noch erwartet | Status / Lovable-Grund |
|---|---:|---:|---:|---|
| BSF-02C Abschluss | 0–1 | **1** | **0** | DONE; offizieller B2-Advisor-/Abnahmelauf |
| BSF-03 | 1–2 | 0 | 1–2 | UI/Preview sowie ggf. ausdrücklich freigegebene DB-/RLS-Arbeit |
| BSF-03D | 1–2 | 0 | 1–2 | Stammdaten-/UI-Preview; DB nur nach Governance |
| BSF-03A | 2–3 | 0 | 2–3 | Filter, Tabellen, Summen, Rollen-Preview |
| BSF-03B | 2–3 | 0 | 2–3 | Prüfsicht, Finalisierung, Export-Preview |
| BSF-03E | 1–2 | 0 | 1–2 | Personensicht / Vertretungs-Preview |
| BSF-03C | 1–2 | 0 | 1–2 | Kunden-PDF / Preview |
| BSF-DOC-01 | 0 | 0 | 0 | Dokumentationskonsolidierung außerhalb Lovable |
| BSF-DOC-02 | 0 | 0 | 0 | SYSING-001/TDF außerhalb Lovable |
| BSF-DOC-03 | 1–2 | 0 | 1–2 | Navigation / Board-Preview |
| BSF-04 | 2–3 | 0 | 2–3 | Persistenz-/Providergrenzen; DB-Arbeit nur nach Governance |
| BSF-04A | 2–3 | 0 | 2–3 | Template-/Serien-Preview und ggf. kontrollierte Persistenz |
| **GESAMT bis einschließlich BSF-04A** | **13–23** | **1** | **12–22** | operative Gesamtbilanz |

Zählregeln:

- **Plan** bleibt der historische Snapshot und wird nicht rückwirkend angepasst.
- **Verbraucht** zählt nur tatsächlich gestartete fachliche Lovable-Arbeitsläufe seit dem Snapshot.
- **Noch erwartet** ist die aktuelle Restschätzung und darf sich begründet verändern.
- Weniger Prompts als geplant sind kein Mangel; Qualität, Sicherheit, Tests, Dokumentation und sauberer GitHub-Integrationsweg sind maßgeblich.
- Nach jedem Lovable-Lauf wird die Bilanz fortgeschrieben.

## Verbindliche operative Reihenfolge

1. **BSF-02 / BSF-02C — DONE**
2. **BSF-03 — NÄCHSTER PUNKT**
3. **BSF-03D — GEPLANT**
4. **BSF-03A — GEPLANT**
5. **BSF-03B — GEPLANT**
6. **BSF-03E — GEPLANT**
7. **BSF-03C — GEPLANT**
8. **BSF-DOC-01 — GEPLANT**
9. **BSF-DOC-02 — GEPLANT**
10. **BSF-DOC-03 — GEPLANT**
11. **BSF-04 — GEPLANT**
12. **BSF-04A — GEPLANT**
13. **BSF-05 — GEPLANT**
14. **BSF-06 — GEPLANT**
15. **BSF-07 — GEPLANT**
16. **BSF-09 — GEPLANT**
17. **BSF-10 — GEPLANT**
18. **BSF-FINAL — GEPLANT**
19. **INTEGRATION-READINESS — GEPLANT**

## Kurzverträge der nächsten Sprints

### BSF-03D — Arbeitspaket-Kategorien (#103)

- systemhausweite editierbare Stammdaten,
- Standard: keine Kategorie,
- optional maximal eine Hauptkategorie pro Arbeitspaket,
- freie Tags bleiben separat,
- stabile Key-/ID-Identität,
- Kategorie erzwingt weder Billable noch Priorität noch Status.

### BSF-03A — Projektmanager-Leistungssicht (#106)

- read-only,
- Filter nach Zeitraum, Kunde, Projekt, Arbeitspaket, AP-Kategorie und Billable,
- Summen und Drill-down,
- kein Teamlead-Finalisierungsrecht,
- serverseitiger Customer-/Projekt-Scope.

### BSF-03B — Leistungsnachweis Teamlead V1 (#107)

- Leistungsnachweis, keine Rechnung,
- Kunde + fester Zeitraum,
- billable/non-billable in Prüfsicht,
- Teamlead darf Billable vor Finalisierung ändern,
- unveränderbarer finaler Snapshot,
- Doppelverwendung verhindern,
- Audit/Korrekturpfad,
- Kundenausgabe ohne automatische Nennung des Leistungserbringers.

### BSF-03E — Vertretungs- und Personensicht (#63)

- Customer Responsibility, Project Responsibility und Vertretung bleiben getrennte Beziehungen,
- auditierbare Änderungen,
- keine Krankheitsgründe, Diagnosen oder Gesundheitsdaten,
- bestehende Responsibility-Logik wiederverwenden.

### BSF-03C — Kunden-PDF / Kundenpaket (#98)

- operative Kundensicht als PDF,
- Datenminimierung,
- reproduzierbarer Snapshot,
- keine internen IDs/Notizen/Sicherheitsdetails,
- keine automatische Nennung des Leistungserbringers.

### BSF-DOC-01 bis DOC-03

- Dokumentationsflächen konsolidieren,
- SYSING-001 als Living Document im TDF-Format auf realen Stand fortschreiben,
- freigegebene SYSING-001-Version read-only aus dem Board erreichbar machen,
- keine zweite divergierende Dokumentquelle.

### BSF-04 / BSF-04A

BSF-04 entscheidet die dauerhafte zentrale/synchronisierte Datenstrategie einschließlich Source of Truth, Konflikt-/Staleness-/Offline-Regeln, Provideradapter, Backup/Restore, Docker/On-Premises und späterer Azure-/Entra-Fähigkeit.

BSF-04A folgt danach mit Templates und wiederkehrenden Serien; Templates sind Vorschläge, Instanzen erhalten eigene IDs, Serien müssen idempotent und providerneutral planbar sein.

## Definition of Done ab BSF

Ein Fachpunkt ist erst DONE, wenn je nach betroffenem Scope neben Code und Tests auch die erforderlichen Dokumentations- und Evidenzflächen aktuell sind:

- technische Dokumentation,
- kontextsensitive Hilfe / Benutzerhandbuch, sofern UI oder Bedienung betroffen sind,
- Entwicklungstagebuch bzw. datierter Abschlussnachweis,
- `docs/CURRENT-STATUS.md`, soweit dessen langfristiger Status betroffen ist,
- technischer Prüfbericht / CI-Quality-Gate-Evidenz,
- Security-/RBAC-/RLS-Nachweise,
- SYSING-001 ab seiner BSF-Fortschreibung.

Bei reinem Backend-/Datenpfad ohne neue Bedienoberfläche entsteht keine künstliche Hilfe-/Handbuchänderung.

## Architekturhinweis

Die fachliche Customer-Identität bleibt:

`(systemhouseId, customerId)`

`systemhouseId` ist providerneutral und nicht Microsoft Tenant ID. Eine spätere Entra-/Azure-Zuordnung ist Provider-/Mappinginformation und verändert den fachlichen Primärscope nicht.

## Fachlicher roter Faden

`BSF-03 → BSF-03D → BSF-03A → BSF-03B → BSF-03E → BSF-03C → Dokumentationsblock → BSF-04 → BSF-04A → BSF-05 ff.`
