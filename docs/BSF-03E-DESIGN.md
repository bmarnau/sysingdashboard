# BSF-03E – Vertretungs- und Personensicht für Verantwortlichkeiten

Stand: 2026-09-22  
Issue: #63  
Status: DESIGN BASELINE / noch keine Produktivimplementierung  
Planungsbasis: GitHub `main` `12b37be8ce8e5e8e3668d6622ace13872a7f3c48`  
Vorgänger: BSF-03B / PR #149, als signierter Squash-Commit `12b37be8ce8e5e8e3668d6622ace13872a7f3c48` nach `main` integriert

## 1. Ziel

BSF-03E beantwortet für berechtigte Projekt- und Teamleitungen die Frage:

> Welche offenen Projekt- und Arbeitspaket-Verantwortlichkeiten von Person X benötigen aktuell Vertretung oder Neuverteilung?

Die Funktion kombiniert eine datensparsame Personensicht mit kontrollierten Responsibility-Operationen:

- aktuelle Verantwortungen einer Person anzeigen,
- Stellvertretung ergänzen,
- Stellvertretung beenden,
- primäre Verantwortung atomar übertragen,
- Historie und Audit erhalten.

BSF-03E ist **keine** Krankheits-, Abwesenheits- oder Leistungsbewertung.

## 2. Verbindliche Datenschutzgrenze

Persistiert werden keine Krankheitsgründe, Diagnosen, Gesundheitsdaten oder Vermutungen über Ursache/Dauer einer Nichtverfügbarkeit.

Zulässige neutrale UI-Begriffe sind ausschließlich organisatorisch, z. B.:

- `Vertretungsbedarf`,
- `temporär nicht verfügbar`,
- `Vertretung erforderlich`.

Ein Vertretungsbedarf ist kein Leistungsmerkmal und darf nicht als Personenranking oder Performance-Indikator verwendet werden.

## 3. Bestehende Domänen bleiben getrennt

BSF-03E führt **keine dritte Responsibility-Quelle** ein.

### 3.1 Customer Responsibility

`customer_responsibility` bleibt die fachliche Beziehung Benutzer ↔ Kunde aus BSF-03. Sie erzeugt weder Projektverantwortung noch operativen Datenzugriff.

### 3.2 Project/WorkPackage Responsibility

Projekt- und Arbeitspaket-Verantwortung bleibt im bestehenden AVKK-Modell:

- `avkk_subject`,
- `avkk_responsibility`,
- `avkk_responsibility_type`,
- Rolle `owner`,
- Rolle `deputy`,
- `valid_from` / `valid_to`.

### 3.3 Personensicht

Die Personensicht ist ein **Read Model**, keine neue Source of Truth. Sie aggregiert ausschließlich bereits autorisierte, aktive Project-/WorkPackage-Subjects und deren aktive AVKK-Verantwortungen.

## 4. V1-Scope

Delegierbare Aufgaben sind ausschließlich:

- `project`,
- `workpackage`.

Ausgeschlossen:

- `activity` – bleibt Tätigkeits-/Leistungsnachweis,
- `measure` – bleibt Zukunftsthema,
- Zeitbuchungen,
- Leistungsnachweis-/Billing-Daten,
- globale Rollenänderungen.

Damit bleibt `MVP_AVKK_TASK_SUBJECT_TYPES = ["project", "workpackage"]` maßgeblich.

## 5. Sicherheitsbefund: Scope-Lücke vor BSF-03E

Der aktuelle AVKK-Vertrag ist für BSF-03E noch nicht ausreichend mandantenscharf:

- `avkk_subject` besitzt aktuell keine `systemhouse_id` / `customer_id`,
- die Identität ist heute global `UNIQUE(subject_type, subject_id)`,
- AVKK-Read wird derzeit primär über `avkk.view` autorisiert,
- Responsibility-Mutationen werden primär über `avkk.responsibility.assign` autorisiert,
- die RBAC-Matrix dokumentiert selbst, dass Delegation v1 noch flach und nicht auf Projekt-/Team-Scope begrenzt ist.

Eine reine UI-Filterung wäre deshalb **keine** ausreichende Sicherheitsgrenze für die Abnahmekriterien Cross-Systemhouse, Cross-Customer und IDOR/BOLA.

### Konsequenz

BSF-03E beginnt mit einem eigenen Security-/Scope-Hardening-Schritt **P0**, bevor die Personensicht oder Bulk-Delegation produktiv aktiviert wird.

## 6. Zielidentität für AVKK-Subjects

