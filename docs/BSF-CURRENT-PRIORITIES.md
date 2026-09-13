# Sysing Dashboard — aktuelle BSF-Prioritäten

Stand: 2026-09-13  
Status: operative Prioritätenliste für den täglichen Wiederanlauf  
Strategische Grundlage: `docs/GESAMTPLAN-SYSING-DASHBOARD.md`  
Operative Detailplanung: `docs/SPRINT-PLAN-MVP-BSF.md`  
Dauerhafter Wiederanlaufpunkt: Issue #35  
BSF-03-Steuerung: Issue #105

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

### BSF-03 — Kundenverantwortung / Kundensicht (#105) — DONE

P1–P5 sind umgesetzt. `Meine Kunden` bleibt persönliche fail-closed Sicht; `Kundenverantwortung` ist die getrennte systemhausweite Managementsicht ohne zusätzlichen operativen Customer Access.

Nachweise: PR #118, #127, #128 und P5-PR #132; R19–R31; Unit-/Security-/E2E-Verträge; Live-Schema-Prüfung; `docs/BSF-03-CLOSURE-2026-09-13.md`.

### Nächster Schritt: BSF-03D — Arbeitspaket-Kategorien (#103)

BSF-03D ist der nächste fachliche Sprint: systemhausweite editierbare Kategorien als optionale stabile Auswertungsdimension, ohne implizite Billable-/Prioritäts-/Status-Semantik.

## Lovable-/Werkzeugsteuerung

Der historische Ausgangsplan bleibt in `docs/LOVABLE-PROMPT-PLAN-2026-09-06.md` erhalten. Eine neuere Promptplanung bis BSF-07 liegt in PR #126 als Draft und ist noch nicht in `main` integriert.

Für den aktuellen Betrieb gilt:

- Credits werden nicht künstlich verbraucht,
- Lovable nur für geeignete UI-/Preview-/plattformnahe Aufgaben und kontrollierte DB-Ausführung gemäß Governance,
- Git-/CI-Fehler bevorzugt mit Codex; wenn Codex nicht verfügbar ist, kleinstmögliches geeignetes Fallback-Werkzeug,
- mechanische Kleinfehler nach `docs/CODEX-GIT-CI-RULE.md` proportional behandeln,
- keine rückwirkende Schätzung bereits verbrauchter Lovable-Prompts; die Promptbilanz wird nach Abschluss von BSF-03 neu konsolidiert.

## Verbindliche operative Reihenfolge

1. **BSF-02 / BSF-02C — DONE**
2. **BSF-03 — DONE**
3. **BSF-03D — NÄCHSTER SCHRITT / FREIGEGEBEN**
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
- `docs/PROJECT-STATUS.yaml`, soweit betroffen,
- technischer Prüfbericht / CI-Quality-Gate-Evidenz,
- Security-/RBAC-/RLS-Nachweise,
- SYSING-001 ab seiner BSF-Fortschreibung,
- vollständige Required Checks auf dem Exact Head.

## Architekturhinweis

Die fachliche Customer-Identität bleibt:

`(systemhouseId, customerId)`

`systemhouseId` ist providerneutral und nicht Microsoft Tenant ID. Eine spätere Entra-/Azure-Zuordnung ist Provider-/Mappinginformation und verändert den fachlichen Primärscope nicht.

## Fachlicher roter Faden

`BSF-03/P5 → BSF-03-Abschluss → BSF-03D → BSF-03A → BSF-03B → BSF-03E → BSF-03C → Dokumentationsblock → BSF-04 → BSF-04A → BSF-05 → BSF-06 → BSF-07 → BSF-09 → BSF-10 → BSF-FINAL → INTEGRATION-READINESS`
