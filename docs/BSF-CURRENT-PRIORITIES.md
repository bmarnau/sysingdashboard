# Sysing Dashboard — aktuelle BSF-Prioritäten

Stand: 2026-09-09  
Status: operative Prioritätenliste für den täglichen Wiederanlauf  
Strategische Grundlage: `docs/GESAMTPLAN-SYSING-DASHBOARD.md`  
Operative Detailplanung: `docs/SPRINT-PLAN-MVP-BSF.md`  
Dauerhafter Wiederanlaufpunkt: Issue #35  
Historische Lovable-Planbasis: `docs/LOVABLE-PROMPT-PLAN-2026-09-06.md`

## Zweck

Diese Datei ist die kompakte operative Source of Truth für den laufenden BSF-Ausbau. Historische, datierte Abschlussdokumente werden nicht rückwirkend umgeschrieben; Statusdrift wird hier und in den laufenden Planungsdokumenten fortgeschrieben.

## Aktueller Stand

### BSF-02 / BSF-02C — DONE

Der minimale gemeinsame Mehrbenutzer-Daten-/Read-Pfad ist vollständig abgeschlossen.

Nachweise:

- Phase A Shared Projection / Grants / RLS: PR #110 — DONE,
- B2 transaktionale `SECURITY INVOKER`-Publish-RPC: PR #116 — DONE,
- Runtime Publish-/Read-Pfad auf akzeptierter RPC: PR #111 — DONE,
- T01–T30 und T31–T51 einschließlich Atomic Rollback: PASS,
- offizieller Supabase Security Advisor: PASS; keine neue BSF-02C-Warnung,
- #88 und Parent #76: CLOSED / COMPLETED,
- kein Service-Role-Normalpfad,
- vollständige Security-/CI-/E2E-/Accessibility-/Technical-Debt-/Quality-Gates: PASS.

Der gemeinsame fachliche Pfad lautet:

`Customer → Project → WorkPackage → Activity → Leistungserbringer`

### BSF-03 — Kundenverantwortung / „Meine Kunden“ (#105) — IN ARBEIT

Der Fach-/Security-Vertrag ist über PR #118 auf `main` integriert.

Verbindlich:

- Customer Responsibility ist fachliche Beziehung/Scope, keine globale Rolle,
- `systemhouse_membership`, `customer_access` und `customer_responsibility` bleiben getrennt,
- Responsibility allein eröffnet weder Customer-Daten noch Schreibrechte,
- `Meine Kunden` ist fail-closed die Schnittmenge aus aktivem Konto, aktiver Membership, aktueller Responsibility, Customer Access >= read und `dashboard.view`,
- Customer Identity bleibt `(systemhouseId, customerId)`,
- Cross-Systemhouse, Cross-Customer und IDOR/BOLA bleiben DENY,
- `customer.responsibility.manage` nur für `systemadministrator`, `administrator`, `teamlead`,
- zulässige Responsibility-Ziele: `systemadministrator`, `administrator`, `teamlead`, `projectmanager`, `engineer`,
- `viewer` und `customer` sind als Ziel ausgeschlossen,
- keine Service Role im normalen User-Pfad.

Noch offen:

1. **BSF-03 1A** — Schema / RBAC / RLS / Grants / Generated Types / technische Doku.
2. **BSF-03 1B** — R01–R18 / offizieller Security Advisor / Null-Residuen / BSF-02C-Regression.
3. Danach Runtime/UI `Meine Kunden` und Kundendetail über den vorhandenen Shared-Projection-Read-Pfad.
4. Vollständige Exact-Head-CI, Accessibility, Rollen-Preview, Import/Export-/Backup-Auswirkungen und Abschlussdokumentation.

## Tägliche Lovable-Prompt-Steuerung

Der unveränderliche Ausgangsplan steht in `docs/LOVABLE-PROMPT-PLAN-2026-09-06.md`. Die operative Bilanz berücksichtigt tatsächlich gestartete Läufe, auch wenn ein Lauf nach einem Precheck ohne Implementierung endet.

<!-- prettier-ignore -->
| Sprint | Plan laut Snapshot | Verbraucht | Noch erwartet | Status / Lovable-Grund |
|---|---:|---:|---:|---|
| BSF-02C Abschluss | 0–1 | **1** | **0** | DONE; offizieller B2-Advisor-/Abnahmelauf |
| BSF-03 | 1–2 | **1** | **2–3** | IN ARBEIT; erster Lauf endete nach Precheck ohne Implementierung; 1A + 1B + ggf. UI/Preview offen |
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
| **GESAMT bis einschließlich BSF-04A** | **13–23** | **2** | **13–23** | Restschätzung erhöht, weil der erste BSF-03-Lauf nur Precheck war |

## Verbindliche operative Reihenfolge

1. **BSF-02 / BSF-02C — DONE**
2. **BSF-03 — IN ARBEIT**
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
- Default keine Kategorie,
- optional maximal eine Hauptkategorie je Arbeitspaket,
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
- billable/non-billable gemeinsam in Prüfsicht,
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

Ein Fachpunkt ist erst DONE, wenn neben Code und Tests alle betroffenen Evidenz-/Dokumentationsflächen aktuell sind:

- technische Dokumentation,
- kontextsensitive Hilfe / Benutzerhandbuch, sofern UI oder Bedienung betroffen ist,
- Entwicklungstagebuch bzw. Abschlussnachweis,
- `docs/CURRENT-STATUS.md`, soweit betroffen,
- technischer Prüfbericht / CI-Quality-Gate-Evidenz,
- Security-/RBAC-/RLS-Nachweise,
- SYSING-001 ab seiner BSF-Fortschreibung,
- vollständige Required Checks auf dem Exact Head.

## Architekturhinweis

Die fachliche Customer-Identität bleibt:

`(systemhouseId, customerId)`

`systemhouseId` ist providerneutral und nicht Microsoft Tenant ID. Eine spätere Entra-/Azure-Zuordnung ist Provider-/Mappinginformation und verändert den fachlichen Primärscope nicht.

## Fachlicher roter Faden

`BSF-03 → BSF-03D → BSF-03A → BSF-03B → BSF-03E → BSF-03C → Dokumentationsblock → BSF-04 → BSF-04A → BSF-05 → BSF-06 → BSF-07 → BSF-09 → BSF-10 → BSF-FINAL → INTEGRATION-READINESS`
