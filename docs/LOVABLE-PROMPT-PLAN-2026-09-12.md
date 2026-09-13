# Sysing Dashboard — Lovable-Promptplanung bis BSF-07 / Management-Wallboard

Stand: 2026-09-12  
Status: aktueller Planungs-Snapshot / Aufwandsschätzung  
Basis: `docs/SPRINT-PLAN-MVP-BSF.md`, `docs/BSF-CURRENT-PRIORITIES.md`, Issue #35 und Issue #105  
Vorgänger-Snapshot: `docs/LOVABLE-PROMPT-PLAN-2026-09-06.md`

## 1. Zweck

Dieses Dokument hält die **aktuelle erwartete Anzahl gezielter Lovable-Prompts ab dem Stand 2026-09-12 bis einschließlich BSF-07 / Management-Wallboard** fest.

Es ersetzt den Snapshot vom 2026-09-06 nicht. Der ältere Snapshot bleibt unverändert als historische Vergleichsbasis bestehen. Diese Fassung bildet den inzwischen realen BSF-03-Erfahrungsstand, die festgeschriebene Sprintfolge sowie die Planung bis zur ersten funktionierenden Geschäftsführungs-/Wallboard-Sicht ab.

Die Schätzung dient der Kapazitäts- und Credit-Planung. Sie ist **keine Verpflichtung, Prompts zu verbrauchen**. Weniger Prompts bei gleicher Qualität sind ausdrücklich erwünscht.

## 2. Zählregel

Als **Lovable-Prompt** zählt ein gezielter, in sich abgegrenzter Arbeitslauf an Lovable, insbesondere für:

- DB-/RLS-/Grant-/Function-Änderungen gemäß `docs/DATABASE-CHANGE-GOVERNANCE.md`,
- UI-/Preview-Umsetzung,
- Rollen-/Berechtigungs-Preview,
- plattformspezifische Runtime-Prüfungen,
- Integrations-/Import-Umsetzung, soweit Lovable dafür der geeignete Ausführungspfad ist.

Nicht als Lovable-Prompt zählen:

- ChatGPT-Analyse und Planung,
- GitHub-Dokumentation und PR-Arbeit,
- lokale/Codex-Arbeit,
- reine Architektur- oder TDF-Dokumentation,
- normale GitHub-CI-Läufe ohne Lovable-Auftrag.

**Wichtig:** Ein Lovable-Prompt ist eine Planungs-/Arbeitseinheit und nicht automatisch identisch mit einem Lovable-Credit. Die tatsächliche Credit-Belastung kann je Lauf abweichen.

## 3. Ausgangslage 12.09.2026

- GitHub `main`: `b03c81c379f857dc33b6b9d2b91ea10414ae488b`.
- BSF-02 / BSF-02C: **DONE**.
- BSF-03: **AKTIV**, derzeit `TEIL_2_BLOCKED_RLS_TARGET_VALIDATION`.
- BSF-03D und alle folgenden Fachsprints bleiben bis zur vollständigen BSF-03-Abnahme nachgeordnet.
- `INT-CONTRACT-01 / Management-Wallboard` bleibt eine parallele Dokumentations-/Contract-Spur und verändert die Sprintfolge nicht.
- Draft-PR #124 enthält Management-TDF und externen JSON-/Producer-Vertrag, aber keine Implementierungsfreigabe.

Die nachfolgende Schätzung beschreibt den **Restbedarf ab jetzt**. Bereits vor diesem Snapshot verbrauchte Lovable-Läufe werden nicht erneut eingerechnet.

## 4. Verbindliche Sprintfolge bis zum Wallboard

`BSF-03 → BSF-03D → BSF-03A → BSF-03B → BSF-03E → BSF-03C → BSF-DOC-01 → BSF-DOC-02 → BSF-DOC-03 → BSF-04 → BSF-04A → BSF-05 → BSF-06 → BSF-07`

Die fachliche Reihenfolge wird durch diese Promptplanung **nicht verändert**.

## 5. Geplanter Lovable-Restaufwand