Die bestehende Shared Projection aus BSF-02C ist die maßgebliche serverseitige Zuordnung von Project/WorkPackage zu:

- `systemhouse_id`,
- `customer_id`,
- `source_id`.

BSF-03E darf diese Identität nicht nochmals separat erfinden.

### Gewählte Richtung

`avkk_subject` wird additiv um einen serverseitig verifizierbaren Scope erweitert:

- `systemhouse_id`,
- `customer_id`.

Für neue BSF-03E-fähige Subjects gilt:

`(systemhouse_id, subject_type, subject_id)` ist die stabile technische Identität.

`customer_id` wird aus der aktiven Shared Projection serverseitig aufgelöst und darf nicht als vertrauenswürdiger Client-Wert übernommen werden.

### Legacy-/Backfill-Regel

Bestehende ungescopte AVKK-Sätze werden nicht still geraten.

Read-only Live-Evidenz vom 22.09.2026 zeigt für den verbundenen Lovable-/Supabase-Stand:

- 4 bestehende AVKK-Subjects vom Typ `project`,
- 5 bestehende AVKK-Subjects vom Typ `workpackage`,
- 0 davon besitzen aktuell genau einen Match über `subject_id = shared_*_projection.source_id`,
- 9 bleiben damit aus Sicht eines automatischen Scope-Backfills `UNRESOLVED`,
- Mehrfachtreffer wurden nicht festgestellt.

Damit ist ein pauschaler automatischer Legacy-Backfill **nicht** zulässig.

Verbindlich gilt:

- eindeutige, serverseitig belegte Zuordnung zur Shared Projection → kontrollierter Backfill zulässig,
- fehlende oder mehrdeutige Zuordnung → `UNRESOLVED` / fail-closed für **BSF-03E**,
- keine automatische Zuordnung über Namen, Titel, Anzeigenamen oder andere weiche Merkmale,
- keine Löschung historischer AVKK-Daten,
- bestehende ungescopte AVKK-Datensätze dürfen nicht durch eine P0-Migration still falsch einem Customer zugeordnet werden.

Für P0 wird die Scope-Erweiterung daher additiv eingeführt. Neue BSF-03E-fähige Subjects müssen vollständig gescopet sein; Legacy-Subjects bleiben bis zu einer explizit belegten Zuordnung außerhalb der BSF-03E-Personensicht.

## 7. Serverseitiger Scope-Vertrag

Clientseitige RBAC-v2-`RoleAssignment`-Objekte aus ADR-0007/0008 sind weiterhin **keine Security Boundary** und dürfen für BSF-03E nicht als Autorisierungsquelle verwendet werden.

Der Server leitet den Scope aus der tatsächlichen Ressource ab.

### Lesen / Personensicht

Mindestens erforderlich:

1. aktiver Benutzer,
2. aktive Membership im tatsächlichen `systemhouse_id`,
3. `avkk.management.view`,
4. mindestens `customer_access = read` für den tatsächlichen Customer,
5. aktive Shared Projection des Project/WorkPackage,
6. gescoptes AVKK-Subject für genau diese Ressource.

### Mutationen

Zusätzlich erforderlich:

1. `avkk.responsibility.assign`,
2. `customer_access = write`,
3. Ressource ist `project` oder `workpackage`,
4. Zielperson ist aktiv und Mitglied desselben Systemhauses,
5. Zielperson ist für die fachliche interne Responsibility zulässig,
6. Scope wird aus DB-Daten aufgelöst, nicht aus Browserrolle, Role Preview oder Namen.

Bis ein persistierter serverseitiger Team-/Portfolio-Scope aus ADR-0007/0008 existiert, erweitert eine Teamlead-Rolle den Customer-Datenscope **nicht**. Das ist bewusst fail-closed.

## 8. Responsibility-Lifecycle

### 8.1 Owner

Pro Subject gilt fachlich höchstens **ein aktiver `owner`**.

`transfer owner A -> B` ist atomar:

1. Scope und Ziel prüfen,
2. aktuelle Owner-Zeile sperren,
3. alte Owner-Zeile mit `valid_to` beenden,
4. neue Owner-Zeile erzeugen,
5. Responsibility Types vollständig übernehmen oder explizit neu setzen,
6. Audit schreiben,
7. bei jedem Fehler vollständiger Rollback.

Kein Hard Delete.

### 8.2 Deputy

Mehrere aktive `deputy` sind zulässig.

`add deputy` erzeugt eine zusätzliche aktive Responsibility. Ein identisches aktives Duplikat bleibt verboten.

