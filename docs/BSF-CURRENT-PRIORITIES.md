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

### BSF-03 — Kundenverantwortung / „Meine Kunden“ (#105) — IN ARBEIT

Der Fach-/Security-Vertrag ist über PR #118 auf `main` integriert. Das Datenbank-/Security-Fundament P1/P2 ist über PR #127 integriert. Runtime/UI P3/P4 „Meine Kunden“ wurde über PR #128 nach vollständiger Exact-Head-Abnahme integriert.

Aktueller Nachweis P3/P4:

- finaler PR-Head: `0a42689be252629a2f6e46885836f18989a5959c`,
- Merge-Commit: `a9f40cb56aed7bdfd7d0baef2d9023755923967c`,
- Security #592: PASS,
- CI #599: PASS,
- 88 Testdateien, 696 Tests PASS, 4 TODO,
- Playwright E2E, Accessibility, Technical Debt und `14 · Technical Report & Quality Gate`: PASS,
- kein Deploy durch den Merge.

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

### Nächster kontrollierter Schritt: BSF-03 P5 — Kundenverantwortung verwalten

P5 ist der letzte fachliche Ausbaupunkt innerhalb BSF-03 vor der Abschlusskonsolidierung.

Verbindlicher Scope:

1. aktuellen Responsibility-/Read-Vertrag und `main` analysieren,
2. einen **engen, datensparsamen Manager-Read-Vertrag** für zulässige Kandidaten bereitstellen,
3. Self-only-Regeln auf `profiles`, `user_roles` und `systemhouse_membership` **nicht verbreitern**,
4. verantwortlichen Sysing im Kundendetail anzeigen,
5. autorisiertes Zuweisen, Ändern und Beenden der Responsibility ermöglichen,
6. Verwaltung nur für `systemadministrator`, `administrator`, `teamlead`,
7. Zielrollen nur `systemadministrator`, `administrator`, `teamlead`, `projectmanager`, `engineer`,
8. `viewer` und `customer` als Ziel strikt ausschließen,
9. Cross-Systemhouse, IDOR/BOLA, ungültige/beendete Membership, Rollen-Spoofing und unautorisierte Verwaltung negativ testen,
10. Auditierbarkeit und zeitliche Responsibility-Semantik erhalten,
11. vollständige Security-/CI-/E2E-/Accessibility-/Quality-Gates sowie Dokumentationssync durchführen.

**BSF-03D wird erst nach P5 und der vollständigen BSF-03-Abschlusskonsolidierung freigegeben.**

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
2. **BSF-03 — IN ARBEIT; P5 NÄCHSTER SCHRITT**
3. **BSF-03D — GEPLANT / bis BSF-03-Abschluss gesperrt**
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