<!-- prettier-ignore -->
| Reihenfolge | Sprint | Kurzinhalt | Planwert Lovable-Prompts | Begründung / vorgesehene Schnitte |
|---:|---|---|---:|---|
| 1 | **BSF-03** | Kundenverantwortung / „Meine Kunden“ | **4** | P1 Target-Validation-Fix; P2 Security-/RLS-Abnahme; P3 Runtime/UI „Meine Kunden“; P4 Reserve für Kundendetail/E2E, falls nicht in P3 abdeckbar |
| 2 | **BSF-03D** | Arbeitspaket-Kategorien | **1** | Stammdaten + UI/Preview in einem kleinen, kontrollierten Lauf; DB nur falls nach Analyse nötig |
| 3 | **BSF-03A** | PM-Leistungssicht / Controlling read-only | **2** | UI/Filter/Summen; danach Scope-/Rollen-/E2E-Abnahme |
| 4 | **BSF-03B** | Teamlead-Leistungsnachweis V1 | **2** | Prüfsicht/Finalisierung; danach Snapshot-/Berechtigungs-/Export-Abnahme |
| 5 | **BSF-03E** | Vertretungs-/Personensicht | **1** | vorhandene Responsibility-Logik wiederverwenden; kein zweites Rollenmodell |
| 6 | **BSF-03C** | Kunden-PDF / Kundenpaket | **1** | Rendering/Preview + Scope-/Datenschutzprüfung möglichst gemeinsam |
| 7 | **BSF-DOC-01** | Dokumentationskonsolidierung | **0** | außerhalb Lovable |
| 8 | **BSF-DOC-02** | SYSING-001 im TDF-Format | **0** | außerhalb Lovable |
| 9 | **BSF-DOC-03** | SYSING-001 aus dem Board erreichbar | **1** | Navigation/read-only Preview |
| 10 | **BSF-04** | zentrale/synchronisierte Datenstrategie | **2** | Provider-/Persistenzgrenzen; anschließend kontrollierte technische Umsetzung/Abnahme |
| 11 | **BSF-04A** | Vorlagen + Wiederholungen | **2** | Template-/Serienlogik; danach Idempotenz-/Preview-/Runtime-Abnahme |
| 12 | **BSF-05** | Canonical Import Model / SharePoint-Vertrag | **3** | Canonical Validator/Importpfad; Persistenz/Idempotenz; End-to-End-Abnahme gegen vereinbarten Datenvertrag |
| 13 | **BSF-06** | Betreiberhoheit / Docker / Installierbarkeit | **2** | Runtime-/Konfigurationsgrenzen; Installations-/Betriebs-/Preview-Abnahme |
| 14 | **BSF-07** | Managementcockpit 2 / GF-Wallboard | **4** | Wallboard-Grundansicht; Datenbindung/Freshness/Teilfehler; Kiosk-/Read-only-/Security-Sicht; E2E/Accessibility/Abnahme |

### Basisplan

Summe der fest eingeplanten Restläufe bis einschließlich BSF-07:

**25 Lovable-Prompts**

### Steuerungsreserve

Zusätzlich werden **3 Reserve-Prompts** eingeplant. Sie sind keinem Sprint vorab fest zugeordnet und dürfen nur genutzt werden, wenn ein realer Test, ein Security-Finding oder eine technisch notwendige Integrationsschleife dies begründet.

Typische Reservefälle:

- zusätzliche RLS-/Security-Korrektur,
- unerwartete Persistenz-/Migrationsgrenze in BSF-04/05,
- zusätzliche End-to-End-Schleife vor dem Wallboard,
- notwendige Trennung eines zu großen Lovable-Auftrags in zwei sichere Läufe.

Damit lautet der **aktuelle Planwert bis zum Wallboard: ca. 28 Lovable-Prompts**.

Für Management-/Kapazitätsplanung gilt ein sinnvoller Steuerungskorridor von:

**25–30 Lovable-Prompts ab 12.09.2026 bis BSF-07.**

## 6. Zielpunkt „Wallboard“

Mit „bis zum Wallboard“ ist in dieser Planung die erste **funktionierende, im Sysing Dashboard integrierte Geschäftsführungs-/Management-Wallboard-Sicht in BSF-07** gemeint.

Der Zielpunkt umfasst insbesondere:

- read-only Managementansicht,
- die vorgesehenen Managementbereiche,
- kanonische Datenanbindung über die bis BSF-05 geschaffene Vertrags-/Importgrenze,
- sichtbare Datenstände/Freshness,
- kontrolliertes Verhalten bei Teilquellenfehlern,
- Rollen-/Scope-Prüfung,
- Accessibility und E2E-Abnahme.