`end deputy` setzt `valid_to`; Historie bleibt bestehen.

### 8.3 Responsibility Types

Die bestehenden AVKK-Verantwortungsarten bleiben erhalten. Transfer-/Deputy-Operationen dürfen Typinformationen nicht unbeabsichtigt verlieren.

## 9. Atomare Mutationsgrenze

Die heutige AVKK-Servicefolge `insert responsibility -> insert responsibility types` ist für einen mehrschrittigen Transfer nicht ausreichend atomar.

BSF-03E erhält daher einen schmalen serverseitigen Transaktionsvertrag, bevorzugt als SECURITY-INVOKER-RPC im User-JWT.

Vorgesehene Use-Cases:

- `transfer_owner`,
- `add_deputy`,
- `end_responsibility`,
- optional `bulk_add_deputy` / `bulk_transfer_owner` erst nach Einzelpfad-Abnahme.

Keine Service Role im Browser oder regulären User-Pfad.

## 10. Read Model „Verantwortung von Person X“

Die Liste zeigt ausschließlich autorisierte aktive Project-/WorkPackage-Responsibilities.

Mindestens je Zeile:

- Person,
- Rolle `owner` / `deputy`,
- Project oder WorkPackage,
- Titel,
- Customer,
- Status,
- Termin,
- AVKK-Risikostatus / fachliche Risikohinweise,
- `valid_from`,
- ggf. geplantes `valid_to`.

Nicht enthalten:

- Tätigkeitszeilen,
- Stunden,
- Billable-/Billing-Daten,
- Krankheits-/Abwesenheitsgründe,
- E-Mail, Telefon, MFA oder vollständige Profildaten.

Für Namensauflösung bleibt der datensparsame Directory-Vertrag maßgeblich; technische UUIDs werden nicht als Anzeigenamen dargestellt.

## 11. Audit und Historie

Relevante Änderungen müssen im bestehenden append-only Auditpfad nachvollziehbar sein:

- Owner übertragen,
- Deputy ergänzt,
- Responsibility beendet,
- Bulk-Vorgang gestartet/abgeschlossen, falls später aktiviert.

Audit enthält Actor, Ziel-Subject, technische IDs und Operation, aber keine Gesundheitsdaten.

## 12. RLS-/Grant-Härtung

P0 muss die direkte Data-API-Umgehung schließen.

Abnahmeziel:

- RLS auf `avkk_subject`, `avkk_responsibility`, `avkk_responsibility_type` wertet den realen Subject-Scope aus,
- `TO authenticated` allein ist nie ausreichend,
- Cross-Systemhouse und Cross-Customer sind serverseitig DENY,
- ungescopte/mehrdeutige Subjects sind für BSF-03E fail-closed,
- direkte Mutation darf den transaktionalen Lifecycle nicht umgehen,
- PUBLIC/anon erhalten keine zusätzlichen Rechte,
- neue SECURITY-DEFINER-Helfer nur bei begründeter Fremdlese-Notwendigkeit, mit leerem `search_path`, explizitem `auth.uid()`-/Permission-Check und minimalen EXECUTE-Rechten,
- bestehende SEC-01-WARN-Baseline (`avkk_can_write`, `avkk_people_directory`) darf nicht um neue Advisor-Findings erweitert werden.

## 13. Negative Test Matrix

Mindestens:

- E01 Teamlead/Projektmanager mit zulässigem Customer-Scope sieht Personensicht,
- E02 Engineer/Viewer/Customer kann keine Responsibility verwalten,
- E03 fremdes Systemhouse → DENY,
- E04 fremder Customer → DENY,
- E05 erratene Subject-/Responsibility-ID → DENY,
- E06 Role Preview / manipulierte Clientrolle → kein Rechtegewinn,
- E07 Activity als Delegationsziel → DENY,
- E08 Measure als Delegationsziel → DENY V1,
- E09 ungescoptes Legacy-Subject → BSF-03E DENY,
- E10 Owner A -> B → exakt ein aktiver Owner, A historisch beendet,
- E11 Transfer auf ungültige Zielperson → Rollback, alter Owner bleibt aktiv,
- E12 identischer Deputy doppelt → DENY/idempotent ohne Doppelzeile,
- E13 mehrere unterschiedliche Deputies → PASS,
- E14 Deputy beenden → Historie bleibt,
- E15 Cross-Systemhouse-Zielperson → DENY,
- E16 fehlender Customer Write Access → Mutation DENY,
- E17 fehlender Customer Read Access → Personensicht liefert keine fremden Daten,
- E18 kein Gesundheitsfeld in Schema/API/UI/Export,
- E19 Audit für jede relevante Mutation vorhanden,
- E20 Partial Failure bei Responsibility Types → vollständiger Rollback,
- E21 Bulk-Operation mit einem ungültigen Element → definierte atomare Semantik, kein stilles Teilergebnis,
- E22 direkte Data-API-Umgehung des Lifecycle → DENY.