Nicht automatisch in den 28 Prompts enthalten sind **zusätzliche direkte provider-spezifische Produktivintegrationen**, die über den vereinbarten kanonischen Datenvertrag hinausgehen. Wenn das externe Datenteam die Daten vertragskonform liefert, soll das Sysing Dashboard diese Providerdetails gerade nicht selbst nachbauen müssen.

## 7. Detailplanung BSF-03 ab aktuellem Stand

Für den aktiven Sprint werden die verbleibenden Lovable-Läufe wie folgt geschnitten:

### BSF-03 P1 — RLS Target Validation

- Live-Zustand read-only verifizieren,
- R15b reproduzieren,
- historische BSF-03-Migrationen repository-seitig korrekt wiederherstellen,
- kleinsten sicheren Target-Validation-Fix als neue Migration umsetzen,
- keine breiten SELECT-Grants/Policies,
- kein Service-Role-Normalpfad,
- Abschlussbericht.

### BSF-03 P2 — Security Acceptance

- R16 testseitig isolieren,
- R00a–R00e + R01–R18 real/fail-fast,
- Null-Residuen,
- offizieller Supabase Security Advisor,
- nur bekannte SEC-01-Baseline zulässig,
- BSF-02C-Regression,
- Generated Types und Doku soweit betroffen,
- Abschlussbericht.

### BSF-03 P3 — Runtime/UI „Meine Kunden“

- providerneutraler Service-/Repository-Pfad,
- Liste „Meine Kunden“,
- Empty-/Loading-/Error-State,
- Read-/Write-Indikator,
- vorhandene Shared Projection wiederverwenden,
- kein neuer paralleler Datenpfad,
- Abschlussbericht.

### BSF-03 P4 — Reserve / Kundendetail + E2E

Dieser Lauf wird **nur genutzt, wenn P3 den Kundendetail-/E2E-Umfang nicht sicher mit abdecken kann**. Er ist Teil des Basisplans, damit der Sprint nicht künstlich zu groß in einen einzelnen Lovable-Auftrag gepackt wird.

## 8. Steuerungsregeln

1. Kein Sprint wird vorgezogen, nur weil Lovable-Credits verfügbar sind.
2. Kein Prompt wird nur zur Ausschöpfung eines Budgets gestartet.
3. Jeder Prompt beginnt mit Analyse/Precheck und endet mit strukturiertem Abschlussbericht.
4. DB-/RLS-/Grant-/Function-Änderungen erfolgen ausschließlich gemäß Database Change Governance.
5. Ein fehlgeschlagener oder blockierter Lauf wird fachlich ausgewertet; die Folgeschätzung darf danach angepasst werden.
6. Änderungen an der Promptplanung verändern niemals stillschweigend die fachliche Sprintfolge.
7. Abweichungen vom Planwert werden im nächsten Planungs-Snapshot begründet dokumentiert.
8. GitHub bleibt Source of Truth; Merge/Release ausschließlich über PR und Required Checks.

## 9. Erwartete Kontrollpunkte

Die Schätzung wird mindestens neu bewertet:

- nach vollständigem Abschluss von BSF-03,
- nach BSF-03B,
- nach BSF-04,
- nach BSF-05,
- unmittelbar vor BSF-07.

Dabei werden Planwert, tatsächliche Lovable-Läufe, Korrekturschleifen und Gründe für Abweichungen verglichen.

## 10. Kurzfassung für die Kapazitätsplanung

- **Restweg bis BSF-07:** 14 Sprint-/Dokumentationsblöcke in unveränderter Reihenfolge.
- **Basisplan:** 25 Lovable-Prompts.
- **Steuerungsreserve:** 3 Lovable-Prompts.
- **aktueller Planwert:** **ca. 28 Lovable-Prompts**.
- **Planungskorridor:** **25–30 Lovable-Prompts**.
- **Ziel:** funktionierende GF-/Management-Wallboard-Sicht in BSF-07.
- **keine Änderung der bestehenden Sprintreihenfolge.**

## 11. Änderungsregel dieses Snapshots

Dieser Snapshot beschreibt den Planungsstand vom 12.09.2026 und wird nicht rückwirkend auf tatsächliche Verbräuche umgeschrieben. Bei einer relevanten Neuplanung wird ein neuer datierter Snapshot erstellt. Tatsächliche Verbrauchswerte werden separat gegen diesen Stand ausgewertet.