## 14. Backup / Import / Export

Vor Abschluss prüfen:

- neue Scope-Felder bzw. Scope-Verträge im kanonischen Backup,
- Restore erhält IDs und Historie oder weist unauflösbare Scopes fail-closed ab,
- allgemeiner JSON-Import darf Responsibility nicht ungeprüft setzen,
- keine Namensidentität beim Restore,
- Kundenexport/Leistungsnachweis enthält keine internen Vertretungsdaten, sofern nicht ausdrücklich fachlich vorgesehen.

## 15. Providergrenze

Fachlogik bleibt providerneutral:

`ResponsibilityManagementPort -> ResponsibilityManagementService -> ProviderAdapter`

Supabase ist MVP-Provider. Scope-, Lifecycle- und Auditregeln dürfen nicht so modelliert werden, dass Azure SQL / Entra ID / On-Premises später ein anderes Fachmodell benötigen.

Lovable Cloud ist keine Laufzeitvoraussetzung.

## 16. Implementierungsphasen

### P0 – Scope-Hardening

- gescopte AVKK-Subject-Identität,
- deterministischer Backfill/fail-closed Legacy-Pfad,
- RLS-/Grant-Härtung,
- DB-Negativtests.

### P1 – Providerneutrales Read Model

- Personensicht-Service,
- nur Project/WorkPackage,
- Directory-Datenminimierung,
- Status/Termin/Risiko.

### P2 – Atomare Responsibility-Mutationen

- Owner transfer,
- Deputy add/end,
- Audit,
- Rollback-Tests.

### P3 – UI + E2E

- Personenfilter,
- „Verantwortung von Person X“,
- Einzelaktionen,
- Rollen-/Scope-Negativtests,
- Accessibility.

### P4 – Bulk optional

Bulk nur wenn P0–P3 vollständig grün sind. Keine frühzeitige Bulk-Komplexität.

### P5 – Abschluss

- Full CI,
- Supabase Advisor,
- Schema Drift,
- Technical Report / Quality Gate,
- Help/Dokumentation/Entwicklungstagebuch/Status,
- Closure Report.

## 17. Definition of Done

BSF-03E ist erst DONE, wenn:

1. Personensicht nur real autorisierte Project-/WorkPackage-Responsibilities zeigt.
2. AVKK-Subject-Scope serverseitig eindeutig und mandantensicher ist.
3. Owner-Transfer atomar und historisiert ist.
4. Deputies ergänzt und beendet werden können, ohne Owner zu überschreiben.
5. Engineer/Viewer/Customer keine Rechteausweitung erhalten.
6. Cross-Systemhouse/Cross-Customer/IDOR/BOLA reproduzierbar DENY sind.
7. Keine Gesundheitsdaten gespeichert oder abgeleitet werden.
8. Audit/History vollständig ist.
9. Direkte Data-API-Umgehung des Management-Lifecycles ausgeschlossen ist.
10. Unit/Integration/RBAC/RLS/DB/E2E/A11y PASS sind.
11. Security Advisor keine neuen BSF-03E-Findings meldet.
12. Schema Drift PASS ist.
13. Backup/Restore/Import-/Export-Auswirkungen geprüft sind.
14. Technischer Prüfbericht und Projektstatus aktualisiert sind.
15. Exact-Head-Evidenz für den finalen Kandidaten vorliegt.

## 18. Gate zur Umsetzung

Produktcode für BSF-03E startet ausschließlich auf der integrierten BSF-03B-Basis.

P0-Basis:

- BSF-03B / PR #149 ist in `main` integriert: `12b37be8ce8e5e8e3668d6622ace13872a7f3c48`,
- der Integrationscommit ist GitHub-signiert und verifiziert,
- die verbundene Lovable-Arbeitsfläche meldet denselben Git-Commit als `latest_commit_sha`,
- P0-Produktcode startet erst nach erfolgreicher Post-Merge-CI/Security dieses `main`-Kandidaten,
- jede weitere Implementierung wird gegen den dann aktuellen GitHub-`main` geprüft,
- kein Merge/Deploy allein durch dieses Design-Dokument.
